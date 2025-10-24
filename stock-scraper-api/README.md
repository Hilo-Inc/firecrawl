# Stock Scraper API

A custom API wrapper for Firecrawl to scrape stock data from Investing.com based on ticker symbols.

## Features

- 📊 Scrape multiple stock tickers in a single API call
- 📝 Extract data as Markdown (no OpenAI costs)
- 🤖 AI-powered structured data extraction using OpenAI (optional)
- 💾 Automatically save markdown files to disk
- 🔧 Configurable output formats and schemas

## Quick Start

### 1. Start Services

```bash
# From the firecrawl-deploy directory
docker-compose up -d
```

Wait for all services to be healthy:
```bash
docker-compose ps
```

### 2. Test the API

The stock scraper API runs on port **3003**.

#### Health Check
```bash
curl http://localhost:3003/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "stock-scraper-api",
  "timestamp": "2025-10-24T12:00:00.000Z"
}
```

## API Endpoints

### POST /scrape-stocks

Scrape stock data from Investing.com for one or more ticker symbols.

#### Request Body

```json
{
  "tickers": ["BYND", "AAPL", "TSLA"],
  "options": {
    "markdown": true,       // Extract as markdown
    "extract": true,        // Use AI to extract structured data
    "saveMarkdown": true,   // Save markdown files to disk
    "schema": {             // Custom JSON schema (optional)
      "type": "object",
      "properties": {
        "companyName": { "type": "string" },
        "currentPrice": { "type": "number" },
        "currency": { "type": "string" }
      }
    }
  }
}
```

#### Response

```json
{
  "success": true,
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0
  },
  "results": [
    {
      "ticker": "BYND",
      "success": true,
      "data": {
        "ticker": "BYND",
        "url": "https://www.investing.com/equities/beyond-meat-inc",
        "exchange": "NASDAQ",
        "symbol": "BYND",
        "markdown": "# Beyond Meat Inc...",
        "markdownFile": "BYND_1729771234567.md",
        "extractedData": {
          "companyName": "Beyond Meat Inc",
          "currentPrice": 5.47,
          "currency": "USD",
          "change": -0.23,
          "changePercent": -4.03
        }
      }
    }
  ]
}
```

## Usage Examples

### Example 1: Markdown Only (Free, No OpenAI)

```bash
curl -X POST http://localhost:3003/scrape-stocks \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BYND"],
    "options": {
      "markdown": true,
      "extract": false
    }
  }'
```

**Cost:** $0 (no OpenAI API calls)

### Example 2: AI Extraction Only

```bash
curl -X POST http://localhost:3003/scrape-stocks \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BYND", "AAPL"],
    "options": {
      "markdown": false,
      "extract": true
    }
  }'
```

**Cost:** ~$0.001-0.002 per stock (using gpt-4o-mini)

### Example 3: Both Markdown and AI Extraction

```bash
curl -X POST http://localhost:3003/scrape-stocks \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BYND", "TSLA", "NVDA"],
    "options": {
      "markdown": true,
      "extract": true,
      "saveMarkdown": true
    }
  }'
```

### Example 4: Custom Schema

```bash
curl -X POST http://localhost:3003/scrape-stocks \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["AAPL"],
    "options": {
      "extract": true,
      "markdown": false,
      "schema": {
        "type": "object",
        "properties": {
          "companyName": { "type": "string" },
          "price": { "type": "number" },
          "pe_ratio": { "type": "number" },
          "marketCap": { "type": "string" }
        }
      }
    }
  }'
```

## Default Schema

When `extract: true` is used without a custom schema, the API uses this comprehensive stock data schema:

```json
{
  "type": "object",
  "properties": {
    "companyName": { "type": "string" },
    "ticker": { "type": "string" },
    "currentPrice": { "type": "number" },
    "currency": { "type": "string" },
    "change": { "type": "number" },
    "changePercent": { "type": "number" },
    "volume": { "type": "number" },
    "marketCap": { "type": "string" },
    "high": { "type": "number" },
    "low": { "type": "number" },
    "open": { "type": "number" },
    "previousClose": { "type": "number" },
    "fiftyTwoWeekHigh": { "type": "number" },
    "fiftyTwoWeekLow": { "type": "number" },
    "peRatio": { "type": "number" },
    "eps": { "type": "number" },
    "beta": { "type": "number" }
  }
}
```

## Output Files

When `saveMarkdown: true` is enabled, markdown files are saved to:
```
stock-scraper-api/output/{TICKER}_{TIMESTAMP}.md
```

Example:
- `BYND_1729771234567.md`
- `AAPL_1729771235890.md`

## Configuration

### Environment Variables

Set these in your `.env` file:

```env
# Required for AI extraction
OPENAI_API_KEY=sk-...

# Optional: Custom OpenAI endpoint
OPENAI_BASE_URL=

# Model selection (default: gpt-4o-mini)
MODEL_NAME=gpt-4o-mini
```

### Docker Compose

The service is configured in `docker-compose.yml`:
- **Port:** 3003
- **Container:** stock-scraper-api
- **Depends on:** firecrawl-api
- **Network:** backend

## Troubleshooting

### Service not starting
```bash
# Check logs
docker-compose logs stock-scraper-api

# Check if Firecrawl API is healthy
curl http://localhost:3002/health
```

### No results found for ticker
- Verify the ticker symbol is correct
- Try the ticker on Investing.com search first
- Check Investing.com API availability

### AI extraction not working
- Verify `OPENAI_API_KEY` is set in `.env`
- Check OpenAI API quota and billing
- Review logs for OpenAI API errors

### Permission denied errors
```bash
# Fix output directory permissions
chmod 755 stock-scraper-api/output
```

## Cost Estimation

Using **gpt-4o-mini** (default):
- Small stock page (~3K tokens): **$0.0006/stock**
- Large stock page (~10K tokens): **$0.002/stock**

Monthly costs for different usage patterns:
- 100 stocks/day: ~$1.80/month
- 1,000 stocks/day: ~$18/month
- 10,000 stocks/day: ~$180/month

**Tip:** Use `markdown: true, extract: false` for free scraping when you don't need structured data!

## Architecture

```
Client Request
     ↓
Stock Scraper API (port 3003)
     ↓
Investing.com Search API
     ↓ (get stock URL)
Firecrawl API (port 3002)
     ↓
Playwright Service (browser automation)
     ↓
Target Stock Page
     ↓
Return: Markdown + AI Extraction
```

## Development

### Local Development
```bash
cd stock-scraper-api
npm install
npm run dev
```

### Rebuild Service
```bash
docker-compose up -d --build stock-scraper-api
```

### View Logs
```bash
docker-compose logs -f stock-scraper-api
```

## License

MIT
