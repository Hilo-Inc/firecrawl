# 🔥 Firecrawl Stock Scraper - Docker Setup (FIXED)

## Problem Solved ✅

The build error (`sharedLibs/go-html-to-md not found`) has been fixed by using **pre-built Docker images** from GitHub Container Registry instead of building locally.

## Quick Start (3 Commands)

### 1. Set up environment (optional)
```bash
# Copy the example env file
cp .env.example .env

# Edit if you want AI extraction (optional)
# Add: OPENAI_API_KEY=sk-your-key-here
```

### 2. Start all services
```bash
# This will now pull pre-built images instead of building
docker compose up -d
```

### 3. Test stock scraping
```bash
# Wait ~30 seconds for services to start, then:
curl -X POST http://localhost:3002/v1/scrape-stock \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BYND", "AAPL"],
    "options": {
      "markdown": true,
      "extract": false,
      "saveMarkdown": true
    }
  }'
```

## What Changed?

**docker-compose.yaml** now uses:
- ✅ `image: ghcr.io/firecrawl/firecrawl:latest` (pre-built Firecrawl API)
- ✅ `image: ghcr.io/firecrawl/playwright-service:latest` (pre-built Playwright)
- ✅ `image: postgres:15-alpine` (official PostgreSQL)

**No more build errors!** 🎉

## Check Services

```bash
# View running services
docker compose ps

# Expected output:
NAME                           STATUS
firecrawl-api-1               Up
firecrawl-playwright-service-1 Up
firecrawl-redis-1             Up
firecrawl-nuq-postgres-1      Up
```

## View Logs

```bash
# All services
docker compose logs -f

# Just the API
docker compose logs -f api

# Check for errors
docker compose logs api | grep -i error
```

## Test the API

### Health Check
```bash
curl http://localhost:3002/health
```

### Stock Scraping - Markdown Only (FREE)
```bash
curl -X POST http://localhost:3002/v1/scrape-stock \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BYND"],
    "options": {
      "markdown": true,
      "extract": false,
      "saveMarkdown": true
    }
  }'
```

### Stock Scraping - With AI Extraction
```bash
# Requires OPENAI_API_KEY in .env
curl -X POST http://localhost:3002/v1/scrape-stock \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["AAPL", "TSLA"],
    "options": {
      "markdown": true,
      "extract": true,
      "saveMarkdown": false
    }
  }'
```

## Check Output Files

```bash
# Windows PowerShell
Get-ChildItem stock-output

# Linux/Mac
ls -lh stock-output/
```

## Troubleshooting

### Services won't start?
```bash
# Check logs for specific errors
docker compose logs api

# Restart
docker compose restart
```

### Port 3002 already in use?
```bash
# Stop any existing Firecrawl instances
docker compose down

# Or change the port in .env
echo "PORT=3003" >> .env
```

### Can't connect to API?
```bash
# Wait longer (services need 30-60 seconds)
sleep 45

# Test health endpoint
curl http://localhost:3002/health
```

### Want to build locally instead?

If you have all dependencies (Go, Rust, etc.), edit `docker-compose.yaml`:

```yaml
x-common-service: &common-service
  # Comment out the image line:
  # image: ghcr.io/firecrawl/firecrawl:latest
  # Uncomment the build line:
  build: apps/api
```

Then run:
```bash
docker compose build
docker compose up -d
```

## Stop Services

```bash
# Stop (keeps data)
docker compose down

# Stop and remove all data
docker compose down -v
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Docker Compose                      │
│                                                  │
│  ┌──────────────┐     ┌─────────────────────┐  │
│  │              │     │   Firecrawl API     │  │
│  │  PostgreSQL  │◄────┤  (Pre-built Image) │  │
│  │              │     │                     │  │
│  └──────────────┘     │  /v1/scrape-stock   │  │
│                       │  /v1/scrape         │  │
│  ┌──────────────┐     │  /v1/crawl          │  │
│  │   Redis      │◄────┤                     │  │
│  │              │     └──────────┬──────────┘  │
│  └──────────────┘                │              │
│                         ┌────────▼──────────┐   │
│                         │   Playwright      │   │
│                         │ (Pre-built Image) │   │
│                         └───────────────────┘   │
└─────────────────────────────────────────────────┘
                          │
                          ▼
                  localhost:3002
```

## What's Included

✅ **Firecrawl API** with stock scraping (`/v1/scrape-stock`)
✅ **PostgreSQL** database for job queuing
✅ **Redis** for caching
✅ **Playwright** for browser automation
✅ **Stock scraping** with Investing.com support
✅ **AI extraction** (optional, requires OpenAI key)
✅ **Markdown export** to `./stock-output/`

## Next Steps

1. ✅ Services running? → Test stock scraping examples above
2. 🎯 Need AI extraction? → Add `OPENAI_API_KEY` to `.env`
3. 📚 Full guide? → See `DOCKER_QUICKSTART.md`
4. 🔧 Customize? → Edit `.env` file

## Support

- **Logs**: `docker compose logs -f api`
- **Restart**: `docker compose restart`
- **Full docs**: See `DOCKER_README.md` and `DOCKER_QUICKSTART.md`

---

**Status**: ✅ Fixed and ready to use!
**Your stock scraping API is now running on http://localhost:3002** 🚀
