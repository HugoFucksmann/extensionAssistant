// src/observability/Logger.ts

// Un Logger básico que envuelve console. Considerar una librería real (winston, pino) para producción.

export class Logger {
    private static instance: Logger;

    private constructor() {
        console.log('[Logger] Initialized.');
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    info(message: string, ...args: any[]): void {
        console.info(`[INFO] ${message}`, ...args);
    }

    warn(message: string, ...args: any[]): void {
        console.warn(`[WARN] ${message}`, ...args);
    }

    error(message: string, ...args: any[]): void {
        console.error(`[ERROR] ${message}`, ...args);
    }

    debug(message: string, ...args: any[]): void {
        // Solo loggear en desarrollo
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }

     dispose(): void {
         console.log('[Logger] Disposed.');
     }
}