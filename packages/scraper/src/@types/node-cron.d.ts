declare module "node-cron" {
  export interface ScheduledTask {
    start(): void;
    stop(): void;
    destroy(): void;
  }

  export function schedule(
    expression: string,
    func: () => void,
    options?: {
      scheduled?: boolean;
      timezone?: string;
    }
  ): ScheduledTask;

  export function validate(expression: string): boolean;
}
