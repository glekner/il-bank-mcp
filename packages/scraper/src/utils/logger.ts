import winston from 'winston';

// Configure logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'bank-scraper' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Create a custom logger for specific components
export function createComponentLogger(component: string) {
  return {
    info: (message: string, meta?: any) => logger.info(message, { component, ...meta }),
    error: (message: string, meta?: any) => logger.error(message, { component, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { component, ...meta }),
    debug: (message: string, meta?: any) => logger.debug(message, { component, ...meta })
  };
}