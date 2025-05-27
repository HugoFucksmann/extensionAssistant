// src/shared/types.ts

import * as vscode from 'vscode';


export interface WindsurfState {
  objective: string;
  userMessage: string;
  chatId: string;
  iterationCount: number;
  maxIterations: number;
  completionStatus: 'in_progress' | 'completed' | 'failed'; // Añadido 'error' para más claridad
  error?: string; // Para almacenar mensajes de error en el estado
  reasoningResult?: ReasoningResult;
  actionResult?: ActionResult;
  reflectionResult?: ReflectionResult;
  correctionResult?: CorrectionResult;
  history: HistoryEntry[];
  projectContext?: any;
  editorContext?: any;
  metrics?: PerformanceMetrics;
  finalOutput?: any; // Campo para la salida final del grafo/agente
  [key: string]: any;
}


export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant' | 'system' | 'tool';
  timestamp: number;
  files?: string[]; // Rutas a archivos adjuntos
  metadata?: {
    processingTime?: number;
    success?: boolean;
    toolName?: string; // Si el mensaje es resultado de una herramienta
    toolInput?: any; // Input de la herramienta
    toolOutput?: any; // Output de la herramienta (para mensajes de 'tool')
    isFinalToolResponse?: boolean; // Para sendResponseToUser
    metrics?: PerformanceMetrics;
    status?: 'info' | 'success' | 'error' | 'thinking' | 'tool_executing' | 'user_input_pending' | 'skipped';
    [key: string]: any;
  };
}


export interface ToolExecution { // Usado en WindsurfState.history.metadata.tools
  name: string;
  status: 'started' | 'completed' | 'error' | 'permission_denied';
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}


export interface PerformanceMetrics {
  totalDuration?: number; // ms
  llmCallCount?: number;
  llmTokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  reasoningTime?: number;
  actionTime?: number;
  reflectionTime?: number;
  toolExecutionCount?: number;
  averageToolTime?: number;
  memoryUsage?: number; // MB
  [key: string]: any;
}


// No se usa directamente en WindsurfState, pero define la estructura de los nodos del grafo
export interface ProcessingStatus {
  phase: string; // Nombre del nodo/fase actual
  status: 'active' | 'completed' | 'inactive' | 'error';
  startTime?: number;
  endTime?: number;
  tools?: ToolExecution[]; // Herramientas ejecutadas en esta fase
  metrics?: PerformanceMetrics;
  error?: string;
}


export interface ReasoningResult {
  reasoning: string; // Pensamiento del LLM
  plan: PlanStep[]; // Plan detallado
  nextAction: NextAction; // Siguiente acción a tomar
  metrics?: PerformanceMetrics;
}


export interface PlanStep {
  id: string;
  stepDescription: string; // Descripción de lo que se hará
  toolToUse?: string; // Herramienta a usar para este paso (opcional)
  expectedOutcome: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  resultSummary?: string; // Resumen del resultado del paso
  startTime?: number;
  endTime?: number;
}

export interface NextAction {
  toolName: string; // Nombre de la herramienta a ejecutar
  params: Record<string, any>; // Parámetros para la herramienta
  thought?: string; // Pensamiento breve sobre por qué esta acción
  // expectedOutcome: string; // Ya está en PlanStep
  // requiredContext?: string[]; // Podría ser útil para el LLM
}


export interface ActionResult { // Resultado de la ejecución de una herramienta
  toolName: string;
  params: Record<string, any>;
  success: boolean;
  result?: any; // Datos retornados por la herramienta
  error?: string;
  timestamp: number;
  metrics?: PerformanceMetrics;
  // execution?: ToolExecution; // Duplicaría la info si ya está en history.metadata.tools
}


export interface ReflectionResult {
  reflection: string; // Evaluación del LLM sobre el paso anterior
  isSuccessfulSoFar: boolean; // ¿El progreso general es bueno?
  confidence?: number; // 0-1
  // evaluationReasons: string[];
  needsCorrection: boolean;
  correctionSuggestion?: string; // Sugerencia para la corrección
  // insights: Insight[];
  metrics?: PerformanceMetrics;
}


// No se usa directamente en WindsurfState, pero define la estructura
export interface Insight {
  id: string;
  type: 'observation' | 'learning' | 'warning' | 'suggestion';
  content: string;
  timestamp: number;
  context?: Record<string, any>;
}


export interface CorrectionResult {
  // needsCorrection: boolean; // Ya está en ReflectionResult
  correctionDescription: string; // Descripción de la corrección aplicada
  // rootCause?: string;
  updatedPlan?: PlanStep[]; // Si el plan cambió
  nextActionAfterCorrection?: NextAction; // Siguiente acción después de corregir
  metrics?: PerformanceMetrics;
}


export interface HistoryEntry extends Omit<ChatMessage, 'id' | 'sender' | 'timestamp' | 'files'> { // Omitir campos que ya están o se manejan diferente
  phase: 'user_input' | 'reasoning' | 'action_planning' | 'action' | 'reflection' | 'correction' | 'responseGeneration' | 'system_message'; // <--- 'responseGeneration' AÑADIDO, 'action_planning' y 'system_message' añadidos para más granularidad
  iteration?: number; // Iteración del ciclo ReAct
  content: string; // Puede ser el input del usuario, el pensamiento del LLM, el resultado de la herramienta, etc.
  timestamp: number; // Sobrescribe el de ChatMessage para asegurar que esté
  metadata: {
    tool_executions?: ToolExecution[]; // Para la fase 'action', lista de herramientas ejecutadas
    llm_metrics?: PerformanceMetrics['llmTokenUsage']; // Métricas específicas del LLM para esta fase
    processingTime?: number; // Tiempo que tomó esta fase específica
    status?: 'success' | 'error' | 'skipped'; // Estado de esta fase
    error_message?: string; // Si la fase tuvo un error
    [key: string]: any; // Para flexibilidad
  };
}


export interface VSCodeContext {
  extensionUri: vscode.Uri;
  extensionPath: string;
  subscriptions: vscode.Disposable[];
  outputChannel: vscode.OutputChannel; // Asegúrate que esto se inicialice y pase
  workspaceFolders?: readonly vscode.WorkspaceFolder[]; // Hacerlo readonly como en la API de VS Code
  activeTextEditor?: vscode.TextEditor;
  globalState: vscode.Memento; // Para estado global de la extensión
  workspaceState: vscode.Memento; // Para estado del workspace
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[]; // Historial de mensajes visibles al usuario
  createdAt: number;
  updatedAt: number;
  metadata?: {
    windsurfState?: WindsurfState; // El estado completo del agente para esta conversación
    [key: string]: any;
  };
}

// No parece usarse directamente, pero es una buena estructura si se necesita
export interface ChatHistory {
  chats: Chat[];
  currentChatId?: string;
  metadata?: {
    [key: string]: any;
  };
}