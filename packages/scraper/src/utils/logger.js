"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createComponentLogger = createComponentLogger;
const winston_1 = __importDefault(require("winston"));
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    defaultMeta: { service: 'bank-scraper' },
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        }),
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error'
        }),
        new winston_1.default.transports.File({
            filename: 'logs/combined.log'
        })
    ]
});
function createComponentLogger(component) {
    return {
        info: (message, meta) => exports.logger.info(message, { component, ...meta }),
        error: (message, meta) => exports.logger.error(message, { component, ...meta }),
        warn: (message, meta) => exports.logger.warn(message, { component, ...meta }),
        debug: (message, meta) => exports.logger.debug(message, { component, ...meta })
    };
}
//# sourceMappingURL=logger.js.map