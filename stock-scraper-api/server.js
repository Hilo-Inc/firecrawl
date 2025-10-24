const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;
const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL || 'http://firecrawl-api:3002';
const INVESTING_COM_API_URL = 'https://api.investing.com/api/search/v2/search';
const OUTPUT_DIR = path.join(__dirname, 'output');

// Middleware
app.use(cors());
app.use(express.json());

// Ensure output directory exists
fs.ensureDirSync(OUTPUT_DIR);

// Default stock data schema
const DEFAULT_STOCK_SCHEMA = {
  type: 'object',
  properties: {
    companyName: { type: 'string' },
    ticker: { type: 'string' },
    currentPrice: { type: 'number' },
    currency: { type: 'string' },
    change: { type: 'number' },
    changePercent: { type: 'number' },
    volume: { type: 'number' },
    marketCap: { type: 'string' },
    high: { type: 'number' },
    low: { type: 'number' },
    open: { type: 'number' },
    previousClose: { type: 'number' },
    fiftyTwoWeekHigh: { type: 'number' },
    fiftyTwoWeekLow: { type: 'number' },
    peRatio: { type: 'number' },
    eps: { type: 'number' },
    beta: { type: 'number' }
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'stock-scraper-api', timestamp: new Date().toISOString() });
});

// Main stock scraper endpoint
app.post('/scrape-stocks', async (req, res) => {
  try {
    const { tickers, options = {} } = req.body;

    // Validate input
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'tickers array is required and must contain at least one ticker symbol'
      });
    }

    const {
      markdown = true,
      extract = false,
      schema = DEFAULT_STOCK_SCHEMA,
      saveMarkdown = true
    } = options;

    console.log(`Processing ${tickers.length} ticker(s): ${tickers.join(', ')}`);

    // Process each ticker
    const results = await Promise.allSettled(
      tickers.map(ticker => scrapeStockData(ticker, { markdown, extract, schema, saveMarkdown }))
    );

    // Format results
    const formattedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          ticker: tickers[index],
          success: true,
          data: result.value
        };
      } else {
        return {
          ticker: tickers[index],
          success: false,
          error: result.reason.message
        };
      }
    });

    // Calculate success rate
    const successCount = formattedResults.filter(r => r.success).length;
    const failureCount = formattedResults.length - successCount;

    res.json({
      success: true,
      summary: {
        total: tickers.length,
        successful: successCount,
        failed: failureCount
      },
      results: formattedResults
    });

  } catch (error) {
    console.error('Error in /scrape-stocks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Function to scrape stock data for a single ticker
async function scrapeStockData(ticker, options) {
  const { markdown, extract, schema, saveMarkdown } = options;

  console.log(`[${ticker}] Starting scrape...`);

  // Step 1: Search for ticker on Investing.com
  console.log(`[${ticker}] Searching on Investing.com...`);
  const searchResponse = await axios.get(INVESTING_COM_API_URL, {
    params: { q: ticker },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const searchData = searchResponse.data;

  // Validate search results
  if (!searchData.quotes || searchData.quotes.length === 0) {
    throw new Error(`No results found for ticker: ${ticker}`);
  }

  // Get first quote result
  const firstQuote = searchData.quotes[0];
  const stockUrl = `https://www.investing.com${firstQuote.url}`;

  console.log(`[${ticker}] Found URL: ${stockUrl}`);
  console.log(`[${ticker}] Company: ${firstQuote.description} (${firstQuote.exchange})`);

  // Step 2: Prepare Firecrawl request
  const formats = [];
  if (markdown) formats.push('markdown');
  if (extract) formats.push('extract');

  if (formats.length === 0) {
    throw new Error('At least one format (markdown or extract) must be enabled');
  }

  const firecrawlPayload = {
    url: stockUrl,
    formats: formats
  };

  // Add extract schema if extraction is enabled
  if (extract) {
    firecrawlPayload.extract = {
      schema: schema
    };
  }

  // Step 3: Call Firecrawl API
  console.log(`[${ticker}] Calling Firecrawl with formats: ${formats.join(', ')}`);
  const firecrawlResponse = await axios.post(
    `${FIRECRAWL_API_URL}/v1/scrape`,
    firecrawlPayload,
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  const firecrawlData = firecrawlResponse.data;

  if (!firecrawlData.success) {
    throw new Error(`Firecrawl scraping failed: ${firecrawlData.error || 'Unknown error'}`);
  }

  // Step 4: Process results
  const result = {
    ticker: ticker,
    url: stockUrl,
    exchange: firstQuote.exchange,
    symbol: firstQuote.symbol
  };

  // Add markdown data
  if (markdown && firecrawlData.data.markdown) {
    result.markdown = firecrawlData.data.markdown;

    // Save markdown to file if enabled
    if (saveMarkdown) {
      const filename = `${ticker}_${Date.now()}.md`;
      const filepath = path.join(OUTPUT_DIR, filename);
      await fs.writeFile(filepath, firecrawlData.data.markdown, 'utf-8');
      result.markdownFile = filename;
      console.log(`[${ticker}] Saved markdown to: ${filename}`);
    }
  }

  // Add extracted data
  if (extract && firecrawlData.data.extract) {
    result.extractedData = firecrawlData.data.extract;
  }

  console.log(`[${ticker}] Scraping completed successfully`);

  return result;
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stock Scraper API running on http://0.0.0.0:${PORT}`);
  console.log(`Firecrawl API URL: ${FIRECRAWL_API_URL}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
});
