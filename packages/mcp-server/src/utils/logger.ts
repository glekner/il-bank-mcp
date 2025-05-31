export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: "info", message, ...meta }));
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: "warn", message, ...meta }));
  },

  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: "error", message, ...meta }));
  },

  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.DEBUG) {
      console.error(JSON.stringify({ level: "debug", message, ...meta }));
    }
  },
};
