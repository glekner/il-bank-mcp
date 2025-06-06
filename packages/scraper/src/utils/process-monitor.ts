import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

const execAsync = promisify(exec);

export class ProcessMonitor {
  private static instance: ProcessMonitor;
  private monitorInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CHROME_AGE_MS = 15 * 60 * 1000; // 15 minutes

  private constructor() {}

  static getInstance(): ProcessMonitor {
    if (!ProcessMonitor.instance) {
      ProcessMonitor.instance = new ProcessMonitor();
    }
    return ProcessMonitor.instance;
  }

  startMonitoring(): void {
    if (this.monitorInterval) {
      return; // Already monitoring
    }

    logger.info('Starting Chrome process monitor');

    // Run initial check
    this.checkForHangingProcesses();

    // Schedule periodic checks
    this.monitorInterval = setInterval(() => {
      this.checkForHangingProcesses();
    }, this.CHECK_INTERVAL_MS);
  }

  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      logger.info('Stopped Chrome process monitor');
    }
  }

  private async checkForHangingProcesses(): Promise<void> {
    try {
      // Find Chrome processes older than MAX_CHROME_AGE_MS
      const psCommand = `ps aux | grep -E "(chromium|chrome)" | grep -v grep`;
      const { stdout } = await execAsync(psCommand);

      if (!stdout.trim()) {
        return; // No Chrome processes
      }

      const lines = stdout.trim().split('\n');
      const now = Date.now();

      for (const line of lines) {
        const parts = line.split(/\s+/);
        const pid = parts[1];

        // Get process start time
        const statCommand = `stat -c %Y /proc/${pid}/stat 2>/dev/null || echo 0`;
        try {
          const { stdout: statOutput } = await execAsync(statCommand);
          const startTime = parseInt(statOutput.trim()) * 1000;

          if (startTime > 0) {
            const ageMs = now - startTime;

            if (ageMs > this.MAX_CHROME_AGE_MS) {
              logger.warn('Found hanging Chrome process', {
                pid,
                ageMinutes: Math.round(ageMs / 60000),
              });

              // Kill the process
              await execAsync(`kill -9 ${pid}`);
              logger.info('Killed hanging Chrome process', { pid });
            }
          }
        } catch (error) {
          // Process might have already exited
          logger.debug('Could not check process age', { pid, error });
        }
      }
    } catch (error) {
      logger.error('Error checking for hanging processes', { error });
    }
  }
}
