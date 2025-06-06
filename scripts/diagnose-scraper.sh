#!/bin/bash

# Diagnostic script for Bank Scraper container issues

echo "======================================"
echo "Bank Scraper Container Diagnostics"
echo "======================================"
echo ""

# Check if container is running
echo "1. Container Status:"
docker ps -a | grep bank-scraper || echo "Container not found"
echo ""

# Check container logs
echo "2. Recent Container Logs (last 50 lines):"
docker logs --tail 50 bank-scraper 2>&1 | tail -20
echo ""

# Check for Chrome processes inside container
echo "3. Chrome Processes in Container:"
docker exec bank-scraper ps aux | grep -E "(chrome|chromium)" | grep -v grep || echo "No Chrome processes found"
echo ""

# Check container resource usage
echo "4. Container Resource Usage:"
docker stats --no-stream bank-scraper
echo ""

# Check for zombie processes
echo "5. Zombie Processes:"
docker exec bank-scraper ps aux | grep -E "Z|<defunct>" || echo "No zombie processes found"
echo ""

# Check error logs
echo "6. Recent Error Logs:"
docker exec bank-scraper sh -c 'cat /app/packages/scraper/logs/error.log 2>/dev/null | tail -20' || echo "No error log file found"
echo ""

# Check disk space
echo "7. Container Disk Usage:"
docker exec bank-scraper df -h /app/data
echo ""

# Check environment variables
echo "8. Key Environment Variables:"
docker exec bank-scraper sh -c 'echo "LOG_LEVEL=$LOG_LEVEL"'
docker exec bank-scraper sh -c 'echo "SCRAPE_EVERY_HOURS=$SCRAPE_EVERY_HOURS"'
docker exec bank-scraper sh -c 'echo "SCRAPE_TIMEOUT_MINUTES=$SCRAPE_TIMEOUT_MINUTES"'
echo ""

# Suggestions
echo "======================================"
echo "Troubleshooting Suggestions:"
echo "======================================"
echo "1. If Chrome processes are hanging:"
echo "   docker restart bank-scraper"
echo ""
echo "2. To watch live logs:"
echo "   docker logs -f bank-scraper"
echo ""
echo "3. To manually kill Chrome processes:"
echo "   docker exec bank-scraper pkill -f chromium"
echo ""
echo "4. To check detailed logs in JSON format:"
echo "   docker logs bank-scraper 2>&1 | jq '.'"
echo "" 