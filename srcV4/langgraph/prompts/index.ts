/**
 * Exporta todos los prompts utilizados en el ReAct Graph
 * Este archivo centraliza el acceso a todos los prompts del grafo ReAct
 */

import { analysisPrompt, analysisParser, AnalysisResponse } from './analysis';
import { planningPrompt, planningParser, PlanningResponse, PlanStep } from './planning';
import { executionPrompt, executionParser, ExecutionResponse } from './execution';
import { reflectionPrompt, reflectionParser, ReflectionResponse, ActionEvaluation } from './reflection';
import { responsePrompt, responseParser } from './response';

/**
 * Tipos de prompts disponibles en el ReAct Graph
 */
export enum ReActPromptType {
  ANALYSIS = 'analysis',
  PLANNING = 'planning',
  EXECUTION = 'execution',
  REFLECTION = 'reflection',
  RESPONSE = 'response'
}

/**
 * Exporta todos los prompts y sus tipos asociados
 */
export {
  // Prompts
  analysisPrompt,
  planningPrompt,
  executionPrompt,
  reflectionPrompt,
  responsePrompt,
  
  // Parsers
  analysisParser,
  planningParser,
  executionParser,
  reflectionParser,
  responseParser,
  
  // Tipos
  AnalysisResponse,
  PlanningResponse,
  PlanStep,
  ExecutionResponse,
  ReflectionResponse,
  ActionEvaluation
};

/**
 * Mapa de todos los prompts del ReAct Graph
 * Facilita el acceso a los prompts por su tipo
 */
export const reactPrompts = {
  [ReActPromptType.ANALYSIS]: analysisPrompt,
  [ReActPromptType.PLANNING]: planningPrompt,
  [ReActPromptType.EXECUTION]: executionPrompt,
  [ReActPromptType.REFLECTION]: reflectionPrompt,
  [ReActPromptType.RESPONSE]: responsePrompt
};

/**
 * Mapa de todos los parsers del ReAct Graph
 * Facilita el acceso a los parsers por su tipo
 */
export const reactParsers = {
  [ReActPromptType.ANALYSIS]: analysisParser,
  [ReActPromptType.PLANNING]: planningParser,
  [ReActPromptType.EXECUTION]: executionParser,
  [ReActPromptType.REFLECTION]: reflectionParser,
  [ReActPromptType.RESPONSE]: responseParser
};
