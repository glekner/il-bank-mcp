#!/bin/bash

# Script to validate .env file contains all required variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Required environment variables
REQUIRED_VARS=(
    "BANK_USERNAME"
    "BANK_PASSWORD"
)

# Optional but recommended variables
OPTIONAL_VARS=(
    "SCRAPE_MONTHS_BACK"
    "SCRAPE_EVERY_HOURS"
    "DATABASE_PATH"
    "LOG_LEVEL"
)

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found!"
    print_warning "Creating .env from template..."
    cp env.example .env
    print_error "Please edit .env with your Bank Leumi credentials"
    exit 1
fi

# Source the .env file
set -a
source .env
set +a

# Validate required variables
MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

# Check for missing required variables
if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    print_warning "Please edit .env and set the missing variables"
    exit 1
fi

# Check optional variables
MISSING_OPTIONAL=()
for var in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_OPTIONAL+=("$var")
    fi
done

# Report on optional variables
if [ ${#MISSING_OPTIONAL[@]} -ne 0 ]; then
    print_warning "Missing optional environment variables (defaults will be used):"
    for var in "${MISSING_OPTIONAL[@]}"; do
        echo "  - $var"
    done
    echo ""
fi

# Validate credential format (basic checks)
if [[ ! "$BANK_USERNAME" =~ ^[a-zA-Z0-9]+$ ]]; then
    print_warning "BANK_USERNAME contains special characters - make sure it's correct"
fi

if [ ${#BANK_PASSWORD} -lt 6 ]; then
    print_warning "BANK_PASSWORD seems short - make sure it's correct"
fi

print_success "Environment validation passed!"
print_success "All required variables are set"

# Display configuration summary
echo ""
echo "Configuration Summary:"
echo "  Username: ${BANK_USERNAME:0:3}***"
echo "  Database: ${DATABASE_PATH:-./data/bank.db}"
echo "  Scrape Months: ${SCRAPE_MONTHS_BACK:-3}"
echo "  Log Level: ${LOG_LEVEL:-info}" 