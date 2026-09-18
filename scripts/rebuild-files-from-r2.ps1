<#
.SYNOPSIS
  从 R2 对象清单重建 files 表的 INSERT 语句（数据库随项目被删后的兜底恢复）。

.DESCRIPTION
  R2 里的对象还在（公共域存活），但 files 表的名字/分类丢了。
  本脚本：
    1) 读 wrangler 导出的对象清单 JSON；
    2) 用本地文件夹里的同名/同字节数文件反查原始文件名（按 size 精确匹配）；
    3) 按扩展名推断 type(MIME) 与 category；
    4) 生成可直接贴进 Supabase SQL Editor 的 INSERT 语句。
  匹配不上的对象用「未命名-<key前8位>.<ext>」占位，事后可手工改名。

.EXAMPLE
  cd C:\Users\29626\Desktop\MyWeb\workers\r2-proxy
  npx wrangler r2 object list myweb-files --json > ..\..\r2-objects.json

  cd C:\Users\29626\Desktop\MyWeb
  powershell -ExecutionPolicy Bypass -File scripts/rebuild-files-from-r2.ps1 `
    -ObjectsJson r2-objects.json -LocalFolder 上传文件 -OutFile rebuild-files.sql
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ObjectsJson,
  [string]$LocalFolder,
  [string]$PublicBaseUrl,
  [string]$OutFile = 'rebuild-files.sql'
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot

function Get-FromEnv([string]$Key) {
  foreach ($f in @('.env', '.env.production')) {
    $p = Join-Path $repo $f
    if (-not (Test-Path $p)) { continue }
    $m = [regex]::Match((Get-Content -LiteralPath $p -Raw), "(?m)^\s*$Key\s*=\s*(.+?)\s*$")
    if ($m.Success) { return $m.Groups[1].Value.Trim() }
  }
  return $null
}

# ── 扩展名 -> MIME / 分类（与 src/utils/file.ts 的规则保持一致）──
$mimeMap = @{
  '.pdf' = 'application/pdf'; '.md' = 'text/markdown'; '.txt' = 'text/plain'; '.csv' = 'text/csv'
  '.doc' = 'application/msword'; '.docx' = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  '.xls' = 'application/vnd.ms-excel'; '.xlsx' = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  '.ppt' = 'application/vnd.ms-powerpoint'; '.pptx' = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  '.zip' = 'application/zip'; '.rar' = 'application/vnd.rar'; '.7z' = 'application/x-7z-compressed'
  '.tar' = 'application/x-tar'; '.gz' = 'application/gzip'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.gif' = 'image/gif'
  '.webp' = 'image/webp'; '.svg' = 'image/svg+xml'; '.bmp' = 'image/bmp'; '.avif' = 'image/avif'
  '.mp4' = 'video/mp4'; '.webm' = 'video/webm'; '.mov' = 'video/quicktime'
  '.mp3' = 'audio/mpeg'; '.wav' = 'audio/wav'; '.flac' = 'audio/flac'
  '.fig' = 'application/octet-stream'; '.psd' = 'image/vnd.adobe.photoshop'; '.ai' = 'application/postscript'
  '.json' = 'application/json'; '.html' = 'text/html'; '.css' = 'text/css'; '.js' = 'text/javascript'
}
$archiveExt = @('.zip', '.rar', '.7z', '.tar', '.gz', '.tgz')
$imageExt = @('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.avif', '.ico')
$docExt = @('.pdf', '.md', '.txt', '.csv', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.json', '.html', '.css', '.js')

function Get-Category([string]$ext) {
  if ($imageExt -contains $ext) { return 'image' }
  if ($archiveExt -contains $ext) { return 'archive' }
  if ($docExt -contains $ext) { return 'document' }
  return 'other'
}

# ── 1. 读对象清单（容忍 wrangler 在 JSON 前打印的日志行）──
if (-not (Test-Path $ObjectsJson)) { throw "找不到对象清单：$ObjectsJson" }
$text = Get-Content -LiteralPath $ObjectsJson -Raw
$start = $text.IndexOfAny([char[]]@('[', '{'))
if ($start -lt 0) { throw '对象清单里找不到 JSON 起始符，确认导出命令是否正确' }
$parsed = $text.Substring($start) | ConvertFrom-Json

$objects = @()
if ($parsed -is [System.Array]) { $objects = $parsed }
elseif ($parsed.PSObject.Properties.Name -contains 'objects') { $objects = @($parsed.objects) }
else { $objects = @($parsed) }

$rows = @()
foreach ($o in $objects) {
  $key = $null
  foreach ($cand in @('key', 'name')) { if ($o.PSObject.Properties.Name -contains $cand) { $key = [string]$o.$cand; break } }
  if (-not $key) { continue }
  $size = 0
  foreach ($cand in @('size', 'bytes')) { if (($o.PSObject.Properties.Name -contains $cand) -and $o.$cand) { $size = [int64]$o.$cand; break } }
  $up = $null
  foreach ($cand in @('uploaded', 'lastModified', 'modified')) { if (($o.PSObject.Properties.Name -contains $cand) -and $o.$cand) { $up = [string]$o.$cand; break } }
  $rows += [pscustomobject]@{ Key = $key; Size = $size; Uploaded = $up }
}
if ($rows.Count -eq 0) { throw '清单里没有解析出任何对象，检查导出内容' }

# ── 2. 建本地文件索引（按字节数 -> 文件名）──
$sizeIndex = @{}
$localUsed = @{}
$localCount = 0
if (-not $LocalFolder) {
  $guess = Join-Path $repo '上传文件'
  if (Test-Path $guess) { $LocalFolder = $guess }
}
if ($LocalFolder -and (Test-Path $LocalFolder)) {
  Get-ChildItem -LiteralPath $LocalFolder -Recurse -File | ForEach-Object {
    $localCount++
    $len = $_.Length
    if (-not $sizeIndex.ContainsKey($len)) { $sizeIndex[$len] = New-Object System.Collections.Generic.List[string] }
    $sizeIndex[$len].Add($_.Name)
  }
  Write-Host "本地文件索引：$localCount 个文件（$LocalFolder）" -ForegroundColor Cyan
} else {
  Write-Warning "未提供可用的 -LocalFolder，全部对象只能用占位名"
}

# ── 3. 推断公共 URL 前缀 ──
if (-not $PublicBaseUrl) { $PublicBaseUrl = Get-FromEnv 'VITE_R2_PUBLIC_URL' }
if (-not $PublicBaseUrl) { throw '无法确定 R2 公共域：请用 -PublicBaseUrl 传入，或确保 .env 里有 VITE_R2_PUBLIC_URL' }
$PublicBaseUrl = $PublicBaseUrl.TrimEnd('/')

# ── 4. 生成 INSERT ──
$sql = New-Object System.Collections.Generic.List[string]
$sql.Add('-- 由 scripts/rebuild-files-from-r2.ps1 生成')
$sql.Add("-- 生成时间：$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$sql.Add("-- 对象数：$($rows.Count)；本地匹配源：$(if ($LocalFolder) { $LocalFolder } else { '（无）' })")
$sql.Add('-- 执行前请确认 files 表已存在（supabase/migrations/001~005 已应用）')
$sql.Add('')
$sql.Add('BEGIN;')
$sql.Add('')

$matched = 0; $unmatched = 0
foreach ($row in $rows) {
  $ext = [System.IO.Path]::GetExtension($row.Key).ToLowerInvariant()
  $mime = if ($mimeMap.ContainsKey($ext)) { $mimeMap[$ext] } else { 'application/octet-stream' }
  $category = Get-Category $ext

  $name = $null
  if ($row.Size -gt 0 -and $sizeIndex.ContainsKey($row.Size)) {
    $pool = $sizeIndex[$row.Size]
    foreach ($cand in $pool) {
      if (-not $localUsed.ContainsKey($cand)) { $name = $cand; $localUsed[$cand] = $true; break }
    }
  }
  if ($name) { $matched++ } else {
    $unmatched++
    $short = if ($row.Key.Length -ge 8) { $row.Key.Substring(0, 8) } else { $row.Key }
    $name = "未命名-$short$ext"
  }

  $escName = $name.Replace("'", "''")
  $escKey = $row.Key.Replace("'", "''")
  $url = "$PublicBaseUrl/$($row.Key)".Replace("'", "''")
  $ts = if ($row.Uploaded) { "'" + $row.Uploaded + "'" } else { 'now()' }

  $sql.Add("INSERT INTO files (name, size, type, category, storage_path, uploaded_at, file_url) VALUES ('$escName', $($row.Size), '$mime', '$category', '$escKey', $ts, '$url');")
}

$sql.Add('')
$sql.Add('COMMIT;')
$sql.Add('')
$sql.Add('-- 校验：')
$sql.Add('-- SELECT count(*) AS total, count(*) FILTER (WHERE name LIKE ''未命名-%'') AS unnamed FROM files;')

$outPath = if ([System.IO.Path]::IsPathRooted($OutFile)) { $OutFile } else { Join-Path $repo $OutFile }
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($outPath, $sql.ToArray(), $enc)

Write-Host "`n生成完成：$outPath" -ForegroundColor Green
Write-Host ("  对象总数      : {0}" -f $rows.Count)
Write-Host ("  按字节数匹配到 : {0}" -f $matched) -ForegroundColor Green
Write-Host ("  需事后改名    : {0}" -f $unmatched) -ForegroundColor Yellow
Write-Host "`n用法：" -ForegroundColor Cyan
Write-Host "  1) 打开新项目的 SQL Editor，粘贴 $([System.IO.Path]::GetFileName($outPath)) 全文执行"
Write-Host "  2) 若占位名较多，先把本地文件按原名重新上传，或手工 UPDATE files SET name=... WHERE storage_path=..."
