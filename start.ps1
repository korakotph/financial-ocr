# start.ps1 - Start financial-ocr system
# Usage: .\start.ps1

$BACKEND_URL  = "http://localhost:8000"
$OLLAMA_URL   = "http://localhost:11434"
$OLLAMA_MODEL = "scb10x/llama3.1-typhoon2-8b-instruct"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "    [FAIL] $msg" -ForegroundColor Red; exit 1 }

# 1. Start Docker Compose
Write-Step "Starting all containers..."
docker-compose down --remove-orphans 2>&1 | Out-Null
# Force remove containers that may conflict
@("finance_backend", "finance_frontend", "finance_postgres", "finance_minio") | ForEach-Object {
    docker rm -f $_ 2>&1 | Out-Null
}
docker-compose up -d --build 2>&1
if ($LASTEXITCODE -ne 0) { Write-Fail "docker-compose up failed" }
Write-OK "Containers started"

# 2. Wait for Backend
Write-Step "Waiting for backend ($BACKEND_URL)..."
$maxWait = 120
$elapsed = 0
$ready = $false
while ($elapsed -lt $maxWait) {
    try {
        $r = Invoke-WebRequest -Uri "$BACKEND_URL/docs" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 3
    $elapsed += 3
    Write-Host "    waiting... ($elapsed s)" -NoNewline
    Write-Host "`r" -NoNewline
}
if (-not $ready) { Write-Fail "Backend did not start within $maxWait seconds" }
Write-OK "Backend is ready"

# 3. Wait for Ollama
Write-Step "Waiting for Ollama ($OLLAMA_URL)..."
$elapsed = 0
$ready = $false
while ($elapsed -lt $maxWait) {
    try {
        $r = Invoke-WebRequest -Uri "$OLLAMA_URL" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 3
    $elapsed += 3
    Write-Host "    waiting... ($elapsed s)" -NoNewline
    Write-Host "`r" -NoNewline
}
if (-not $ready) { Write-Fail "Ollama did not start within $maxWait seconds" }
Write-OK "Ollama is ready"

# 4. Pull model if not present
Write-Step "Checking Ollama model: $OLLAMA_MODEL..."
$ollamaContainer = docker ps --filter "ancestor=ollama/ollama" --format "{{.Names}}" | Select-Object -First 1
if (-not $ollamaContainer) { $ollamaContainer = "financial-ocr-ollama-1" }

$modelList = docker exec $ollamaContainer ollama list 2>&1
$shortName = $OLLAMA_MODEL.Split("/")[-1]
if ($modelList -match [regex]::Escape($shortName)) {
    Write-OK "Model already exists"
} else {
    Write-Host "    Pulling model (first time may take several minutes)..." -ForegroundColor Yellow
    docker exec $ollamaContainer ollama pull $OLLAMA_MODEL
    if ($LASTEXITCODE -ne 0) { Write-Fail "Failed to pull model" }
    Write-OK "Model pulled"
}

# 5. Summary
Write-Step "System status"
docker ps --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  System ready!" -ForegroundColor Green
Write-Host "  Backend API : $BACKEND_URL" -ForegroundColor Green
Write-Host "  API Docs    : $BACKEND_URL/docs" -ForegroundColor Green
Write-Host "  Frontend    : http://localhost:3000" -ForegroundColor Green
Write-Host "  MinIO       : http://localhost:9001  (minioadmin / minioadmin)" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
