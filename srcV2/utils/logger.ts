/**
 * Simple logger function for debugging purposes
 * @param message - The message to log
 * @param level - Optional log level ('debug', 'info', 'warn', 'error'), defaults to 'debug'
 */
export function log(message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'debug'): void {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  switch (level) {
    case 'info':
      console.info(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'error':
      console.error(formattedMessage);
      break;
    default: // debug
      console.log(formattedMessage);
  }
}

// Usage examples:
// log("This is a debug message"); // default level
// log("This is an info message", "info");
// log("This is a warning", "warn");
// log("This is an error", "error");