/**
 * Punto de entrada para la integración de LangGraph con la arquitectura Windsurf
 * Este archivo exporta las clases y funciones necesarias para utilizar LangGraph
 */

import { ReActGraph, createReActGraph } from './reactGraph';
import {
  ReActState,
  ReActGraphResult,
  IntermediateStep,
  ConversationHistory,
  ReActNodeFunction,
  ReActEdgeFunction,
  createInitialReActState,
  addIntermediateStep
} from './types';

// Exportar todos los componentes necesarios para utilizar LangGraph
export {
  // Clases principales
  ReActGraph,
  
  // Tipos
  ReActState,
  ReActGraphResult,
  IntermediateStep,
  ConversationHistory,
  ReActNodeFunction,
  ReActEdgeFunction,
  
  // Funciones de utilidad
  createReActGraph,
  createInitialReActState,
  addIntermediateStep
};
