import winston from "winston";
import * as path from "path";
import * as fs from "fs";

// Ensure logs directory exists
const logsDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Container-friendly format that works well with docker logs
const containerFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Human-readable format for local development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, component, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    const componentStr = component ? `[${component}] ` : "";
    return `${timestamp} ${level}: ${componentStr}${message}${metaStr}`;
  })
);

// Use structured logging in containers, pretty logging in development
const isContainer =
  process.env.NODE_ENV === "production" ||
  process.env.DOCKER_CONTAINER === "true";

// Configure logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: containerFormat,
  defaultMeta: {
    service: "bank-scraper",
    version: process.env.npm_package_version || "1.0.0",
  },
  transports: [
    new winston.transports.Console({
      format: isContainer ? containerFormat : developmentFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
    // File logging for persistent storage (optional in containers)
    ...(process.env.DISABLE_FILE_LOGGING !== "true"
      ? [
          new winston.transports.File({
            filename: path.join(logsDir, "error.log"),
            level: "error",
            maxsize: 10485760, // 10MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: path.join(logsDir, "combined.log"),
            maxsize: 10485760, // 10MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
  exitOnError: false,
});

// Create a custom logger for specific components with enhanced context
export function createComponentLogger(component: string) {
  return {
    info: (message: string, meta?: any) =>
      logger.info(message, { component, ...meta }),
    error: (message: string, meta?: any) =>
      logger.error(message, { component, ...meta }),
    warn: (message: string, meta?: any) =>
      logger.warn(message, { component, ...meta }),
    debug: (message: string, meta?: any) =>
      logger.debug(message, { component, ...meta }),
    // Add operation tracking helpers
    startOperation: (operation: string, meta?: any) =>
      logger.info(`Starting ${operation}`, {
        component,
        operation: "start",
        ...meta,
      }),
    endOperation: (operation: string, duration?: number, meta?: any) =>
      logger.info(`Completed ${operation}`, {
        component,
        operation: "complete",
        duration_ms: duration,
        ...meta,
      }),
    errorOperation: (operation: string, error: Error | string, meta?: any) =>
      logger.error(`Failed ${operation}`, {
        component,
        operation: "error",
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        ...meta,
      }),
  };
}

// Performance timing helper
export function createTimer() {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
    end: (message: string, component?: string, meta?: any) => {
      const duration = Date.now() - start;
      logger.info(message, {
        component,
        duration_ms: duration,
        ...meta,
      });
      return duration;
    },
  };
}
