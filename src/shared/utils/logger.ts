// src/shared/utils/logger.ts
import { getConfig } from '../config';


let outputChannel: { appendLine: (msg: string) => void } | undefined;

const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const currentConfig = getConfig(env);
const configuredLogLevel = currentConfig.backend.logging.level;
const logToConsoleEnabled = currentConfig.backend.logging.logToConsole;

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function setLoggerOutputChannel(oc: { appendLine: (msg: string) => void }) {
  outputChannel = oc;
}

function logToAllChannels(level: string, message: string, ...args: any[]) {
  const formatted = `[${level.toUpperCase()}] ${message}`;
  if (logToConsoleEnabled) {
    switch (level) {
      case 'debug':
        console.debug(formatted, ...args);
        break;
      case 'info':
        console.log(formatted, ...args);
        break;
      case 'warn':
        console.warn(formatted, ...args);
        break;
      case 'error':
        console.error(formatted, ...args);
        break;
    }
  }
  if (outputChannel) {
    outputChannel.appendLine(formatted + (args.length ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : ''));
  }
}

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (LOG_LEVELS.debug >= LOG_LEVELS[configuredLogLevel]) {
      logToAllChannels('debug', message, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (LOG_LEVELS.info >= LOG_LEVELS[configuredLogLevel]) {
      logToAllChannels('info', message, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (LOG_LEVELS.warn >= LOG_LEVELS[configuredLogLevel]) {
      logToAllChannels('warn', message, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    logToAllChannels('error', message, ...args);
  }
};