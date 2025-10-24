# Running Firecrawl with Stock Scraping in Docker

This guide shows you how to run Firecrawl (with integrated stock scraping) using Docker Compose.

## Files Created for Docker Setup

```
C:\dev\firecrawl\
├── docker-compose.yaml        ✅ Official Firecrawl (UPDATED with stock scraping)
├── docker-compose.yml         ✅ Simplified standalone setup
├── .env.docker                ✅ Environment template
├── .env.example               ✅ Firecrawl's original env template (UPDATED)
├── DOCKER_QUICKSTART.md       ✅ Complete Docker guide
└── stock-output/              📁 Stock markdown files saved here
```

## Quick Start (Copy & Paste)

### Windows PowerShell:
```powershell
# 1. Set up environment
Copy-Item .env.example .env

# 2. Start services (using official docker-compose.yaml)
docker compose up -d

# 3. Wait for services to start (30-60 seconds)
Start-Sleep -Seconds 45

# 4. Test stock scraping
$body = @{
    tickers = @("BYND", "AAPL")
    searchMode = "investingcom-api"
    options = @{
        markdown = $true
        extract = $false
        saveMarkdown = $true
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3002/v1/scrape-stock -Method Post -Body $body -ContentType "application/json"

# 5. Check output
Get-ChildItem ./stock-output/
```

### Linux/Mac Bash:
```bash
# 1. Set up environment
cp .env.example .env

# 2. Start services
docker compose up -d

# 3. Wait for services
sleep 45

# 4. Test stock scraping
curl -X POST http://localhost:3002/v1/scrape-stock \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BYND", "AAPL"],
    "searchMode": "investingcom-api",
    "options": {
      "markdown": true,
      "extract": false,
      "saveMarkdown": true
    }
  }'

# 5. Check output
ls -lh stock-output/
```

## What's Different from Standalone Stock Scraper?

| Aspect | Old (Standalone) | New (Integrated) |
|--------|------------------|------------------|
| **Service** | Separate stock-scraper-api | Part of Firecrawl API |
| **Port** | 3003 | 3002 |
| **Endpoint** | `/scrape-stocks` | `/v1/scrape-stock` |
| **Docker Setup** | Own Dockerfile | Uses Firecrawl's Dockerfile |
| **Environment** | Own .env | Shares Firecrawl .env |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                          │
│  ┌──────────────┐    ┌───────────────┐   ┌──────────┐ │
│  │   Postgres   │◄───┤  Firecrawl    │◄──┤  Redis   │ │
│  │  (Database)  │    │     API       │   │ (Cache)  │ │
│  │              │    │ ┌───────────┐ │   │          │ │
│  └──────────────┘    │ │  Stock    │ │   └──────────┘ │
│                      │ │  Scraping │ │                 │
│  ┌──────────────┐    │ │ /v1/scrape│ │                 │
│  │  Playwright  │◄───┤ │   -stock  │ │                 │
│  │  (Browser)   │    │ └───────────┘ │                 │
│  └──────────────┘    └───────────────┘                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              HTTP API (localhost:3002)
```

## Common Operations

### View Logs
```bash
# All services
docker compose logs -f

# Just API
docker compose logs -f api

# Last 50 lines
docker compose logs --tail=50 api
```

### Restart Services
```bash
# Restart everything
docker compose restart

# Just the API
docker compose restart api
```

### Stop Everything
```bash
# Stop (keeps data)
docker compose down

# Stop and remove data
docker compose down -v
```

### Check Stock Output
```bash
# Windows
dir stock-output

# Linux/Mac
ls -lh stock-output/
```

## Configuration

### Enable AI Extraction

Add to your `.env`:
```bash
OPENAI_API_KEY=sk-your-actual-key-here
MODEL_NAME=gpt-4o-mini
```

Then restart:
```bash
docker compose restart api
```

### Switch Search Mode

In `.env`:
```bash
# Fast, direct API calls (default)
INVESTING_COM_SEARCH_MODE=investingcom-api

