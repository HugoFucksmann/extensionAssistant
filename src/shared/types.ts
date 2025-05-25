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
  
  // Métricas de rendimiento
  metrics?: PerformanceMetrics;
  
  // Cualquier otro dato relevante
  [key: string]: any;
}

/**
 * Mensaje en el historial de chat
 */
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant' | 'system' | 'tool'; // 'system' se usará para feedback
  timestamp: number;
  files?: string[];
  metadata?: {
    processingTime?: number;
    success?: boolean;
    tools?: ToolExecution[];
    metrics?: PerformanceMetrics;
    status?: 'info' | 'success' | 'error' | 'thinking' | 'tool_executing'; // <--- ASEGÚRATE QUE ESTÉ ASÍ O SIMILAR
    [key: string]: any; // Para flexibilidad
  };
}

/**
 * Ejecución de una herramienta
 */
export interface ToolExecution {
  name: string;
  status: 'started' | 'completed' | 'error';
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
}

/**
 * Métricas de rendimiento
 */
export interface PerformanceMetrics {
  totalDuration?: number;
  reasoningTime?: number;
  actionTime?: number;
  reflectionTime?: number;
  toolExecutions?: number;
  averageToolTime?: number;
  memoryUsage?: number;
  [key: string]: any;
}

/**
 * Estado de procesamiento
 */
export interface ProcessingStatus {
  phase: string;
  status: 'active' | 'completed' | 'inactive' | 'error';
  startTime?: number;
  endTime?: number;
  tools: ToolExecution[];
  metrics?: PerformanceMetrics;
  error?: string;
}

/**
 * Resultado de la fase de razonamiento
 */
export interface ReasoningResult {
  reasoning: string;
  plan: PlanStep[];
  nextAction: NextAction;
  metrics?: PerformanceMetrics;
}

/**
 * Paso del plan generado en la fase de razonamiento
 */
export interface PlanStep {
  id: string;
  step: string;
  rationale: string;
  isCompleted?: boolean;
  result?: any;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
}

/**
 * Siguiente acción a ejecutar
 */
export interface NextAction {
  toolName: string;
  params: Record<string, any>;
  expectedOutcome: string;
  requiredContext?: string[];
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
  metrics?: PerformanceMetrics;
  execution?: ToolExecution;
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
  metrics?: PerformanceMetrics;
}

/**
 * Insight generado durante la reflexión
 */
export interface Insight {
  id: string;
  type: 'observation' | 'learning' | 'warning' | 'suggestion';
  content: string;
  timestamp: number;
  context?: Record<string, any>;
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
  metrics?: PerformanceMetrics;
}

/**
 * Entrada en el historial del agente
 */
export interface HistoryEntry extends Omit<ChatMessage, 'metadata'> {
  phase: 'reasoning' | 'action' | 'reflection' | 'correction' | 'user_input' | 'system';
  iteration: number;
  metadata: { // <--- ASEGÚRATE QUE HistoryEntry TAMBIÉN PUEDA TENER status SI ES NECESARIO
    processingTime?: number;
    success?: boolean;
    tools?: ToolExecution[];
    metrics?: PerformanceMetrics;
    status?: 'info' | 'success' | 'error' | 'thinking' | 'tool_executing'; // <--- AÑADIR/MODIFICAR
    [key: string]: any;
  };
}

// Tipos relacionados con herramientas han sido movidos a src/features/tools/types.ts
// Importa los tipos desde allí cuando los necesites

/**
 * Contexto de la extensión VS Code
 */
export interface VSCodeContext {
  extensionUri: vscode.Uri;
  extensionPath: string;
  subscriptions: vscode.Disposable[];
  outputChannel: vscode.OutputChannel;
  workspaceFolders?: vscode.WorkspaceFolder[];
  activeTextEditor?: vscode.TextEditor;
  state: vscode.Memento;
}

/**
 * Estado de un chat
 */
export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Historial de chats
 */
export interface ChatHistory {
  chats: Chat[];
  currentChatId?: string;
  metadata?: {
    [key: string]: any;
  };
}
