# Product Requirements Document: Firecrawl Coolify Deployment

## Introduction/Overview

This project aims to deploy the Firecrawl web scraping and data extraction service to Coolify using Docker containers. Firecrawl (https://github.com/firecrawl/firecrawl) provides APIs for web scraping, crawling, and converting web pages to clean markdown or structured data. By deploying it on Coolify, we will have a self-hosted version that can be integrated into automation pipelines like n8n to enable web data extraction workflows.

**Problem Statement:** Currently, there is no self-hosted Firecrawl instance available for use in automation workflows. This limits the ability to perform web scraping and data extraction in a controlled, cost-effective environment.

**Goal:** Create a production-ready Coolify deployment configuration for Firecrawl that can be reliably used in n8n and other automation tools.

## Goals

1. Successfully deploy the complete Firecrawl stack (API, workers, Redis, PostgreSQL) to Coolify and can be run locally with docker desktop
2. Ensure persistent data storage for the PostgreSQL database across container restarts
3. Enable secure API access using API keys for integration with n8n
4. Provide clear documentation for deployment, configuration, and usage
5. Support low-volume personal use (<100 requests/day) with appropriate resource allocation
6. Enable easy monitoring through Coolify's built-in logging capabilities

## User Stories

1. **As a developer**, I want to deploy Firecrawl to Coolify so that I can have a self-hosted web scraping service without relying on external APIs.

2. **As an automation engineer**, I want to integrate Firecrawl with n8n using HTTP requests so that I can scrape websites and extract data as part of my automated workflows.

3. **As a system administrator**, I want all configuration managed through environment variables in Coolify so that I can easily update settings without modifying Docker images.

4. **As a user**, I want my scraped data and configuration to persist across container restarts so that I don't lose important information during updates or maintenance.

5. **As a developer**, I want to view container logs in Coolify so that I can troubleshoot issues and monitor the health of the service.

## Functional Requirements

### Deployment Configuration

1. The system must provide a Docker Compose configuration compatible with Coolify that includes all required Firecrawl services:
   - API service
   - Worker service(s)
   - Redis cache
   - PostgreSQL database

2. The system must define appropriate environment variables for all services including:
   - Database connection strings
   - Redis connection details
   - API authentication keys
   - Service-specific configuration

3. The system must configure volume mounts for PostgreSQL data persistence to prevent data loss on container restarts.

4. The system must expose the Firecrawl API on a configurable port accessible to n8n and other services.

5. The system must configure health checks for all services to ensure Coolify can monitor service status.

### Resource Allocation

6. The system must define resource limits (CPU, memory) appropriate for personal use/low volume traffic (<100 requests/day).

7. The system must configure restart policies to ensure services automatically recover from failures.

### Security

8. The system must implement API key authentication for all API endpoints.

9. The system must use secure defaults for database passwords and Redis authentication.

10. The system must not expose unnecessary ports externally (only API endpoint should be accessible).

### Integration

11. The system must provide clear documentation on how to configure n8n HTTP Request nodes to communicate with the Firecrawl API.

12. The system must return responses in standard formats (JSON) compatible with n8n data processing.

### Documentation

13. The system must include a README with:
    - Prerequisites (Coolify setup, domain configuration)
    - Step-by-step deployment instructions
    - Environment variable reference
    - Example API usage with curl/n8n
    - Troubleshooting guide

14. The system must provide example environment variable configurations for quick setup.

15. The system must document the API endpoints available and their expected inputs/outputs.

## Non-Goals (Out of Scope)

1. **Custom n8n nodes**: We will use the standard HTTP Request node, not develop custom Firecrawl nodes for n8n.

2. **High availability/clustering**: This deployment targets personal use, not production-scale high availability setups.

3. **External database management**: We will not integrate with cloud database services (AWS RDS, etc.); PostgreSQL will run as a container.

4. **Advanced monitoring**: No integration with Prometheus, Grafana, or other monitoring platforms beyond Coolify's built-in logs.

5. **Autoscaling**: No automatic scaling based on load; resources will be statically allocated.

6. **Custom authentication**: No OAuth, SSO, or complex authentication beyond API keys.

7. **Rate limiting**: Basic API key auth only; no sophisticated rate limiting or throttling.

8. **Backup automation**: Manual backup procedures only; no automated backup scheduling.

## Design Considerations

### Docker Compose Structure

- Use multi-service Docker Compose file compatible with Coolify's deployment model
- Leverage official Firecrawl Docker images where available
- Use named volumes for data persistence
- Implement health checks using Firecrawl's built-in endpoints

### Network Configuration

- Use Docker internal networking for service-to-service communication
- Only expose the API service externally
- Configure Coolify's reverse proxy for SSL/TLS termination

### File Organization

```
firecrawl-deploy/
├── docker-compose.yml          # Main Coolify deployment configuration
├── .env.example               # Example environment variables
├── README.md                  # Deployment documentation
└── docs/
    ├── n8n-integration.md     # n8n setup guide
    └── api-reference.md       # API endpoint documentation
```

## Technical Considerations

### Dependencies

- Coolify platform (v4 or later)
- Docker and Docker Compose support in Coolify
- Domain or subdomain for API access
- Sufficient disk space for PostgreSQL data and Redis cache

### Firecrawl Requirements

- Review Firecrawl's official documentation for required environment variables
- Understand the relationship between API and worker services
- Determine if Firecrawl provides official Docker images or if custom builds are needed
- Identify minimum system requirements (CPU, RAM, disk)

### Database Schema

- PostgreSQL will be initialized by Firecrawl's migration scripts
- Database credentials must be securely generated and stored in Coolify

### Redis Configuration

- Redis will be used for job queues and caching
- Persistence should be disabled for Redis (ephemeral cache only)

## Success Metrics

1. **Deployment Success**: Firecrawl deploys successfully in Coolify with all services running and healthy.

2. **API Availability**: Firecrawl API responds to requests with <500ms latency for simple operations.

3. **n8n Integration**: Successfully execute at least one complete workflow in n8n that uses Firecrawl to scrape a website and process the data.

4. **Data Persistence**: Database data survives container restarts without corruption or data loss.

5. **Reliability**: System operates for 7 consecutive days without manual intervention or service failures.

6. **Documentation Quality**: A new user can deploy Firecrawl following the README without external assistance.

## Open Questions

1. Does Firecrawl provide official Docker images, or will we need to build custom images?

2. What are the exact environment variables required by Firecrawl for production deployment?

3. Are there specific PostgreSQL extensions or configurations required by Firecrawl?

4. What is the recommended resource allocation (CPU/RAM) for each service at low volume?

5. Does Firecrawl support database migrations out of the box, or will we need to handle schema initialization manually?

6. Are there any licensing considerations for self-hosting Firecrawl?

7. What API endpoints will be most commonly used with n8n, and do they have specific authentication requirements?

8. Should we implement any request logging or analytics for monitoring API usage?
