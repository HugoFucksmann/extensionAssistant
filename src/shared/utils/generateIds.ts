// Centraliza la generación de identificadores únicos para toda la app
// Se puede ampliar para más tipos de IDs si es necesario
import { randomUUID } from 'node:crypto';

/**
 * Genera un identificador único de operación/herramienta/evento.
 */
export function generateOperationId(): string {
  return randomUUID();
}

/**
 * Alias genérico para casos donde se requiera un ID único.
 */
export function generateUniqueId(): string {
  return randomUUID();
}
