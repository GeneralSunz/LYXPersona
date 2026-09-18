<#
.SYNOPSIS
  体检 Supabase + R2 链路（只读为主，-ProbeUpload 时才写入一个探针对象并删除）。

.DESCRIPTION
  读取 .env 里的配置，依次探测 Auth / REST(files,files) / Storage / R2 公共域，
  输出真实 HTTP 状态码，便于区分「项目没了 / key 失效 / 表缺失 / RLS 拦截 / 网关故障」。
  不会打印任何密钥。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/verify-backend.ps1

.EXAMPLE
  # 额外验证上传签名全链路（会写入并删除一个 60 字节的探针对象）
  powershell -ExecutionPolicy Bypass -File scripts/verify-backend.ps1 -ProbeUpload
#>
[CmdletBinding()]
param(
  [switch]$ProbeUpload
)

$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$repo = Split-Path -Parent $PSScriptRoot
$fail = 0

function Get-FromEnv([string]$Key) {
  foreach ($f in @('.env', '.env.production')) {
    $p = Join-Path $repo $f
    if (-not (Test-Path $p)) { continue }
    $m = [regex]::Match((Get-Content -LiteralPath $p -Raw), "(?m)^\s*$Key\s*=\s*(.+?)\s*$")
    if ($m.Success) { return $m.Groups[1].Value.Trim() }
  }
  return $null
}

function Mask([string]$v) {
  if ([string]::IsNullOrEmpty($v)) { return '(未配置)' }
  if ($v.Length -le 14) { return ('*' * $v.Length) }
  return $v.Substring(0, 14) + '...'
}

function Invoke-Probe([string]$Name, [string]$Url, [hashtable]$Headers, [string]$Method = 'GET', [string]$Body = $null, [int[]]$AllowStatus = @()) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $params = @{ Uri = $Url; Method = $Method; Headers = $Headers; UseBasicParsing = $true; TimeoutSec = 20 }
    if ($Body) { $params['Body'] = $Body; $params['ContentType'] = 'application/json' }
    $resp = Invoke-WebRequest @params
    $sw.Stop()
    $excerpt = ''
    if ($resp.Content) { $excerpt = ($resp.Content -replace '\s+', ' '); if ($excerpt.Length -gt 110) { $excerpt = $excerpt.Substring(0, 110) + '...' } }
    Write-Host ("  [OK  ] {0,-42} {1}  {2}ms  {3}" -f $Name, $resp.StatusCode, $sw.ElapsedMilliseconds, $excerpt) -ForegroundColor Green
    return $resp
  } catch {
    $sw.Stop()
    $status = 'NETERR'
    $body = ''
    $r = $_.Exception.Response
    if ($r) {
      try { $status = [int]$r.StatusCode } catch { $status = 'HTTPERR' }
      try {
        $stream = $r.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        $reader.Close()
      } catch { }
    }
    $script:lastFailBody = $body
    if ($AllowStatus -contains [int]$status) {
      Write-Host ("  [OK  ] {0,-42} {1}  （预期内的状态码，不算失败）" -f $Name, $status) -ForegroundColor Green
      return $null
    }
    $msg = $_.Exception.Message
    if ($msg.Length -gt 70) { $msg = $msg.Substring(0, 70) + '...' }
    Write-Host ("  [FAIL] {0,-42} {1}  {2}  {3}" -f $Name, $status, $body, $msg) -ForegroundColor Red
    $script:fail++
    return $null
  }
}

Write-Host "=== 配置 ===" -ForegroundColor Cyan
$supabaseUrl = Get-FromEnv 'VITE_SUPABASE_URL'
$anonKey = Get-FromEnv 'VITE_SUPABASE_ANON_KEY'
$r2Worker = Get-FromEnv 'VITE_R2_WORKER_URL'
$r2Public = Get-FromEnv 'VITE_R2_PUBLIC_URL'
Write-Host "  VITE_SUPABASE_URL      : $supabaseUrl"
Write-Host "  VITE_SUPABASE_ANON_KEY : $(Mask $anonKey)"
Write-Host "  VITE_R2_WORKER_URL     : $r2Worker"
Write-Host "  VITE_R2_PUBLIC_URL     : $r2Public"

if (-not $supabaseUrl -or -not $anonKey) { Write-Host "`n缺少 Supabase 配置，先跑 scripts/set-supabase-project.ps1" -ForegroundColor Red; exit 2 }

$host_ = ([uri]$supabaseUrl).Host
Write-Host "`n=== DNS ===" -ForegroundColor Cyan
try {
  $ips = [System.Net.Dns]::GetHostAddresses($host_) | ForEach-Object { $_.IPAddressToString }
  Write-Host "  [OK  ] $host_ -> $($ips -join ', ')" -ForegroundColor Green
} catch {
  Write-Host "  [FAIL] $host_ 解析失败：$($_.Exception.Message)" -ForegroundColor Red
  Write-Host "  → 域名不解析有两种可能：① 项目处于 Paused（暂停项目同样会停止解析）；② 项目已删除 / ref 写错" -ForegroundColor Yellow
  Write-Host "     先去 Dashboard 看项目状态徽标；若是 Paused，点 Resume project 再复测。" -ForegroundColor Yellow
  exit 3
}

