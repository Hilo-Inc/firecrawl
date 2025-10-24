#!/bin/bash

# Stock Scraper API Test Examples
# Make sure services are running: docker-compose up -d

API_URL="http://localhost:3003"

echo "========================================="
echo "Stock Scraper API Test Suite"
echo "========================================="
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "---------------------"
curl -s "$API_URL/health" | jq .
echo -e "\n"

# Test 2: Single Ticker - Markdown Only (Free)
echo "Test 2: Single Ticker - Markdown Only"
echo "--------------------------------------"
curl -s -X POST "$API_URL/scrape-stocks" \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BYND"],
    "options": {
      "markdown": true,
      "extract": false,
      "saveMarkdown": true
    }
  }' | jq .
echo -e "\n"

# Test 3: Single Ticker - AI Extraction Only
echo "Test 3: Single Ticker - AI Extraction"
echo "--------------------------------------"
curl -s -X POST "$API_URL/scrape-stocks" \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BYND"],
    "options": {
      "markdown": false,
      "extract": true,
      "saveMarkdown": false
    }
  }' | jq .
echo -e "\n"

# Test 4: Single Ticker - Both Formats
echo "Test 4: Single Ticker - Both Formats"
echo "-------------------------------------"
curl -s -X POST "$API_URL/scrape-stocks" \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BYND"],
    "options": {
      "markdown": true,
      "extract": true,
      "saveMarkdown": true
    }
  }' | jq .
echo -e "\n"

# Test 5: Multiple Tickers
echo "Test 5: Multiple Tickers"
echo "------------------------"
curl -s -X POST "$API_URL/scrape-stocks" \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BYND", "AAPL", "TSLA"],
    "options": {
      "markdown": true,
      "extract": true,
      "saveMarkdown": true
    }
  }' | jq .
echo -e "\n"

# Test 6: Custom Schema
echo "Test 6: Custom Schema"
echo "---------------------"
curl -s -X POST "$API_URL/scrape-stocks" \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["AAPL"],
    "options": {
      "markdown": false,
      "extract": true,
      "schema": {
        "type": "object",
        "properties": {
          "companyName": { "type": "string" },
          "price": { "type": "number" },
          "currency": { "type": "string" }
        }
      }
    }
  }' | jq .
echo -e "\n"

# Test 7: Invalid Ticker
echo "Test 7: Invalid Ticker (Error Handling)"
echo "----------------------------------------"
curl -s -X POST "$API_URL/scrape-stocks" \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["INVALIDTICKER123"],
    "options": {
      "markdown": true,
      "extract": false
    }
  }' | jq .
echo -e "\n"

echo "========================================="
echo "Test suite completed!"
echo "Check ./output/ directory for markdown files"
echo "========================================="
