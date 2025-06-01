import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from './logger';

/**
 * Get the Chrome executable path installed by puppeteer
 */
export function getChromeExecutablePath(): string | undefined {
  // First check if we're in a Docker container with system-installed Chrome
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && fs.existsSync(envPath)) {
    logger.info('Using Chrome from environment variable', { path: envPath });
    return envPath;
  }

  const cacheDir = path.join(os.homedir(), '.cache', 'puppeteer', 'chrome');

  try {
    if (fs.existsSync(cacheDir)) {
      const chromeDirs = fs.readdirSync(cacheDir);

      for (const dir of chromeDirs) {
        const platform = process.platform;
        let executablePath: string;

        if (platform === 'darwin') {
          // macOS path
          executablePath = path.join(
            cacheDir,
            dir,
            fs.readdirSync(path.join(cacheDir, dir))[0],
            'Google Chrome for Testing.app',
            'Contents',
            'MacOS',
            'Google Chrome for Testing'
          );
        } else if (platform === 'win32') {
          // Windows path
          executablePath = path.join(
            cacheDir,
            dir,
            fs.readdirSync(path.join(cacheDir, dir))[0],
            'chrome.exe'
          );
        } else {
          // Linux path
          executablePath = path.join(
            cacheDir,
            dir,
            fs.readdirSync(path.join(cacheDir, dir))[0],
            'chrome'
          );
        }

        if (fs.existsSync(executablePath)) {
          return executablePath;
        }
      }
    }
  } catch (error) {
    logger.error('Error finding Chrome executable', { error });
  }

  return undefined;
}
