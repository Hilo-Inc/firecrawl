import { Response } from "express";
import {
  RequestWithAuth,
  ScrapeStockRequest,
  ScrapeStockResponse,
  scrapeStockRequestSchema,
  StockScrapeResult,
  Document,
} from "./types";
import { v4 as uuidv4 } from "uuid";
import { logger as _logger } from "../../lib/logger";
import { investingcom_search } from "../../search/investingcom";
import { search } from "../../search";
import { addScrapeJob, waitForJob } from "../../services/queue-jobs";
import { getJobPriority } from "../../lib/job-priority";
import { fromV1ScrapeOptions } from "../v2/types";
import { scrapeQueue } from "../../services/worker/nuq";
import { isUrlBlocked } from "../../scraper/WebScraper/utils/blocklist";
import { BLOCKLISTED_URL_MESSAGE } from "../../lib/strings";
import { promises as fs } from "fs";
import * as path from "path";
import { billTeam } from "../../services/billing/credit_billing";
import { logJob } from "../../services/logging/log_job";
import { CostTracking } from "../../lib/cost-tracking";

// Default stock data extraction schema
const DEFAULT_STOCK_SCHEMA = {
  type: "object",
  properties: {
    companyName: { type: "string" },
    ticker: { type: "string" },
    currentPrice: { type: "number" },
    currency: { type: "string" },
    change: { type: "number" },
    changePercent: { type: "number" },
    volume: { type: "number" },
    marketCap: { type: "string" },
    high: { type: "number" },
    low: { type: "number" },
    open: { type: "number" },
    previousClose: { type: "number" },
    fiftyTwoWeekHigh: { type: "number" },
    fiftyTwoWeekLow: { type: "number" },
    peRatio: { type: "number" },
    eps: { type: "number" },
    beta: { type: "number" },
  },
};

interface StockSearchResult {
  url: string;
  ticker: string;
  exchange: string;
  description: string;
  symbol: string;
}

/**
 * Search for a stock using either Investing.com API or Firecrawl search
 */
async function searchStock(
  ticker: string,
  searchMode: "investingcom-api" | "firecrawl-search",
  logger: any,
): Promise<StockSearchResult> {
  if (searchMode === "investingcom-api") {
    logger.info("Using Investing.com API to search for ticker", { ticker });
    return await investingcom_search(ticker);
  } else {
    logger.info("Using Firecrawl search to find stock", { ticker });
    const searchResults = await search({
      query: `${ticker} stock investing.com`,
      logger,
      num_results: 5,
    });

    // Filter for investing.com results
    const investingResults = searchResults.filter(result =>
      result.url.includes("investing.com"),
    );

    if (investingResults.length === 0) {
      throw new Error(`No Investing.com results found for ticker: ${ticker}`);
    }

    const firstResult = investingResults[0];
    return {
      url: firstResult.url,
      ticker: ticker.toUpperCase(),
      exchange: "N/A",
      description: firstResult.description,
      symbol: ticker.toUpperCase(),
    };
  }
}

/**
 * Scrape a single stock ticker
 */
