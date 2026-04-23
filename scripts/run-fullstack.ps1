param(
  [ValidateSet('chrome', 'android', 'windows')]
  [string]$FrontendTarget = 'chrome',
  [string]$BackendPort = '3000'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $repoRoot 'backend-nodejs'
$frontendPath = Join-Path $repoRoot 'frontend'
$apiBaseUrl = "http://localhost:$BackendPort"

function Test-DeveloperModeEnabled {
  try {
    $value = Get-ItemPropertyValue -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock' -Name 'AllowDevelopmentWithoutDevLicense'
    return [int]$value -eq 1
  } catch {
    return $false
  }
}

function Wait-BackendReady {
  param([string]$HealthUrl)

  for ($i = 0; $i -lt 30; $i++) {
    try {
      $response = Invoke-RestMethod -Uri $HealthUrl -Method GET -TimeoutSec 1
      if ($response.status -eq 'ok') {
        return $true
      }
    } catch {
      # keep retrying while backend boots
    }
    Start-Sleep -Seconds 1
  }

  return $false
}

Write-Host "Starting NorthBridge backend and frontend..."
Write-Host "Backend: $backendPath"
Write-Host "Frontend: $frontendPath"
Write-Host "API Base URL: $apiBaseUrl"
Write-Host "Frontend target: $FrontendTarget"

$backendCmd = "Set-Location '$backendPath'; npm run dev"
$frontendCmd = "Set-Location '$frontendPath'; flutter run -d $FrontendTarget --dart-define=NB_API_BASE_URL=$apiBaseUrl"

Start-Process powershell -ArgumentList '-NoExit', '-Command', $backendCmd | Out-Null

$backendReady = Wait-BackendReady -HealthUrl "$apiBaseUrl/v1/health"
if (-not $backendReady) {
  Write-Warning "Backend health endpoint did not become ready in time at $apiBaseUrl/v1/health"
}

if (-not (Test-DeveloperModeEnabled)) {
  Write-Warning 'Windows Developer Mode is disabled. Flutter plugin builds can fail.'
  Write-Host 'Enable it with: start ms-settings:developers'
}

Start-Process powershell -ArgumentList '-NoExit', '-Command', $frontendCmd | Out-Null

Write-Host 'Both processes were started in separate terminals.'
Write-Host 'Use scripts/stop-fullstack.ps1 to stop common backend/frontend processes.'