$H = @{ apikey = $anonKey; Authorization = "Bearer $anonKey" }

Write-Host "`n=== Supabase 只读探测 ===" -ForegroundColor Cyan
Invoke-Probe 'auth /health' "$supabaseUrl/auth/v1/health" $H | Out-Null
Invoke-Probe 'rest files?limit=1' "$supabaseUrl/rest/v1/files?select=id,name,size,storage_path,file_url&limit=1" $H | Out-Null
$filesBody = $script:lastFailBody
Invoke-Probe 'rest folders?limit=1' "$supabaseUrl/rest/v1/folders?select=id,name,parent_id&limit=1" $H | Out-Null
Invoke-Probe 'storage buckets' "$supabaseUrl/storage/v1/bucket" $H | Out-Null

# PGRST205 = 表不在 PostgREST 的 schema cache 里，两种成因完全不同，必须分开提示
if ($filesBody -match 'PGRST205') {
  Write-Host ""
  Write-Host "  ⚠ PGRST205：PostgREST 看不到 public.files，两种可能：" -ForegroundColor Yellow
  Write-Host "     A. 表真的不存在（数据丢了）→ 按 SUPABASE-恢复路径.md 的兜底路径重建" -ForegroundColor Yellow
  Write-Host "     B. 表存在但 API 角色没有 GRANT → 执行 supabase/migrations/006_grants.sql，然后：" -ForegroundColor Yellow
  Write-Host "        notify pgrst, 'reload schema';   -- 或在 Dashboard 点 Settings → API → Reload schema" -ForegroundColor Yellow
  Write-Host "     用这条 SQL 区分 A/B：select count(*) from public.files;" -ForegroundColor Yellow
  Write-Host "       · 报 relation does not exist → A    · 返回行数 → B" -ForegroundColor Yellow
}

Write-Host "`n=== R2 公共域（对象读取能力）===" -ForegroundColor Cyan
if ($r2Public) {
  # R2 不提供目录列表，根路径 404 属正常，不计为失败
  Invoke-Probe 'R2 公共域根' "$($r2Public.TrimEnd('/'))/" @{} -AllowStatus @(404) | Out-Null
} else { Write-Host '  (未配置 VITE_R2_PUBLIC_URL)' -ForegroundColor DarkYellow }

if ($ProbeUpload) {
  Write-Host "`n=== 上传签名全链路（会写入并删除探针对象）===" -ForegroundColor Cyan
  if (-not $r2Worker) { Write-Host '  未配置 VITE_R2_WORKER_URL，跳过' -ForegroundColor DarkYellow }
  else {
    $probeName = "probe-$([guid]::NewGuid().ToString('N').Substring(0,8)).txt"
    $sign = Invoke-Probe 'POST /upload-url' "$($r2Worker.TrimEnd('/'))/upload-url" (@{ Authorization = "Bearer $anonKey" }) 'POST' ("{""filename"":""$probeName"",""contentType"":""text/plain""}")
    if ($sign) {
      try {
        $json = $sign.Content | ConvertFrom-Json
        Write-Host "  签名返回：key=$($json.key)" -ForegroundColor DarkGray
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('filevault probe')
        $put = Invoke-WebRequest -Uri $json.uploadUrl -Method PUT -Body $bytes -ContentType 'text/plain' -UseBasicParsing -TimeoutSec 30
        Write-Host ("  [OK  ] R2 直传(PUT)                              {0}" -f $put.StatusCode) -ForegroundColor Green
        $get = Invoke-WebRequest -Uri $json.publicUrl -UseBasicParsing -TimeoutSec 20
        Write-Host ("  [OK  ] 公共域回读(GET)                          {0}  {1}" -f $get.StatusCode, $get.Content) -ForegroundColor Green
        $del = Invoke-WebRequest -Uri "$($r2Worker.TrimEnd('/'))/file?key=$([uri]::EscapeDataString($json.key))" -Method DELETE -Headers @{ Authorization = "Bearer $anonKey" } -UseBasicParsing -TimeoutSec 20
        Write-Host ("  [OK  ] 删除探针(DELETE)                         {0}" -f $del.StatusCode) -ForegroundColor Green
      } catch {
        Write-Host "  [FAIL] 签名链路某一步失败：$($_.Exception.Message)" -ForegroundColor Red
        $fail++
      }
    }
  }
}

Write-Host ""
if ($fail -gt 0) { Write-Host "结论：$fail 项失败，见上方 [FAIL]" -ForegroundColor Red; exit 1 }
Write-Host "结论：全部通过 ✔" -ForegroundColor Green
exit 0
