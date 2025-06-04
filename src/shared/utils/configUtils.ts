// src/shared/utils/configUtils.ts
import { getConfig } from '../config';

const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const config = getConfig(env);

/**
 * Obtiene la configuración del backend
 */
export function getBackendConfig() {
  return config.backend;
}

/**
 * Obtiene la configuración de React
 */
export function getReactConfig() {
  return getBackendConfig().react;
}

/**
 * Obtiene la configuración de memoria
 */
export function getMemoryConfig() {
  return getBackendConfig().memory;
}

/**
 * Obtiene la configuración de herramientas
 */
export function getToolsConfig() {
  return getBackendConfig().tools;
}

/**
 * Obtiene la configuración de logging
 */
export function getLoggingConfig() {
  return getBackendConfig().logging;
}
