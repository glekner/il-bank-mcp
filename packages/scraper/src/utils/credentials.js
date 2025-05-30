"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCredentials = loadCredentials;
exports.saveCredentials = saveCredentials;
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger");
dotenv_1.default.config();
function loadCredentials() {
    logger_1.logger.info('Loading credentials');
    const username = process.env.BANK_LEUMI_USERNAME;
    const password = process.env.BANK_LEUMI_PASSWORD;
    if (username && password) {
        logger_1.logger.info('Using credentials from environment variables');
        return { username, password };
    }
    const configPath = path_1.default.resolve(process.cwd(), 'config.json');
    if (fs_1.default.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs_1.default.readFileSync(configPath, 'utf8'));
            if (config.bankLeumi && config.bankLeumi.username && config.bankLeumi.password) {
                logger_1.logger.info('Using credentials from config file');
                return {
                    username: config.bankLeumi.username,
                    password: config.bankLeumi.password
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error reading config file', { error });
        }
    }
    logger_1.logger.error('No credentials found in environment variables or config file');
    throw new Error('Bank Leumi credentials not found. Please set BANK_LEUMI_USERNAME and BANK_LEUMI_PASSWORD ' +
        'environment variables or create a config.json file with bankLeumi credentials.');
}
function saveCredentials(credentials) {
    const configPath = path_1.default.resolve(process.cwd(), 'config.json');
    let config = {};
    if (fs_1.default.existsSync(configPath)) {
        try {
            config = JSON.parse(fs_1.default.readFileSync(configPath, 'utf8'));
        }
        catch (error) {
            logger_1.logger.warn('Error reading existing config file, creating new one', { error });
        }
    }
    config.bankLeumi = {
        username: credentials.username,
        password: credentials.password
    };
    try {
        fs_1.default.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        logger_1.logger.info('Credentials saved to config file');
    }
    catch (error) {
        logger_1.logger.error('Error saving credentials to config file', { error });
        throw new Error('Failed to save credentials: ' + (error instanceof Error ? error.message : String(error)));
    }
}
//# sourceMappingURL=credentials.js.map