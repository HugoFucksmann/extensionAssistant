// src/shared/utils/logger.ts
import { getConfig } from '../config'; // Se mantiene para la configuración base si es necesario, pero la de VSCode tendrá precedencia para niveles y consola.
import * as vscode from 'vscode'; // <--- AÑADIR IMPORTACIÓN DE VSCODE

let outputChannel: { appendLine: (msg: string) => void } | undefined;

// La configuración inicial de 'env' y 'currentConfig' puede usarse para 'logToFile' si esa configuración no viene de VSCode.
const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
// const currentConfig = getConfig(env); // Comentado o eliminado si toda la config de logging viene de VSCode
// const configuredLogLevel = currentConfig.backend.logging.level; // Se leerá dinámicamente
// const logToConsoleEnabled = currentConfig.backend.logging.logToConsole; // Se leerá dinámicamente

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
  // Leer configuración de VSCode dinámicamente
  const extensionConfig = vscode.workspace.getConfiguration('extensionAssistant');
  const configuredLogLevel = extensionConfig.get<keyof typeof LOG_LEVELS>('backend.logging.level', 'info');
  const logToConsoleEnabled = extensionConfig.get<boolean>('backend.logging.logToConsole', true);
  // Para logToFile, podríamos seguir usando la config.ts o también moverla a settings de VSCode
  const baseConfigForFile = getConfig(env); // Usar config.ts para logToFile por ahora
  const logToFileEnabled = baseConfigForFile.backend.logging.logToFile;


  const formatted = `[${level.toUpperCase()}] ${message}`;

  // Comprobar si el nivel actual permite este log
  if (LOG_LEVELS[level as keyof typeof LOG_LEVELS] < LOG_LEVELS[configuredLogLevel]) {
    return; // Nivel de log actual es más alto, no loguear este mensaje
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

  // La lógica para logToFile no está implementada aquí, pero si lo estuviera, usaría logToFileEnabled
  if (logToFileEnabled) {
    // Aquí iría la lógica para escribir a un archivo de log
    // console.log(`(Simulación) Escribiendo a archivo: ${formatted}`);
  }
}

export const logger = {
  debug: (message: string, ...args: any[]) => {
    // La comprobación de nivel se hace ahora dentro de logToAllChannels
    logToAllChannels('debug', message, ...args);
  },
  info: (message: string, ...args: any[]) => {
    logToAllChannels('info', message, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    logToAllChannels('warn', message, ...args);
  },
  error: (message: string, ...args: any[]) => {
    // Los errores siempre se loguean, la comprobación de nivel en logToAllChannels los filtrará si es necesario (aunque error suele ser >= cualquier nivel)
    logToAllChannels('error', message, ...args);
  }
};