async function scrapeSingleStock(
  ticker: string,
  options: {
    markdown: boolean;
    extract: boolean;
    saveMarkdown: boolean;
    schema?: any;
    searchMode: "investingcom-api" | "firecrawl-search";
    teamId: string;
    origin: string;
    timeout: number;
    apiKeyId: number | null;
  },
  logger: any,
  flags: any,
): Promise<StockScrapeResult> {
  const jobId = uuidv4();
  const zeroDataRetention = flags?.forceZDR ?? false;

  try {
    logger.info(`[${ticker}] Starting stock scrape`, { ticker });

    // Step 1: Search for the stock
    const searchResult = await searchStock(
      ticker,
      options.searchMode,
      logger,
    );

    logger.info(`[${ticker}] Found stock URL`, {
      ticker,
      url: searchResult.url,
      exchange: searchResult.exchange,
    });

    // Step 2: Check if URL is blocked
    if (isUrlBlocked(searchResult.url, flags)) {
      throw new Error("Could not scrape URL: " + BLOCKLISTED_URL_MESSAGE);
    }

    // Step 3: Prepare scrape options
    const formats: string[] = [];
    if (options.markdown) formats.push("markdown");
    if (options.extract) formats.push("extract");

    if (formats.length === 0) {
      throw new Error("At least one format (markdown or extract) must be enabled");
    }

    const scrapeOptions: any = { formats };

    // Add extract schema if extraction is enabled
    if (options.extract) {
      scrapeOptions.extract = {
        schema: options.schema || DEFAULT_STOCK_SCHEMA,
      };
    }

    const { scrapeOptions: processedOptions, internalOptions } =
      fromV1ScrapeOptions(scrapeOptions, options.timeout, options.teamId);

    // Step 4: Add scrape job
    const jobPriority = await getJobPriority({
      team_id: options.teamId,
      basePriority: 10,
    });

    logger.info(`[${ticker}] Adding scrape job`, {
      ticker,
      jobId,
      url: searchResult.url,
      formats: formats.join(", "),
    });

    await addScrapeJob(
      {
        url: searchResult.url,
        mode: "single_urls",
        team_id: options.teamId,
        scrapeOptions: processedOptions,
        internalOptions: {
          ...internalOptions,
          teamId: options.teamId,
          bypassBilling: true, // Billing happens at controller level
          zeroDataRetention,
          teamFlags: flags ?? null,
        },
        origin: options.origin,
        is_scrape: true,
        startTime: Date.now(),
        zeroDataRetention,
        apiKeyId: options.apiKeyId,
      },
      jobId,
      jobPriority,
      false,
      true,
    );

    // Step 5: Wait for job completion
    const doc: Document = await waitForJob(
      jobId,
      options.timeout,
      zeroDataRetention,
    );

    logger.info(`[${ticker}] Scrape job completed`, {
      ticker,
      jobId,
      url: searchResult.url,
    });

    await scrapeQueue.removeJob(jobId, logger);

    // Step 6: Process results
    const result: StockScrapeResult = {
      ticker: ticker.toUpperCase(),
      success: true,
      data: {
        url: searchResult.url,
        exchange: searchResult.exchange,
        symbol: searchResult.symbol,
      },
    };

    // Add markdown if present
    if (options.markdown && doc.markdown) {
      result.data!.markdown = doc.markdown;

      // Save markdown to file if enabled
      if (options.saveMarkdown) {
        const outputDir =
          process.env.STOCK_SCRAPER_OUTPUT_DIR || "./stock-output";
        try {
          await fs.mkdir(outputDir, { recursive: true });
        } catch (err) {
          // Directory might already exist, ignore
        }

        const filename = `${ticker}_${Date.now()}.md`;
        const filepath = path.join(outputDir, filename);
        await fs.writeFile(filepath, doc.markdown, "utf-8");
        result.data!.markdownFile = filename;

        logger.info(`[${ticker}] Saved markdown to file`, {
          ticker,
          filename,
        });
      }
    }

    // Add extracted data if present
    if (options.extract && doc.extract) {
      result.data!.extract = doc.extract;
    }

    logger.info(`[${ticker}] Stock scrape completed successfully`, { ticker });

    return result;
  } catch (error) {
    logger.error(`[${ticker}] Error scraping stock`, {
      ticker,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      ticker: ticker.toUpperCase(),
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main stock scraping controller
 */
export async function scrapeStockController(
  req: RequestWithAuth<{}, ScrapeStockResponse, ScrapeStockRequest>,
  res: Response<ScrapeStockResponse>,
) {
  // Get timing data from middleware
  const middlewareStartTime =
    (req as any).requestTiming?.startTime || new Date().getTime();
  const controllerStartTime = new Date().getTime();

  const jobId = uuidv4();
  const logger = _logger.child({
    method: "scrapeStockController",
    jobId,
    teamId: req.auth.team_id,
    team_id: req.auth.team_id,
    zeroDataRetention: req.acuc?.flags?.forceZDR,
  });

  const middlewareTime = controllerStartTime - middlewareStartTime;

  try {
    // Parse and validate request
    req.body = scrapeStockRequestSchema.parse(req.body);

    const { tickers, searchMode, options, timeout, origin } = req.body;

    // Determine search mode (env default or request override)
    const effectiveSearchMode =
      searchMode ||
      (process.env.INVESTING_COM_SEARCH_MODE as
        | "investingcom-api"
        | "firecrawl-search") ||
      "investingcom-api";

    logger.info("Stock scrape request received", {
      version: "v1",
      tickerCount: tickers.length,
      tickers: tickers.join(", "),
      searchMode: effectiveSearchMode,
      options,
    });

    // Process all tickers in parallel with Promise.allSettled
    const results = await Promise.allSettled(
      tickers.map(ticker =>
        scrapeSingleStock(
          ticker,
          {
            markdown: options.markdown,
            extract: options.extract,
            saveMarkdown: options.saveMarkdown,
            schema: options.schema,
            searchMode: effectiveSearchMode,
            teamId: req.auth.team_id,
            origin: origin,
            timeout: timeout,
            apiKeyId: req.acuc?.api_key_id ?? null,
          },
          logger,
          req.acuc?.flags ?? null,
        ),
      ),
    );

    // Format results
    const formattedResults: StockScrapeResult[] = results.map(
      (result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            ticker: tickers[index],
            success: false,
            error: result.reason?.message || "Unknown error",
          };
        }
      },
    );

    // Calculate success rate
    const successCount = formattedResults.filter(r => r.success).length;
    const failureCount = formattedResults.length - successCount;

    logger.info("Stock scrape completed", {
      total: tickers.length,
      successful: successCount,
      failed: failureCount,
    });

    // Bill for successful scrapes
    if (successCount > 0) {
      const creditsToBill = successCount;
      const team_endpoint_token = req.auth.team_id === "bypass" ? "bypass" : null;

      if (!team_endpoint_token) {
        try {
          await billTeam(
            req.auth.team_id,
            null,
            creditsToBill,
            req.acuc?.api_key_id ?? null,
            logger,
          );
          logger.info("Team billed for stock scrapes", {
            teamId: req.auth.team_id,
            credits: creditsToBill,
          });
        } catch (billingError) {
          logger.error("Error billing team", {
            error:
              billingError instanceof Error
                ? billingError.message
                : String(billingError),
          });
        }
      }

      // Log job
      const totalTime = Date.now() - controllerStartTime;
      await logJob({
        job_id: jobId,
        team_id: req.auth.team_id,
        success: true,
        message: `Stock scrape: ${successCount}/${tickers.length} successful`,
        num_docs: successCount,
        docs: formattedResults
          .filter(r => r.success)
          .map(r => ({
            url: r.data?.url,
            markdown: r.data?.markdown,
            extract: r.data?.extract,
          })),
        time_taken: totalTime,
        mode: "stock-scrape",
        url: `stock-scrape:${tickers.join(",")}`,
        origin: origin,
        credits_billed: creditsToBill,
        zeroDataRetention: req.acuc?.flags?.forceZDR ?? false,
      });
    }

    // Return response
    return res.json({
      success: true,
      summary: {
        total: tickers.length,
        successful: successCount,
        failed: failureCount,
      },
      results: formattedResults,
    });
  } catch (error) {
    logger.error("Error in scrapeStockController", {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Internal server error",
    });
  }
}
