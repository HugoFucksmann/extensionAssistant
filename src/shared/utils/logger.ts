import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { EventType } from '../../features/events/eventTypes';

// Instancia única del dispatcher para el logger
const eventDispatcher = new InternalEventDispatcher();

export const logger = {
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
    eventDispatcher.systemError(
      message,
      error instanceof Error ? error : new Error(error?.message || String(error)),
      { stack: error?.stack }
    );
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
    eventDispatcher.systemWarning(message, { data });
  },
  
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
    eventDispatcher.systemInfo(message, { data });
  }
};
