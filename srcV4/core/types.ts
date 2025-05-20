/**
 * Tipos centrales para la arquitectura Windsurf
 * Define las interfaces y tipos principales utilizados en todo el sistema
 */

import * as vscode from 'vscode';

/**
 * Estado del agente Windsurf
 * Contiene toda la información sobre el estado actual del ciclo ReAct
 */
export interface WindsurfState {
  // Información sobre el objetivo y contexto
  objective: string;
  userMessage: string;
  chatId: string;
  
  // Estado del ciclo ReAct
  iterationCount: number;
  maxIterations: number;
  completionStatus: 'in_progress' | 'completed' | 'failed';
  
  // Resultados de cada fase
  reasoningResult?: ReasoningResult;
  actionResult?: ActionResult;
  reflectionResult?: ReflectionResult;
  correctionResult?: CorrectionResult;
  
  // Historial y logs
  history: HistoryEntry[];
  
  // Contexto del proyecto y editor
  projectContext?: any;
  editorContext?: any;
  
  // Cualquier otro dato relevante
  [key: string]: any;
}

/**
 * Resultado de la fase de razonamiento
 */
export interface ReasoningResult {
  reasoning: string;
  plan: PlanStep[];
  nextAction: NextAction;
}

/**
 * Paso del plan generado en la fase de razonamiento
 */
export interface PlanStep {
  step: string;
  rationale: string;
  isCompleted?: boolean;
  result?: any;
}

/**
 * Siguiente acción a ejecutar
 */
export interface NextAction {
  toolName: string;
  params: Record<string, any>;
  expectedOutcome: string;
}

/**
 * Resultado de la fase de acción
 */
export interface ActionResult {
  toolName: string;
  params: Record<string, any>;
  success: boolean;
  result?: any;
  error?: string;
  timestamp: number;
}

/**
 * Resultado de la fase de reflexión
 */
export interface ReflectionResult {
  reflection: string;
  isSuccessful: boolean;
  confidence: number;
  evaluationReasons: string[];
  needsCorrection: boolean;
  correctionStrategy?: string;
  insights: Insight[];
}

/**
 * Insight generado durante la reflexión
 */
export interface Insight {
  type: 'observation' | 'learning' | 'warning';
  content: string;
}

/**
 * Resultado de la fase de corrección
 */
export interface CorrectionResult {
  needsCorrection: boolean;
  correctionDescription?: string;
  rootCause?: string;
  updatedPlan?: PlanStep[];
  nextAction?: NextAction;
}

/**
 * Entrada en el historial del agente
 */
export interface HistoryEntry {
  phase: 'reasoning' | 'action' | 'reflection' | 'correction';
  timestamp: number;
  data: any;
  iteration: number;
}

/**
 * Herramienta que puede ser ejecutada por el agente
 */
export interface WindsurfTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

/**
 * Definición de una herramienta con esquema detallado
 */
export interface Tool<P = any, R = any> {
  name: string;
  description: string;
  execute: (params: P) => Promise<ToolResult<R>>;
  schema: {
    parameters: Record<string, ParameterDefinition>;
    returns: Record<string, any>;
  };
}

/**
 * Definición de un parámetro para una herramienta
 */
export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
  
  // Validación para valores enuméricos
  enum?: any[];
  
  // Validación para números
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  multipleOf?: number;
  
  // Validación para strings
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string; // email, date-time, uri, etc.
  
  // Validación para arrays
  items?: ParameterDefinition | ParameterDefinition[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // Validación para objetos
  properties?: Record<string, ParameterDefinition>;
  additionalProperties?: boolean | ParameterDefinition;
  requiredProperties?: string[];
}

/**
 * Resultado genérico de una herramienta
 */
export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Contexto de la extensión VS Code
 */
export interface VSCodeContext {
  extensionUri: vscode.Uri;
  extensionPath: string;
  subscriptions: vscode.Disposable[];
  outputChannel: vscode.OutputChannel;
}
