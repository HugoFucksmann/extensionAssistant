/**
 * Punto de entrada para la integración de LangGraph con la arquitectura Windsurf
 * Este archivo exporta las clases y funciones necesarias para utilizar LangGraph
 */

// Importar WindsurfGraph directamente si es el único componente relevante aquí
// o si windsurfGraph.ts no está en esta misma carpeta, ajustar la ruta.
// Asumiendo que windsurfGraph.ts está en la misma carpeta 'langgraph':
import { WindsurfGraph } from '../agents/windsurfGraph';


// Exportar todos los componentes necesarios para utilizar LangGraph
export {
  // Clases principales
  WindsurfGraph,
  // Ya no exportamos ReActState, ReActGraphResult, etc. de langgraph/types.ts
  // Esos tipos estaban asociados con la implementación manual.
  // Los tipos relevantes ahora son WindsurfState, etc., desde core/types.ts
};

// Ya no necesitamos createReActGraph, createInitialReActState, addIntermediateStep
// porque estaban ligados a la implementación manual.