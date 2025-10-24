# Stock Scraper API - Quick Start Guide

## Overview

You now have a custom API endpoint that wraps Firecrawl to scrape stock data from Investing.com. The service:

1. Takes ticker symbols (e.g., "BYND", "AAPL")
2. Searches Investing.com API for the stock
3. Scrapes the stock page using Firecrawl
4. Returns both markdown and AI-extracted structured data (configurable)

## Architecture

```
Your Request → Stock Scraper API (port 3003) → Investing.com API
                      ↓
               Firecrawl API (port 3002)
                      ↓
               Stock Page Content
                      ↓
               Returns: Markdown + JSON
```

## Step-by-Step Setup

### 1. Start All Services

```bash
cd C:\dev\firecrawl-deploy
docker-compose up -d
```

This starts:
- **stock-scraper-api** (port 3003) - Your new API
- **firecrawl-api** (port 3002) - Main Firecrawl API
- **playwright-service** (port 3000) - Browser automation
- **redis** - Caching
- **postgres** - Database

### 2. Wait for Services to be Healthy

```bash
docker-compose ps
```

Wait until all services show "healthy" status (~1-2 minutes).

### 3. Test the Health Endpoint

```bash
curl http://localhost:3003/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "stock-scraper-api",
  "timestamp": "2025-10-24T..."
}
```

## Basic Usage

### Example 1: Scrape a Single Stock (Markdown Only - FREE)

```bash
curl -X POST http://localhost:3003/scrape-stocks \
  -H "Content-Type: application/json" \
  -d "{\"tickers\": [\"BYND\"], \"options\": {\"markdown\": true, \"extract\": false}}"
```

**No OpenAI costs!** Perfect for just getting the page content.

### Example 2: Multiple Stocks with AI Extraction

```bash
curl -X POST http://localhost:3003/scrape-stocks \
  -H "Content-Type: application/json" \
  -d "{\"tickers\": [\"BYND\", \"AAPL\", \"TSLA\"], \"options\": {\"markdown\": true, \"extract\": true}}"
```

**Uses OpenAI API** (~$0.001 per stock) - Gets structured data automatically.

## Using PowerShell (Windows)

Run the included test script:

```powershell
cd C:\dev\firecrawl-deploy\stock-scraper-api
.\test-examples.ps1
```

This will run all test cases and show you examples of different configurations.

## Using Postman

1. Open Postman
2. Import: `stock-scraper-api/postman-collection.json`
3. Run any of the pre-configured requests

## API Request Format

```json
POST http://localhost:3003/scrape-stocks

{
  "tickers": ["BYND", "AAPL"],
  "options": {
    "markdown": true,        // Get markdown content
    "extract": true,         // Get AI-extracted structured data
    "saveMarkdown": true,    // Save .md files to disk
    "schema": {              // Optional: custom extraction schema
      "type": "object",
      "properties": {
        "companyName": { "type": "string" },
        "currentPrice": { "type": "number" }
      }
    }
  }
}
```

## Response Format

```json
{
  "success": true,
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  },
  "results": [
    {
      "ticker": "BYND",
      "success": true,
      "data": {
        "url": "https://www.investing.com/equities/beyond-meat-inc",
        "exchange": "NASDAQ",
        "markdown": "# Beyond Meat Inc\n\n...",
        "markdownFile": "BYND_1729771234567.md",
        "extractedData": {
          "companyName": "Beyond Meat Inc",
          "currentPrice": 5.47,
          "change": -0.23
        }
      }
    }
  ]
}
```

## Output Files

Markdown files are saved to: `stock-scraper-api/output/`

Example files:
- `BYND_1729771234567.md`
- `AAPL_1729771235890.md`

## Cost Management

### Free Option (Markdown Only)
```json
{"markdown": true, "extract": false}
```
- **Cost:** $0
- **Use Case:** Just need the page content, will parse it yourself

### AI Extraction (Small Cost)
```json
{"markdown": true, "extract": true}
```
- **Cost:** ~$0.0006 - $0.002 per stock
- **Use Case:** Need structured data automatically extracted

### Monthly Cost Examples
- 100 stocks/day: ~$1.80/month
- 1,000 stocks/day: ~$18/month
- 10,000 stocks/day: ~$180/month

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs stock-scraper-api

# Rebuild
docker-compose up -d --build stock-scraper-api
```

### GitHub Container Registry Access Denied
If you see "denied" errors when pulling Firecrawl images:
1. The images might require authentication
2. Or they may have moved/been renamed
3. Check the official Firecrawl repo: https://github.com/mendableai/firecrawl

### No results for ticker
- Verify ticker exists on Investing.com
- Try the search manually: https://api.investing.com/api/search/v2/search?q=BYND

### AI extraction not working
- Check that `OPENAI_API_KEY` is set in `.env`
- Verify your OpenAI API key is valid and has credits
- Check logs: `docker-compose logs firecrawl-api`

## Next Steps

1. **Integrate into your application:** Make HTTP POST requests to `http://localhost:3003/scrape-stocks`

2. **Customize the schema:** Modify the default schema in `server.js` or pass custom schemas in requests

3. **Batch processing:** Pass arrays of tickers to process multiple stocks in one request

4. **Scheduling:** Set up cron jobs or scheduled tasks to scrape stocks periodically

5. **Data storage:** Store results in your database for historical analysis

## Files Created

```
stock-scraper-api/
├── server.js              # Main API logic
├── package.json           # Dependencies
├── Dockerfile             # Container configuration
├── .dockerignore          # Docker ignore rules
├── README.md              # Full documentation
├── test-examples.sh       # Bash test script
├── test-examples.ps1      # PowerShell test script
├── postman-collection.json # Postman import
└── output/                # Markdown files saved here
```

## Support

- **API Documentation:** See `stock-scraper-api/README.md`
- **Firecrawl Docs:** See `docs/api-reference.md`
- **Issues:** Check `docker-compose logs` for errors

---

**Ready to test!** Start with the health check and then try scraping BYND as shown in Example 1 above.