# OR use Firecrawl's search (requires SERPER_API_KEY)
INVESTING_COM_SEARCH_MODE=firecrawl-search
SERPER_API_KEY=your-serper-key
```

### Change Output Directory

In `.env`:
```bash
STOCK_SCRAPER_OUTPUT_DIR=/custom/path
```

Then update docker-compose.yaml:
```yaml
api:
  volumes:
    - /custom/path:/app/stock-output
```

## Troubleshooting

### "Connection refused" on port 3002

Wait longer - services need 30-60 seconds to start:
```bash
# Check status
docker compose ps

# Watch logs
docker compose logs -f api
```

### No markdown files created

1. Check the directory exists:
   ```bash
   mkdir -p stock-output
   ```

2. Check volume mount in docker-compose:
   ```bash
   docker compose config | grep -A2 volumes
   ```

3. Check permissions (Linux/Mac):
   ```bash
   chmod 755 stock-output
   ```

### AI extraction not working

1. Verify API key is set:
   ```bash
   docker compose exec api sh -c 'echo $OPENAI_API_KEY'
   ```

2. Check OpenAI account has credits

3. View detailed logs:
   ```bash
   docker compose logs -f api | grep -i openai
   ```

### Services won't start

1. Check ports aren't in use:
   ```bash
   # Windows
   netstat -ano | findstr "3002 3000 5432 6379"

   # Linux/Mac
   lsof -i :3002,3000,5432,6379
   ```

2. Check Docker has enough resources:
   - Docker Desktop → Settings → Resources
   - Increase memory to at least 4GB

3. Rebuild from scratch:
   ```bash
   docker compose down -v
   docker compose build --no-cache
   docker compose up -d
   ```

## API Examples

### 1. Simple Stock Scrape (Markdown Only)
```bash
curl -X POST http://localhost:3002/v1/scrape-stock \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BYND"],
    "options": {"markdown": true, "extract": false}
  }'
```

### 2. Batch Scrape with AI Extraction
```bash
curl -X POST http://localhost:3002/v1/scrape-stock \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["AAPL", "TSLA", "NVDA"],
    "options": {
      "markdown": true,
      "extract": true,
      "saveMarkdown": true
    }
  }'
```

### 3. Custom Extraction Schema
```bash
curl -X POST http://localhost:3002/v1/scrape-stock \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BYND"],
    "options": {
      "extract": true,
      "schema": {
        "type": "object",
        "properties": {
          "companyName": {"type": "string"},
          "price": {"type": "number"},
          "change": {"type": "number"}
        }
      }
    }
  }'
```

## Production Deployment

For production use:

1. **Change default passwords** in `.env`:
   ```bash
   POSTGRES_PASSWORD=secure-random-password
   BULL_AUTH_KEY=another-random-key
   ```

2. **Use HTTPS** with a reverse proxy (nginx, Traefik, Caddy)

3. **Set up backups**:
   ```bash
   # Backup PostgreSQL
   docker compose exec postgres pg_dump -U postgres > backup.sql
   ```

4. **Monitor with health checks**:
   ```bash
   curl http://localhost:3002/health
   ```

5. **Enable Slack notifications** in `.env`:
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
   ```

## Next Steps

✅ **Services running?** → Try the API examples above
🔐 **Need authentication?** → See [Firecrawl docs](https://docs.firecrawl.dev)
🎯 **Production deployment?** → Follow production checklist above
📖 **More details?** → Read `DOCKER_QUICKSTART.md`

## Support

- 📚 **Full Guide**: See `DOCKER_QUICKSTART.md`
- 🐛 **Issues**: Check `docker compose logs`
- 💬 **Questions**: Open an issue on GitHub
- 📖 **Docs**: https://docs.firecrawl.dev

Happy scraping! 🔥📊
