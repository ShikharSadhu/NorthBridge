$ErrorActionPreference = 'SilentlyContinue'

Write-Host 'Stopping NorthBridge full-stack dev processes...'

function Stop-ProcessOnPort([int]$Port) {
	$connections = Get-NetTCPConnection -LocalPort $Port -State Listen
	foreach ($connection in $connections) {
		if ($connection.OwningProcess -gt 0) {
			Stop-Process -Id $connection.OwningProcess -Force
		}
	}
}

# Backend default port
Stop-ProcessOnPort 3000

# Flutter web/devtools common ports
Stop-ProcessOnPort 8080
Stop-ProcessOnPort 9100

# Fallback cleanup for flutter toolchain processes started by run-fullstack.
Get-Process dart | Stop-Process -Force
Get-Process flutter | Stop-Process -Force

Write-Host 'Stop command issued. If a spawned terminal remains open, close it manually.'
