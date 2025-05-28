/**
 * Extensiones de tipos para la arquitectura optimizada
 * Proporciona extensiones y utilidades para los tipos existentes
 */

import { HistoryEntry } from './types';

/**
 * Extiende los tipos de fase para la entrada de historial
 * Permite usar fases personalizadas en el motor ReAct optimizado
 */
export type ExtendedHistoryEntryPhase = 
  | HistoryEntry['phase'] // Fases estándar
  | 'analysis'            // Análisis inicial
  | 'tool_execution'      // Ejecución de herramienta
  | 'error'               // Error
  | 'response_generation'; // Generación de respuesta final

/**
 * Función para extender los tipos de fase
 * Utilidad para convertir una fase extendida a una fase estándar
 */
export function extendHistoryEntryPhases(phase: ExtendedHistoryEntryPhase): HistoryEntry['phase'] {
  // Mapeo de fases extendidas a fases estándar
  const phaseMap: Record<string, HistoryEntry['phase']> = {
    'analysis': 'reasoning',
    'tool_execution': 'action',
    'error': 'system_message',
    'response_generation': 'responseGeneration'
  };
  
  // Si la fase ya es una fase estándar, devolverla directamente
  if (isStandardPhase(phase)) {
    return phase;
  }
  
  // Si es una fase extendida, mapearla a una fase estándar
  return phaseMap[phase] || 'system_message';
}

/**
 * Verifica si una fase es una fase estándar
 */
function isStandardPhase(phase: string): phase is HistoryEntry['phase'] {
  const standardPhases: HistoryEntry['phase'][] = [
    'user_input',
    'reasoning',
    'action_planning',
    'action',
    'reflection',
    'correction',
    'responseGeneration',
    'system_message'
  ];
  
  return standardPhases.includes(phase as HistoryEntry['phase']);
}
