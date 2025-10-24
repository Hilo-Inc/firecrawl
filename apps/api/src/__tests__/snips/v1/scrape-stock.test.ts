import { describeIf, HAS_SEARCH, scrapeTimeout } from "../lib";
import { idmux, Identity } from "./lib";
import request from "supertest";
import { TEST_API_URL } from "../lib";

let identity: Identity;

beforeAll(async () => {
  identity = await idmux({
    name: "scrape-stock",
    concurrency: 10,
    credits: 1000000,
  });
}, 10000);

// Helper function to make stock scrape requests
async function scrapeStock(body: any, identity: Identity) {
  return await request(TEST_API_URL)
    .post("/v1/scrape-stock")
    .set("Authorization", `Bearer ${identity.apiKey}`)
    .set("Content-Type", "application/json")
    .send(body);
}

describe("Stock scraping tests", () => {
  describeIf(!process.env.TEST_SUITE_SELF_HOSTED)(
    "Investing.com API mode",
    () => {
      it.concurrent(
        "should scrape a single stock with markdown",
        async () => {
          const response = await scrapeStock(
            {
              tickers: ["BYND"],
              searchMode: "investingcom-api",
              options: {
                markdown: true,
                extract: false,
                saveMarkdown: false,
              },
            },
            identity,
          );

          expect(response.statusCode).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.summary.total).toBe(1);
          expect(response.body.summary.successful).toBe(1);

          const result = response.body.results[0];
          expect(result.success).toBe(true);
          expect(result.ticker).toBe("BYND");
          expect(result.data?.url).toContain("investing.com");
          expect(result.data?.markdown).toBeDefined();
        },
        scrapeTimeout,
      );

      it.concurrent(
        "should handle batch scraping",
        async () => {
          const response = await scrapeStock(
            {
              tickers: ["AAPL", "TSLA"],
              searchMode: "investingcom-api",
              options: {
                markdown: true,
                extract: false,
              },
            },
            identity,
          );

          expect(response.statusCode).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.results.length).toBe(2);

          const successCount = response.body.results.filter(
            (r: any) => r.success,
          ).length;
          expect(successCount).toBeGreaterThanOrEqual(1);
        },
        scrapeTimeout * 2,
      );

      it.concurrent(
        "should handle invalid ticker",
        async () => {
          const response = await scrapeStock(
            {
              tickers: ["INVALIDTICKER123"],
              searchMode: "investingcom-api",
              options: { markdown: true, extract: false },
            },
            identity,
          );

          expect(response.statusCode).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.summary.failed).toBe(1);

          const result = response.body.results[0];
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        },
        scrapeTimeout,
      );

      describeIf(
        !process.env.TEST_SUITE_SELF_HOSTED ||
          !!process.env.OPENAI_API_KEY ||
          !!process.env.OLLAMA_BASE_URL,
      )("Extraction tests", () => {
        it.concurrent(
          "should scrape with AI extraction",
          async () => {
            const response = await scrapeStock(
              {
                tickers: ["BYND"],
                searchMode: "investingcom-api",
                options: {
                  markdown: false,
                  extract: true,
                },
              },
              identity,
            );

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);

            const result = response.body.results[0];
            if (result.success) {
              expect(result.data?.extract).toBeDefined();
            }
          },
          scrapeTimeout * 2,
        );
      });
    },
  );

  describeIf(!process.env.TEST_SUITE_SELF_HOSTED || HAS_SEARCH)(
    "Firecrawl search mode",
    () => {
      it.concurrent(
        "should work with firecrawl-search mode",
        async () => {
          const response = await scrapeStock(
            {
              tickers: ["AAPL"],
              searchMode: "firecrawl-search",
              options: { markdown: true, extract: false },
            },
            identity,
          );

          expect(response.statusCode).toBe(200);
          expect(response.body.success).toBe(true);
        },
        scrapeTimeout * 2,
      );
    },
  );

  describe("Validation", () => {
    it.concurrent("should reject empty tickers array", async () => {
      const response = await scrapeStock(
        {
          tickers: [],
          options: { markdown: true },
        },
        identity,
      );

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
