import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

const execAsync = promisify(exec);

export class ProcessMonitor {
  private static instance: ProcessMonitor;
  private monitorInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 2 * 60 * 1000; // Check every 2 minutes
  private readonly MAX_CHROME_AGE_MS = 10 * 60 * 1000; // Kill Chrome processes older than 10 minutes
  private readonly MAX_MEMORY_MB = 500; // Kill Chrome processes using more than 500MB

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
      // Kill zombie processes first
      await this.killZombieProcesses();

      // Find all Chrome-related processes
      const psCommand = `ps aux | grep -E "(chromium|chrome)" | grep -v grep`;
      const { stdout } = await execAsync(psCommand).catch(() => ({
        stdout: '',
      }));

      if (!stdout.trim()) {
        return; // No Chrome processes
      }

      const lines = stdout.trim().split('\n');
      let killedCount = 0;

      for (const line of lines) {
        const parts = line.split(/\s+/);
        const pid = parts[1];
        const cpu = parseFloat(parts[2]);
        const rss = parseInt(parts[5]); // Resident set size in KB

        // Check for high memory usage
        const memoryMB = rss / 1024;
        if (memoryMB > this.MAX_MEMORY_MB) {
          logger.warn('Found Chrome process with excessive memory usage', {
            pid,
            memoryMB: Math.round(memoryMB),
            cpu: `${cpu}%`,
          });

          try {
            await execAsync(`kill -9 ${pid}`);
            killedCount++;
            logger.info('Killed high-memory Chrome process', {
              pid,
              memoryMB: Math.round(memoryMB),
            });
          } catch (error) {
            logger.debug('Could not kill process', { pid, error });
          }
          continue;
        }

        // Check for old processes
        try {
          // Use ps to get process start time
          const { stdout: etimeOutput } = await execAsync(
            `ps -o etime= -p ${pid} 2>/dev/null || echo "00:00"`
          );
          const etime = etimeOutput.trim();

          // Parse elapsed time (format can be: SS, MM:SS, HH:MM:SS, or DD-HH:MM:SS)
          const ageMs = this.parseElapsedTime(etime);

          if (ageMs > this.MAX_CHROME_AGE_MS) {
            logger.warn('Found old Chrome process', {
              pid,
              ageMinutes: Math.round(ageMs / 60000),
              cpu: `${cpu}%`,
              memoryMB: Math.round(memoryMB),
            });

            await execAsync(`kill -9 ${pid}`);
            killedCount++;
            logger.info('Killed old Chrome process', {
              pid,
              ageMinutes: Math.round(ageMs / 60000),
            });
          }
        } catch (error) {
          // Process might have already exited
          logger.debug('Could not check process age', { pid, error });
        }
      }

      if (killedCount > 0) {
        logger.info('Chrome process cleanup completed', { killedCount });
      }
    } catch (error) {
      logger.error('Error checking for hanging processes', { error });
    }
  }

  private async killZombieProcesses(): Promise<void> {
    try {
      // Find and kill zombie processes
      const { stdout } = await execAsync(
        `ps aux | grep -E "Z|<defunct>" | grep -v grep`
      ).catch(() => ({ stdout: '' }));

      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const parts = line.split(/\s+/);
          const pid = parts[1];

          try {
            await execAsync(`kill -9 ${pid}`);
            logger.info('Killed zombie process', { pid });
          } catch {
            // Zombie might be cleaned up by parent
          }
        }
      }
    } catch (error) {
      logger.debug('Error killing zombie processes', { error });
    }
  }

  private parseElapsedTime(etime: string): number {
    // Parse elapsed time format: SS, MM:SS, HH:MM:SS, or DD-HH:MM:SS
    const parts = etime.split(/[-:]/).reverse();
    const seconds = parseInt(parts[0] || '0');
    const minutes = parseInt(parts[1] || '0');
    const hours = parseInt(parts[2] || '0');
    const days = parseInt(parts[3] || '0');

    return (
      (days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds) * 1000
    );
  }
}
