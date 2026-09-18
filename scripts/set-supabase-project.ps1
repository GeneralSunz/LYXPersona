<#
.SYNOPSIS
  把 .env / .env.production / supabase/.temp/project-ref 一次性切到新的 Supabase 项目。

.DESCRIPTION
  新建项目后只有 ref 和 key 变了，其余配置（R2 公共域等）保持不变。
  本脚本会：备份 → 原位替换 → 追加缺失键 → 校验是否残留旧 ref。
  不会打印完整密钥（只显示前 14 位与长度）。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/set-supabase-project.ps1 `
    -ProjectUrl https://abcdefghijklmnopqrst.supabase.co `
    -PublishableKey sb_publishable_xxxxxxxx

.EXAMPLE
  # 同时把上传签名通道切到 Cloudflare Worker，并先干跑看看
  powershell -ExecutionPolicy Bypass -File scripts/set-supabase-project.ps1 `
    -ProjectUrl https://abcdefghijklmnopqrst.supabase.co `
    -PublishableKey sb_publishable_xxxxxxxx `
    -R2WorkerUrl https://r2-upload-proxy.xxx.workers.dev -WhatIf
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ProjectUrl,
  [Parameter(Mandatory = $true)][string]$PublishableKey,
  [string]$R2WorkerUrl,
  [string]$R2PublicUrl,
  [string]$ProjectName,
  [string]$PoolerRegion = 'ap-northeast-1',
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$OldRef = 'xigtfbquvymzoynrqxwd'

function Mask([string]$v) {
  if ([string]::IsNullOrEmpty($v)) { return '(空)' }
  if ($v.Length -le 14) { return ('*' * $v.Length) }
  return $v.Substring(0, 14) + '... (len=' + $v.Length + ')'
}

function Write-BomlessUtf8([string]$Path, [string[]]$Lines) {
  # PS 5.1 的 Set-Content -Encoding UTF8 会写 BOM，dotenv 虽能容错，但没必要留坑
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($Path, $Lines, $enc)
}

# ── 1. 校验 ProjectUrl 形状并取出 ref ──
$ProjectUrl = $ProjectUrl.Trim().TrimEnd('/')
if ($ProjectUrl -notmatch '^https://([a-z0-9]{20})\.supabase\.co$') {
  throw "ProjectUrl 形状不对：应为 https://<20位ref>.supabase.co，实际拿到 '$ProjectUrl'"
}
$ref = $Matches[1]
Write-Host "新项目 ref : $ref" -ForegroundColor Cyan
Write-Host "旧的 ref   : $OldRef" -ForegroundColor DarkGray

# ── 2. 需要写入的键值 ──
$updates = New-Object System.Collections.Specialized.OrderedDictionary
$updates['VITE_SUPABASE_URL'] = $ProjectUrl
$updates['VITE_SUPABASE_ANON_KEY'] = $PublishableKey.Trim()
if ($R2WorkerUrl) { $updates['VITE_R2_WORKER_URL'] = $R2WorkerUrl.Trim().TrimEnd('/') }
if ($R2PublicUrl) { $updates['VITE_R2_PUBLIC_URL'] = $R2PublicUrl.Trim().TrimEnd('/') }

# ── 3. 改写 env 文件 ──
foreach ($file in @('.env', '.env.production')) {
  $path = Join-Path $repo $file
  if (-not (Test-Path $path)) { Write-Warning "$file 不存在，跳过"; continue }

  Write-Host "`n[$file]" -ForegroundColor Yellow
  $lines = @(Get-Content -LiteralPath $path)
  $seen = @{}
  $out = New-Object System.Collections.Generic.List[string]

  foreach ($line in $lines) {
    $m = [regex]::Match($line, '^\s*([A-Za-z0-9_]+)\s*=(.*)$')
    if ($m.Success -and $updates.Contains($m.Groups[1].Value)) {
      $key = $m.Groups[1].Value
      $old = $m.Groups[2].Value.Trim()
      $new = [string]$updates[$key]
      $seen[$key] = $true
      if ($old -ne $new) {
        Write-Host ("  {0,-24} {1}  ->  {2}" -f $key, (Mask $old), (Mask $new))
      } else {
        Write-Host ("  {0,-24} 未变化" -f $key) -ForegroundColor DarkGray
      }
      $out.Add("$key=$new")
    } else {
      $out.Add($line)
    }
  }

  foreach ($key in $updates.Keys) {
    if (-not $seen.ContainsKey($key)) {
      $out.Add("$key=$([string]$updates[$key])")
      Write-Host "  + 追加 $key" -ForegroundColor Green
    }
  }

  if ($WhatIf) {
    Write-Host "  [WhatIf] 未写入" -ForegroundColor DarkGray
  } else {
    Copy-Item -LiteralPath $path -Destination "$path.bak-$stamp" -Force
    Write-BomlessUtf8 -Path $path -Lines $out.ToArray()
    Write-Host "  已写入（备份：$file.bak-$stamp）" -ForegroundColor Green
  }
}

