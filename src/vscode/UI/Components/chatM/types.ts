export interface BaseMessage {
  id: string
  content: string
  sender: "user" | "assistant" | "system" | "feedback"
  timestamp: number
  operationId?: string
  files?: string[]
}

export interface MessageMetadata {
  status?: "info" | "success" | "error" | "thinking" | "tool_executing" | "user_input_pending" | "skipped" | "processing_tool_result" | "phase_started" | "phase_completed"
  toolName?: string
  toolInput?: Record<string, any>
  toolOutput?: any
  success?: boolean
  processingTime?: number
  phase?: string
  isFinalToolResponse?: boolean
  iteration?: number
  source?: string
  phaseData?: any
  details?: any
  errorObject?: any
  level?: 'info' | 'warning' | 'error'
  rawToolOutput?: any
  modelAnalysis?: any
  toolSuccess?: boolean
  toolError?: string
  [key: string]: any
}

export interface ChatMessage extends BaseMessage {
  metadata?: MessageMetadata
}

export interface ToolState {
  status: "processing" | "completed" | "error"
  toolName: string
  input?: Record<string, any>
  output?: any
  error?: string
  processingTime?: number
}
