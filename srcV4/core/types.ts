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
 * Contexto de la extensión VS Code
 */
export interface VSCodeContext {
  extensionUri: vscode.Uri;
  extensionPath: string;
  subscriptions: vscode.Disposable[];
  outputChannel: vscode.OutputChannel;
}