# ── 4. 同步 supabase/.temp/* ──
$tempDir = Join-Path $repo 'supabase\.temp'

$refFile = Join-Path $tempDir 'project-ref'
if (Test-Path $refFile) {
  Write-Host "`n[supabase/.temp/project-ref]" -ForegroundColor Yellow
  $oldRefFile = (Get-Content -LiteralPath $refFile -Raw).Trim()
  if ($WhatIf) { Write-Host "  [WhatIf] $oldRefFile -> $ref" -ForegroundColor DarkGray }
  else {
    Write-BomlessUtf8 -Path $refFile -Lines @($ref)
    Write-Host "  $oldRefFile -> $ref" -ForegroundColor Green
  }
}

# linked-project.json：ref + （可选）项目名
$linkedFile = Join-Path $tempDir 'linked-project.json'
if (Test-Path $linkedFile) {
  Write-Host "`n[supabase/.temp/linked-project.json]" -ForegroundColor Yellow
  $linked = (Get-Content -LiteralPath $linkedFile -Raw) | ConvertFrom-Json
  $oldLinkedRef = [string]$linked.ref
  $linked.ref = $ref
  if ($ProjectName) { $linked.name = $ProjectName }
  $newJson = $linked | ConvertTo-Json -Depth 5
  if ($WhatIf) { Write-Host "  [WhatIf] ref $oldLinkedRef -> $ref$(if ($ProjectName) { "；name -> $ProjectName" })" -ForegroundColor DarkGray }
  else {
    Copy-Item -LiteralPath $linkedFile -Destination "$linkedFile.bak-$stamp" -Force
    Write-BomlessUtf8 -Path $linkedFile -Lines ($newJson -split "`r?`n")
    Write-Host "  ref $oldLinkedRef -> $ref$(if ($ProjectName) { "；name -> $ProjectName" })" -ForegroundColor Green
  }
}

# pooler-url：只换 ref 与区域，连接串仅供 CLI/psql 参考
$poolerFile = Join-Path $tempDir 'pooler-url'
if (Test-Path $poolerFile) {
  Write-Host "`n[supabase/.temp/pooler-url]" -ForegroundColor Yellow
  $pooler = (Get-Content -LiteralPath $poolerFile -Raw).Trim()
  $newPooler = $pooler -replace 'postgres\.[a-z0-9]{20}', "postgres.$ref"
  $newPooler = $newPooler -replace 'aws-\d+-[a-z0-9-]+\.pooler', "aws-0-$PoolerRegion.pooler"
  if ($WhatIf) { Write-Host "  [WhatIf] $newPooler" -ForegroundColor DarkGray }
  else {
    Copy-Item -LiteralPath $poolerFile -Destination "$poolerFile.bak-$stamp" -Force
    Write-BomlessUtf8 -Path $poolerFile -Lines @($newPooler)
    Write-Host "  $newPooler" -ForegroundColor Green
  }
  Write-Host "  提示：区域若与新项目 Connect 页不一致，请以 Dashboard 为准（或用 -PoolerRegion 指定）" -ForegroundColor DarkYellow
}

# ── 5. 残留检查 ──
Write-Host "`n[残留检查]" -ForegroundColor Yellow
$tracked = @(& git -C $repo grep -l $OldRef 2>$null)
$codeHits = @($tracked | Where-Object { $_ -notmatch '\.md$' })
$docHits = @($tracked | Where-Object { $_ -match '\.md$' })
if ($codeHits.Count -gt 0) {
  Write-Host "  以下受控文件仍含旧 ref，需要处理：" -ForegroundColor Red
  $codeHits | ForEach-Object { Write-Host "    $_" }
} else {
  Write-Host "  受控的代码/配置文件已无旧 ref ✔" -ForegroundColor Green
}
if ($docHits.Count -gt 0) {
  Write-Host "  文档中的历史记录（保留即可）：" -ForegroundColor DarkGray
  $docHits | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
}

$dist = Join-Path $repo 'dist'
if (Test-Path $dist) {
  $hit = Select-String -Path (Join-Path $dist 'assets\*.js') -Pattern $OldRef -ErrorAction SilentlyContinue
  if ($hit) { Write-Host "  注意：dist/ 里仍有旧 ref（dist 已被 gitignore，由 CI 重建，本地可不管）" -ForegroundColor DarkYellow }
}

Write-Host "`n下一步：" -ForegroundColor Cyan
Write-Host "  1) powershell -ExecutionPolicy Bypass -File scripts/verify-backend.ps1"
Write-Host "  2) git add -A; git commit -m 'chore: repoint supabase project'; git push   # 触发 CI 重新发布"
