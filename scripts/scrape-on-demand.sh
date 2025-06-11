#!/bin/bash

# Script to run on-demand bank data scraping

echo "🏦 Starting on-demand bank data scrape..."

# Check if docker-compose file exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Run this script from the project root."
    exit 1
fi

# Run the scraper using docker-compose
docker-compose run --rm --profile tools scraper node dist/cli.js scrape

if [ $? -eq 0 ]; then
    echo "✅ Scraping completed successfully!"
else
    echo "❌ Scraping failed. Check logs with: docker-compose logs scraper"
    exit 1
fi 