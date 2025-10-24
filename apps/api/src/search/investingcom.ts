import axios from "axios";
import { logger as _logger } from "../lib/logger";

const INVESTING_COM_API_URL = "https://api.investing.com/api/search/v2/search";

export interface InvestingComStockResult {
  url: string;
  ticker: string;
  exchange: string;
  description: string;
  symbol: string;
}

/**
 * Search for a stock on Investing.com by ticker symbol
 * @param ticker - The stock ticker symbol (e.g., "BYND", "AAPL")
 * @returns Stock information including URL, exchange, and description
 */
export async function investingcom_search(
  ticker: string,
): Promise<InvestingComStockResult> {
  const logger = _logger.child({
    method: "investingcom_search",
    ticker,
  });

  try {
    logger.info("Searching Investing.com for ticker", { ticker });

    const response = await axios.get(INVESTING_COM_API_URL, {
      params: { q: ticker },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000, // 10 second timeout
    });

    const searchData = response.data;

    // Validate search results
    if (!searchData.quotes || searchData.quotes.length === 0) {
      logger.warn("No results found for ticker", { ticker });
      throw new Error(`No results found for ticker: ${ticker}`);
    }

    // Get first quote result
    const firstQuote = searchData.quotes[0];
    const stockUrl = `https://www.investing.com${firstQuote.url}`;

    logger.info("Found stock on Investing.com", {
      ticker,
      url: stockUrl,
      exchange: firstQuote.exchange,
      description: firstQuote.description,
    });

    return {
      url: stockUrl,
      ticker: ticker.toUpperCase(),
      exchange: firstQuote.exchange,
      description: firstQuote.description,
      symbol: firstQuote.symbol,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        logger.error("Ticker not found on Investing.com", { ticker });
        throw new Error(`Ticker not found: ${ticker}`);
      }
      if (error.code === "ECONNABORTED") {
        logger.error("Request timeout when searching Investing.com", {
          ticker,
        });
        throw new Error(`Timeout searching for ticker: ${ticker}`);
      }
      logger.error("Axios error searching Investing.com", {
        ticker,
        error: error.message,
        status: error.response?.status,
      });
      throw new Error(
        `Failed to search Investing.com: ${error.message}`,
      );
    }

    logger.error("Error searching Investing.com", {
      ticker,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
