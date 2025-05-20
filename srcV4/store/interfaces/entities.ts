/**
 * Interfaces de entidades para el sistema Windsurf
 */

/**
 * Interfaz para mensajes de chat
 */
export interface ChatMessage {
  chatId: string;
  content: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: number;
  files?: string[];
  metadata?: {
    processingTime?: number;
    success?: boolean;
    tools?: ToolExecution[];
    metrics?: PerformanceMetrics;
  };
}

/**
 * Interfaz para ejecución de herramientas
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
 * Interfaz para métricas de rendimiento
 */
export interface PerformanceMetrics {
  totalDuration?: number;
  reasoningTime?: number;
  actionTime?: number;
  reflectionTime?: number;
  toolExecutions?: number;
  averageToolTime?: number;
  memoryUsage?: number;
}

/**
 * Interfaz para el estado de procesamiento
 */
export interface ProcessingStatus {
  phase: string;
  status: 'active' | 'completed' | 'inactive';
  startTime?: number;
  tools: ToolExecution[];
  metrics?: PerformanceMetrics;
}

/**
 * Interfaz para chat
 */
export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Interfaz para historial de chats
 */
export interface ChatHistory {
  chats: Chat[];
}
