# Firecrawl Docker Quick Start Guide

Get Firecrawl (with integrated stock scraping) running in Docker in minutes!

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed (Docker Desktop recommended for Windows)
- [Docker Compose](https://docs.docker.com/compose/install/) (included with Docker Desktop)
- At least 4GB of free RAM
- 10GB of free disk space

## Choose Your Docker Compose File

**Two options available:**

1. **`docker-compose.yaml`** (Recommended) - Official Firecrawl setup, production-ready
2. **`docker-compose.yml`** - Simplified standalone setup with all services

Both now include stock scraping support! Use `docker-compose.yaml` for the official experience.

## Quick Start (3 Steps)

### 1. Set Up Environment Variables

```bash
# Option 1: Use the .env.example from Firecrawl
cp .env.example .env

# Option 2: Use the Docker-specific template
cp .env.docker .env

# Edit .env with your settings (optional for basic usage)
# Minimum required: none! Default settings work for local testing
```

**For Stock Data Extraction (AI):** Add your OpenAI API key to `.env`:
```bash
OPENAI_API_KEY=sk-your-key-here
```

**For Stock Scraping:** Optionally configure search mode in `.env`:
```bash
INVESTING_COM_SEARCH_MODE=investingcom-api
STOCK_SCRAPER_OUTPUT_DIR=./stock-output
```

### 2. Start All Services

```bash
# Using the official docker-compose.yaml (recommended)
docker compose up -d

# OR using the simplified docker-compose.yml
docker compose -f docker-compose.yml up -d

# Check that all services are running
docker compose ps
```

You should see all services running. Wait ~30-60 seconds for services to be fully healthy.

### 3. Test the API

#### Test Regular Scraping:
```bash
curl http://localhost:3002/health
```

#### Test Stock Scraping:
```bash
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
```

**Success!** 🎉 You should get stock data back. Markdown files will be saved to `./stock-output/`.

## Understanding the Setup

### Services

| Service | Port | Purpose |
|---------|------|---------|
| **firecrawl-api** | 3002 | Main API (includes stock scraping) |
| **playwright-service** | 3000 | Browser automation |
| **postgres** | 5432 | Database for job queuing |
| **redis** | 6379 | Cache and job queue |

### Data Persistence

All data is persisted in Docker volumes:
- `postgres-data` - Database data
- `redis-data` - Redis persistence
- `firecrawl-logs` - Application logs
- `./stock-output/` - Stock markdown files (host mounted)

## Stock Scraping Examples

### Example 1: Markdown Only (FREE - No OpenAI)
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

### Example 2: With AI Extraction
```bash
# Requires OPENAI_API_KEY in .env
curl -X POST http://localhost:3002/v1/scrape-stock \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["AAPL", "TSLA", "NVDA"],
    "options": {
      "markdown": true,
      "extract": true,
      "saveMarkdown": false
    }
  }'
```

### Example 3: Custom Schema
```bash
curl -X POST http://localhost:3002/v1/scrape-stock \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["AAPL"],
    "options": {
      "markdown": false,
      "extract": true,
      "schema": {
        "type": "object",
        "properties": {
          "companyName": {"type": "string"},
          "price": {"type": "number"},
          "marketCap": {"type": "string"}
        }
      }
    }
  }'
```

### Example 4: Using Firecrawl Search Mode
```bash
# Requires SERPER_API_KEY in .env
curl -X POST http://localhost:3002/v1/scrape-stock \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BYND"],
    "searchMode": "firecrawl-search",
    "options": {
      "markdown": true,
      "extract": false
    }
  }'
```

## Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f firecrawl-api

# Last 100 lines
docker-compose logs --tail=100 firecrawl-api
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v
```

### Restart a Service
```bash
docker-compose restart firecrawl-api
```

### Rebuild After Code Changes
```bash
# Rebuild and restart
docker-compose up -d --build firecrawl-api

# Force complete rebuild
docker-compose build --no-cache
docker-compose up -d
```

### Access Container Shell
```bash
# API container
docker exec -it firecrawl-api sh

# PostgreSQL
docker exec -it firecrawl-postgres psql -U postgres
```

## Configuration Guide

### Stock Scraping Options

Edit `.env` to configure stock scraping:

```bash
# Search Mode
INVESTING_COM_SEARCH_MODE=investingcom-api  # or "firecrawl-search"

# AI Extraction (requires OpenAI key)
OPENAI_API_KEY=sk-your-key-here
MODEL_NAME=gpt-4o-mini

# Or use Ollama locally
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

### Performance Tuning

```bash
# Number of workers per queue (default: 8)
NUM_WORKERS_PER_QUEUE=16  # Increase for better concurrency

# Block media for faster scraping
BLOCK_MEDIA=true
```

### Using with External Services

#### Connect to External PostgreSQL
```bash
# In .env, replace the default database URL
NUQ_DATABASE_URL=postgresql://user:pass@your-db-host:5432/dbname
```

Then disable the postgres service in docker-compose.yml:
```yaml
# Comment out or remove the postgres service
# postgres:
#   ...
```

#### Connect to External Redis
```bash
# In .env
REDIS_URL=redis://your-redis-host:6379
```

## Troubleshooting

### Services Won't Start

```bash
# Check service status
docker-compose ps

# Check logs for errors
docker-compose logs

# Ensure ports are available
netstat -an | findstr "3002 3000 5432 6379"  # Windows
# or
lsof -i :3002,3000,5432,6379  # Mac/Linux
```

### "Connection Refused" Errors

Wait for services to be healthy:
```bash
# Monitor health status
watch docker-compose ps  # Linux/Mac
# or manually check every few seconds on Windows
docker-compose ps
```

Services need ~30-60 seconds to start fully.

### Stock Scraping Returns Errors

1. **"No results found for ticker"**
   - Check ticker symbol is correct
   - Try on Investing.com manually first

2. **"Timeout" errors**
   - Increase timeout in request: `"timeout": 120000`
   - Check network connectivity

3. **AI extraction failing**
   - Verify `OPENAI_API_KEY` is set in `.env`
   - Check OpenAI account has credits
   - View logs: `docker-compose logs firecrawl-api`

### Out of Memory

Increase Docker memory:
- Docker Desktop → Settings → Resources → Memory
- Increase to at least 4GB

### Permission Errors (stock-output directory)

```bash
# Create directory with proper permissions
mkdir -p stock-output
chmod 755 stock-output

# On Windows, ensure Docker has access to the folder
# Docker Desktop → Settings → Resources → File Sharing
```

## Production Deployment

### Security Hardening

1. **Change default passwords:**
```bash
POSTGRES_PASSWORD=your-strong-password
BULL_AUTH_KEY=your-secret-key
```

2. **Enable authentication:**
```bash
USE_DB_AUTHENTICATION=true
# Set up Supabase credentials
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_TOKEN=your-token
```

3. **Use HTTPS reverse proxy** (nginx, Traefik, Caddy)

### Monitoring

Add monitoring with Slack notifications:
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Backups

```bash
# Backup PostgreSQL
docker exec firecrawl-postgres pg_dump -U postgres postgres > backup.sql

# Restore
docker exec -i firecrawl-postgres psql -U postgres < backup.sql

# Backup volumes
docker run --rm -v firecrawl_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

## Advanced Usage

### Custom Docker Network

If you have other services that need to connect to Firecrawl:

```yaml
networks:
  firecrawl-network:
    external: true
    name: my-shared-network
```

### Resource Limits

Add resource limits to docker-compose.yml:

```yaml
services:
  firecrawl-api:
    # ... other config ...
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### Environment-Specific Configs

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Docker Host                         │
│                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────┐ │
│  │              │     │              │     │            │ │
│  │  PostgreSQL  │◄────┤ Firecrawl    │◄────┤   Redis    │ │
│  │   (Queue)    │     │     API      │     │  (Cache)   │ │
│  │              │     │              │     │            │ │
│  └──────────────┘     └──────┬───────┘     └────────────┘ │
│                              │                             │
│                              │                             │
│                       ┌──────▼───────┐                     │
│                       │              │                     │
│                       │  Playwright  │                     │
│                       │   Service    │                     │
│                       │              │                     │
│                       └──────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    HTTP API (Port 3002)

            POST /v1/scrape-stock
            POST /v1/scrape
            POST /v1/crawl
            POST /v1/search
```

## Next Steps

1. ✅ Services running? → Test with examples above
2. 🎯 Need AI extraction? → Add `OPENAI_API_KEY` to `.env`
3. 🔧 Customize? → Edit `.env` and `docker-compose.yml`
4. 🚀 Production? → Follow security hardening section
5. 📚 Learn more? → Check [Firecrawl Docs](https://docs.firecrawl.dev)

## Support

- **Issues**: Check logs with `docker-compose logs`
- **Questions**: Open an issue on GitHub
- **Documentation**: See Firecrawl docs at https://docs.firecrawl.dev

---

**Happy Scraping!** 🔥📊
