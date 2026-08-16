# Local bootstrap: switch Node only when .nvmrc does not match.
# Prefer Docker Desktop over leftover Docker Toolbox env/PATH.

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

$wanted = (Get-Content -Raw .nvmrc).Trim()
$current = ""
try {
  $current = (& node -v 2>$null)
  if ($current) { $current = $current.Trim().TrimStart("v") }
} catch { }

if ($current -eq $wanted) {
  Write-Host "Node v$wanted already active — skip nvm use"
} else {
  Write-Host "Node is '$current', switching to $wanted"
  nvm use $wanted
  $nvmNode = "C:\nvm4w\nodejs"
  if (Test-Path $nvmNode) {
    $env:Path = "$nvmNode;" + $env:Path
  }
}

Remove-Item Env:DOCKER_HOST, Env:DOCKER_CERT_PATH, Env:DOCKER_TLS_VERIFY, Env:DOCKER_MACHINE_NAME -ErrorAction SilentlyContinue

$dockerBins = @(
  "E:\Program Files\Docker\resources\bin",
  "C:\Program Files\Docker\Docker\resources\bin"
)
foreach ($bin in $dockerBins) {
  if (Test-Path (Join-Path $bin "docker.exe")) {
    $env:Path = "$bin;" + $env:Path
    break
  }
}

Write-Host "Starting Postgres (docker compose)…"
docker compose up -d

npm run db:generate
npm run db:deploy

Write-Host ""
Write-Host "DB ready. In two terminals (no nvm use if version already matches):"
Write-Host "  npm run dev:api"
Write-Host "  npm run dev:web"
Write-Host "Web http://localhost:3000  API http://localhost:3001/health"
