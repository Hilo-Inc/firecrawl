# Stock Scraper API Test Examples (PowerShell)
# Make sure services are running: docker-compose up -d

$API_URL = "http://localhost:3003"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Stock Scraper API Test Suite" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Green
Write-Host "---------------------"
$response = Invoke-RestMethod -Uri "$API_URL/health" -Method Get
$response | ConvertTo-Json
Write-Host ""

# Test 2: Single Ticker - Markdown Only (Free)
Write-Host "Test 2: Single Ticker - Markdown Only" -ForegroundColor Green
Write-Host "--------------------------------------"
$body = @{
    tickers = @("BYND")
    options = @{
        markdown = $true
        extract = $false
        saveMarkdown = $true
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/scrape-stocks" -Method Post -Body $body -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Single Ticker - AI Extraction Only
Write-Host "Test 3: Single Ticker - AI Extraction" -ForegroundColor Green
Write-Host "--------------------------------------"
$body = @{
    tickers = @("BYND")
    options = @{
        markdown = $false
        extract = $true
        saveMarkdown = $false
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/scrape-stocks" -Method Post -Body $body -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Single Ticker - Both Formats
Write-Host "Test 4: Single Ticker - Both Formats" -ForegroundColor Green
Write-Host "-------------------------------------"
$body = @{
    tickers = @("BYND")
    options = @{
        markdown = $true
        extract = $true
        saveMarkdown = $true
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/scrape-stocks" -Method Post -Body $body -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 5: Multiple Tickers
Write-Host "Test 5: Multiple Tickers" -ForegroundColor Green
Write-Host "------------------------"
$body = @{
    tickers = @("BYND", "AAPL", "TSLA")
    options = @{
        markdown = $true
        extract = $true
        saveMarkdown = $true
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/scrape-stocks" -Method Post -Body $body -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 6: Custom Schema
Write-Host "Test 6: Custom Schema" -ForegroundColor Green
Write-Host "---------------------"
$body = @{
    tickers = @("AAPL")
    options = @{
        markdown = $false
        extract = $true
        schema = @{
            type = "object"
            properties = @{
                companyName = @{ type = "string" }
                price = @{ type = "number" }
                currency = @{ type = "string" }
            }
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$API_URL/scrape-stocks" -Method Post -Body $body -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Test suite completed!" -ForegroundColor Cyan
Write-Host "Check .\output\ directory for markdown files" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
