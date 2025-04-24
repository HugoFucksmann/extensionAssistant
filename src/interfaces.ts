/**
 * Interfaz para el componente que maneja la comunicación con la UI
 */
export interface UIProvider {
  sendMessageToWebview(message: any): void;
}

/**
 * Respuesta del agente de modelo
 */
export interface ModelResponse {
  response: string;
  modelType: 'ollama' | 'gemini';
  metadata: any;
}

/**
 * Respuesta del agente de memoria
 */
export interface MemoryResponse {
  userMessage: any;
  assistantMessage: any;
  chatId: string | null;
  metadata: any;
}

/**
 * Respuesta final para la UI
 */
export interface UIResponse {
  message: string;
  isUser: boolean;
  isError?: boolean;
  metadata: any;
}

/**
 * Interfaz base para todos los agentes
 */
export interface Agent<InputType, OutputType> {
  name: string;
  initialize(context?: any): Promise<void>;
  process(input: InputType): Promise<OutputType>;
  dispose(): void;
}
