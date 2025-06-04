// src/shared/utils/logger.ts
import { getConfig } from '../config';
import * as vscode from 'vscode';

let outputChannel: { appendLine: (msg: string) => void } | undefined;


const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';


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

  const extensionConfig = vscode.workspace.getConfiguration('extensionAssistant');
  const configuredLogLevel = extensionConfig.get<keyof typeof LOG_LEVELS>('backend.logging.level', 'info');
  const logToConsoleEnabled = extensionConfig.get<boolean>('backend.logging.logToConsole', true);

  const baseConfigForFile = getConfig(env);
  const logToFileEnabled = baseConfigForFile.backend.logging.logToFile;


  const formatted = `[${level.toUpperCase()}] ${message}`;


  if (LOG_LEVELS[level as keyof typeof LOG_LEVELS] < LOG_LEVELS[configuredLogLevel]) {
    return;
  }

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


  if (logToFileEnabled) {

  }
}

export const logger = {
  debug: (message: string, ...args: any[]) => {

    logToAllChannels('debug', message, ...args);
  },
  info: (message: string, ...args: any[]) => {
    logToAllChannels('info', message, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    logToAllChannels('warn', message, ...args);
  },
  error: (message: string, ...args: any[]) => {

    logToAllChannels('error', message, ...args);
  }
};