/**
 * Gestor de modelos para la arquitectura Windsurf
 * Maneja la interacción con diferentes proveedores de modelos de lenguaje
 */

import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ChatGoogleGenerativeAI } from 'langchain/chat_models/googleai';
import { ChatOllama } from 'langchain/chat_models/ollama';
import { BaseChatModel } from 'langchain/chat_models/base';
import { HumanMessage, SystemMessage } from 'langchain/schema';
import { PromptTemplate } from 'langchain/prompts';

/**
 * Tipo de proveedor de modelo
 */
export type ModelProvider = 'openai' | 'gemini' | 'ollama' | 'anthropic';

/**
 * Configuración para un modelo
 */
export interface ModelConfig {
  provider: ModelProvider;
  modelName: string;
  temperature: number;
  maxTokens?: number;
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Gestor centralizado de modelos
 * Proporciona una interfaz unificada para interactuar con diferentes modelos de lenguaje
 */
export class ModelManager {
  private models: Map<ModelProvider, BaseChatModel>;
  private activeProvider: ModelProvider;
  private config: Record<ModelProvider, ModelConfig>;
  
  constructor() {
    this.models = new Map();
    this.config = {
      openai: {
        provider: 'openai',
        modelName: 'gpt-3.5-turbo',
        temperature: 0.2
      },
      gemini: {
        provider: 'gemini',
        modelName: 'gemini-pro',
        temperature: 0.2
      },
      ollama: {
        provider: 'ollama',
        modelName: 'llama3',
        temperature: 0.2,
        baseUrl: 'http://localhost:11434'
      },
      anthropic: {
        provider: 'anthropic',
        modelName: 'claude-3-opus',
        temperature: 0.2
      }
    };
    
    // Por defecto, usar Gemini (como en la implementación actual)
    this.activeProvider = 'gemini';
    
    this.initializeModels();
    console.log(`[ModelManager] Initialized with active provider: ${this.activeProvider}`);
  }
  
