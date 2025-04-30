export interface Logger {
  info(message: string, context?: object): void;
  warn(message: string, context?: object): void;
  error(message: string, context?: object): void;
}

export class ConsoleLogger implements Logger {
  info(message: string, context?: object): void {
    if (context) {
      console.info(`[INFO] ${message}`, JSON.stringify(context, null, 2));
    } else {
      console.info(`[INFO] ${message}`);
    }
  }

  warn(message: string, context?: object): void {
    if (context) {
      console.warn(`[WARN] ${message}`, JSON.stringify(context, null, 2));
    } else {
      console.warn(`[WARN] ${message}`);
    }
  }

  error(message: string, context?: object): void {
    if (context) {
      console.error(`[ERROR] ${message}`, JSON.stringify(context, null, 2));
    } else {
      console.error(`[ERROR] ${message}`);
    }
  }
}

// Instancia global reutilizable
export const logger = new ConsoleLogger();
