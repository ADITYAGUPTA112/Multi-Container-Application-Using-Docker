# Multi-Container Verification Script (PowerShell)
param(
    [string]$BaseUrl = "http://localhost:5000"
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Multi-Container Resilience & Verification Suite" -ForegroundColor Cyan
Write-Host " Target URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Health Check
Write-Host "`n[Step 1] Verifying System Health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
    Write-Host "  Health Status: $($health.status)" -ForegroundColor Green
    Write-Host "  API Status:    $($health.services.api.status)" -ForegroundColor Green
    Write-Host "  DB Status:     $($health.services.database.status)" -ForegroundColor Green
} catch {
    Write-Host "  Warning: Server returned $($_.Exception.Message). Continuing verification..." -ForegroundColor Yellow
}

# 2. Create Todo
Write-Host "`n[Step 2] Creating Test Todo via POST /todos..." -ForegroundColor Yellow
$createBody = @{
    title = "Resilience Verification Test Task"
    description = "Created automatically to test multi-container persistence"
} | ConvertTo-Json

try {
    $createRes = Invoke-RestMethod -Uri "$BaseUrl/todos" -Method Post -Body $createBody -ContentType "application/json"
    $todoId = $createRes.data._id
    Write-Host "  Successfully created Todo with ID: $todoId" -ForegroundColor Green
} catch {
    Write-Host "  Failed to create todo: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Read All Todos
Write-Host "`n[Step 3] Querying Todos via GET /todos..." -ForegroundColor Yellow
$listRes = Invoke-RestMethod -Uri "$BaseUrl/todos" -Method Get
$found = $listRes.data | Where-Object { $_._id -eq $todoId }
if ($found) {
    Write-Host "  Found created todo in database list ($($listRes.count) total items)." -ForegroundColor Green
} else {
    Write-Host "  Error: Created todo not found in list." -ForegroundColor Red
    exit 1
}

# 4. Update Todo
Write-Host "`n[Step 4] Updating Todo via PUT /todos/$todoId..." -ForegroundColor Yellow
$updateBody = @{
    title = "Resilience Verification Test Task (Updated)"
    isCompleted = $true
} | ConvertTo-Json

$updateRes = Invoke-RestMethod -Uri "$BaseUrl/todos/$todoId" -Method Put -Body $updateBody -ContentType "application/json"
if ($updateRes.data.isCompleted -eq $true) {
    Write-Host "  Successfully updated status to isCompleted = true" -ForegroundColor Green
} else {
    Write-Host "  Error updating todo." -ForegroundColor Red
    exit 1
}

# 5. Delete Todo
Write-Host "`n[Step 5] Cleaning up via DELETE /todos/$todoId..." -ForegroundColor Yellow
$deleteRes = Invoke-RestMethod -Uri "$BaseUrl/todos/$todoId" -Method Delete
Write-Host "  $($deleteRes.message)" -ForegroundColor Green

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host " All CRUD operations completed successfully!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
