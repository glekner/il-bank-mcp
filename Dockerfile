# syntax=docker/dockerfile:1.6
ARG NODE_VERSION=24-alpine

# Build stage
FROM node:${NODE_VERSION} AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Enable corepack for Yarn
RUN corepack enable

WORKDIR /app

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY packages/scraper/package.json ./packages/scraper/
COPY packages/mcp-server/package.json ./packages/mcp-server/

# Install dependencies
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --immutable

# Copy source code
COPY . .

# Build all packages
RUN yarn build

# -------------------------------------------------------------------
# Runtime base – shared by scraper & MCP server
# -------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime-base

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Enable corepack for Yarn
RUN corepack enable

WORKDIR /app

# -------------------------------------------------------------------
# Production stage for scraper service
# -------------------------------------------------------------------
FROM runtime-base AS scraper

# Install Chromium and dependencies for Puppeteer (provided by runtime-base stage)

# Copy package structure
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/.yarnrc.yml ./
COPY --from=builder /app/.yarn ./.yarn

# Copy all node_modules (hoisted at root level)
COPY --from=builder /app/node_modules ./node_modules

# Copy scraper package files
COPY --from=builder /app/packages/scraper/package.json ./packages/scraper/
COPY --from=builder /app/packages/scraper/dist ./packages/scraper/dist

# Copy entrypoint script
COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directory
RUN mkdir -p /app/data && chmod 777 /app/data

# Set working directory to scraper package
WORKDIR /app/packages/scraper

# Use entrypoint script
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# -------------------------------------------------------------------
# Production stage for MCP server
# -------------------------------------------------------------------
FROM runtime-base AS mcp-server

# Install Chromium and dependencies for Puppeteer (needed for refresh commands)
# Provided by runtime-base stage

# Copy package structure
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/.yarnrc.yml ./
COPY --from=builder /app/.yarn ./.yarn

# Copy all node_modules (hoisted at root level)
COPY --from=builder /app/node_modules ./node_modules

# Copy both packages (mcp-server depends on scraper)
COPY --from=builder /app/packages/scraper/package.json ./packages/scraper/
COPY --from=builder /app/packages/scraper/dist ./packages/scraper/dist
COPY --from=builder /app/packages/mcp-server/package.json ./packages/mcp-server/
COPY --from=builder /app/packages/mcp-server/dist ./packages/mcp-server/dist

# Set working directory to mcp-server package
WORKDIR /app/packages/mcp-server

# The MCP server will be started via stdio, so we use a simple entrypoint
ENTRYPOINT ["node", "dist/index.js"] 