  /**
   * Inicializa los modelos configurados
   */
  private initializeModels(): void {
    try {
      // Inicializar OpenAI si hay una API key
      if (process.env.OPENAI_API_KEY) {
        this.models.set('openai', new ChatOpenAI({
          modelName: this.config.openai.modelName,
          temperature: this.config.openai.temperature,
          maxTokens: this.config.openai.maxTokens
        }));
      }
      
      // Inicializar Gemini si hay una API key
      if (process.env.GOOGLE_API_KEY) {
        this.models.set('gemini', new ChatGoogleGenerativeAI({
          modelName: this.config.gemini.modelName,
          temperature: this.config.gemini.temperature,
          maxOutputTokens: this.config.gemini.maxTokens,
          apiKey: process.env.GOOGLE_API_KEY
        }));
      }
      
      // Inicializar Ollama (local, no requiere API key)
      try {
        this.models.set('ollama', new ChatOllama({
          model: this.config.ollama.modelName,
          temperature: this.config.ollama.temperature,
          baseUrl: this.config.ollama.baseUrl
        }));
      } catch (error) {
        console.warn('[ModelManager] Failed to initialize Ollama:', error.message);
      }
      
      // Verificar que al menos un modelo está disponible
      if (this.models.size === 0) {
        throw new Error('No models available. Please configure at least one model provider.');
      }
      
      // Establecer el proveedor activo basado en disponibilidad
      if (!this.models.has(this.activeProvider)) {
        this.activeProvider = Array.from(this.models.keys())[0];
      }
    } catch (error) {
      console.error('[ModelManager] Error initializing models:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene el modelo activo
   */
  private getActiveModel(): BaseChatModel {
    const model = this.models.get(this.activeProvider);
    if (!model) {
      throw new Error(`Active model provider '${this.activeProvider}' not available`);
    }
    return model;
  }
  
  /**
   * Cambia el proveedor de modelo activo
   * @param provider Nuevo proveedor a utilizar
   */
  public setActiveProvider(provider: ModelProvider): void {
    if (!this.models.has(provider)) {
      throw new Error(`Model provider '${provider}' not available`);
    }
    this.activeProvider = provider;
    console.log(`[ModelManager] Active provider changed to: ${provider}`);
  }
  
  /**
   * Configura un proveedor de modelo
   * @param provider Proveedor a configurar
   * @param config Nueva configuración
   */
  public configureProvider(provider: ModelProvider, config: Partial<ModelConfig>): void {
    this.config[provider] = { ...this.config[provider], ...config };
    
    // Reinicializar el modelo con la nueva configuración
    this.initializeModels();
    console.log(`[ModelManager] Provider '${provider}' reconfigured`);
  }
  
  /**
   * Genera una respuesta utilizando el modelo activo
   * @param prompt Plantilla de prompt o texto del prompt
   * @param values Valores para formatear el prompt (si es una plantilla)
   * @returns Respuesta generada por el modelo
   */
  public async generateResponse(
    prompt: string | PromptTemplate,
    values?: Record<string, any>
  ): Promise<string> {
    try {
      const model = this.getActiveModel();
      
      // Formatear el prompt si es una plantilla
      let formattedPrompt: string;
      if (typeof prompt === 'string') {
        formattedPrompt = prompt;
      } else {
        formattedPrompt = await prompt.format(values || {});
      }
      
      // Crear los mensajes para el modelo
      const messages = [
        new SystemMessage(formattedPrompt)
      ];
      
      // Invocar el modelo
      const response = await model.invoke(messages);
      
      return response.content as string;
    } catch (error) {
      console.error('[ModelManager] Error generating response:', error);
      throw error;
    }
  }
  
  /**
   * Genera texto para LangGraph utilizando el modelo especificado
   * @param promptText Texto del prompt ya formateado
   * @param modelName Nombre del modelo a utilizar (opcional, usa el activo por defecto)
   * @returns Respuesta generada por el modelo
   */
  public async generateText(promptText: string, modelName?: string): Promise<string> {
    try {
      // Si se especifica un modelo diferente, intentar usarlo temporalmente
      let originalProvider: ModelProvider | null = null;
      if (modelName) {
        // Buscar el proveedor que tiene este modelo
        for (const [provider, config] of Object.entries(this.config)) {
          if (config.modelName === modelName && this.models.has(provider as ModelProvider)) {
            originalProvider = this.activeProvider;
            this.activeProvider = provider as ModelProvider;
            break;
          }
        }
      }
      
      // Crear los mensajes para el modelo
      const messages = [
        new SystemMessage(promptText)
      ];
      
      // Invocar el modelo
      const model = this.getActiveModel();
      const response = await model.invoke(messages);
      
      // Restaurar el proveedor original si fue cambiado
      if (originalProvider) {
        this.activeProvider = originalProvider;
      }
      
      return response.content as string;
    } catch (error) {
      console.error('[ModelManager] Error generating text for LangGraph:', error);
      throw error;
    }
  }
  
  /**
   * Genera una respuesta en formato de chat
   * @param systemPrompt Instrucción del sistema
   * @param userMessage Mensaje del usuario
   * @param chatHistory Historial de chat previo (opcional)
   * @returns Respuesta generada por el modelo
   */
  public async generateChatResponse(
    systemPrompt: string,
    userMessage: string,
    chatHistory: Array<{ role: 'user' | 'assistant' | 'system', content: string }> = []
  ): Promise<string> {
    try {
      const model = this.getActiveModel();
      
      // Convertir el historial de chat al formato de LangChain
      const messages = [
        new SystemMessage(systemPrompt),
        ...chatHistory.map(msg => {
          if (msg.role === 'user') {
            return new HumanMessage(msg.content);
          } else if (msg.role === 'assistant') {
            return new SystemMessage(msg.content);
          } else {
            return new SystemMessage(msg.content);
          }
        }),
        new HumanMessage(userMessage)
      ];
      
      // Invocar el modelo
      const response = await model.invoke(messages);
      
      return response.content as string;
    } catch (error) {
      console.error('[ModelManager] Error generating chat response:', error);
      throw error;
    }
  }
}
