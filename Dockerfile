# Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY packages/scraper/package.json ./packages/scraper/
COPY packages/mcp-server/package.json ./packages/mcp-server/

# Install dependencies
RUN yarn install --immutable

# Copy source code
COPY . .

# Build all packages
RUN yarn build

# Production stage for scraper service
FROM node:20-alpine AS scraper

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/scraper/node_modules ./packages/scraper/node_modules
COPY --from=builder /app/packages/scraper/dist ./packages/scraper/dist
COPY --from=builder /app/packages/scraper/package.json ./packages/scraper/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/.yarnrc.yml ./
COPY --from=builder /app/.yarn ./.yarn

# Copy entrypoint script
COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directory
RUN mkdir -p /app/data && chmod 777 /app/data

# Set working directory to scraper package
WORKDIR /app/packages/scraper

# Use entrypoint script
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]

# Production stage for MCP server
FROM node:20-alpine AS mcp-server

WORKDIR /app

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/mcp-server/node_modules ./packages/mcp-server/node_modules
COPY --from=builder /app/packages/mcp-server/dist ./packages/mcp-server/dist
COPY --from=builder /app/packages/scraper/dist ./packages/scraper/dist
COPY --from=builder /app/packages/mcp-server/package.json ./packages/mcp-server/
COPY --from=builder /app/packages/scraper/package.json ./packages/scraper/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/.yarnrc.yml ./
COPY --from=builder /app/.yarn ./.yarn

# Set working directory to mcp-server package
WORKDIR /app/packages/mcp-server

# The MCP server will be started via stdio, so we use a simple entrypoint
ENTRYPOINT ["node", "dist/index.js"] 