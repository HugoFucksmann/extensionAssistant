// src/features/ai/ModelManager.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage, BaseMessage, AIMessage } from '@langchain/core/messages';
import { PromptTemplate as CorePromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';
import * as vscode from 'vscode';

export type ModelProvider = 'gemini' | 'ollama';

export interface ModelConfig {
  provider: ModelProvider;
  modelName: string;
  temperature: number;
  maxTokens?: number;
  apiKey?: string;
  baseUrl?: string;
}

export class ModelManager {
  private models: Map<ModelProvider, BaseChatModel>;
  private activeProvider: ModelProvider;
  private config: Record<ModelProvider, ModelConfig>;
  private configChangeDisposable: vscode.Disposable;

  constructor(defaultProvider: ModelProvider = 'gemini') {
    this.models = new Map();
    this.config = this.loadConfiguration();
    this.activeProvider = this.isProviderAvailable(defaultProvider) ? defaultProvider : 'ollama';
    this.initializeModels();
    console.log(`[ModelManager] Inicializado con proveedor activo: ${this.activeProvider}`);

    // Escuchar cambios en la configuración
    this.configChangeDisposable = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('extensionAssistant')) {
        console.log('[ModelManager] Configuración cambiada, reinicializando modelos...');
        this.config = this.loadConfiguration();
        this.initializeModels();
      }
    });
  }

  private isProviderAvailable(provider: ModelProvider): boolean {
    if (provider === 'gemini') {
      return !!this.config.gemini.apiKey;
    }
    return true; // Ollama siempre está disponible si está en ejecución
  }

  private loadConfiguration(): Record<ModelProvider, ModelConfig> {
    const config = vscode.workspace.getConfiguration('extensionAssistant');
    
    return {
      gemini: {
        provider: 'gemini',
        modelName: config.get<string>('google.modelName') || 'gemini-pro',
        temperature: config.get<number>('google.temperature') ?? 0.2,
        maxTokens: config.get<number>('google.maxTokens') || 4096,
        apiKey: config.get<string>('google.apiKey') || process.env.GOOGLE_API_KEY,
      },
      ollama: {
        provider: 'ollama',
        modelName: config.get<string>('ollama.modelName') || 'llama3',
        temperature: config.get<number>('ollama.temperature') ?? 0.2,
        baseUrl: config.get<string>('ollama.baseUrl') || 'http://localhost:11434',
        maxTokens: config.get<number>('ollama.maxTokens') || 4096,
      }
    };
  }

  public dispose(): void {
    this.configChangeDisposable.dispose();
  }

  private initializeModels(): void {
    this.models.clear();

    try {
      // Inicializar Gemini si hay API key
      if (this.config.gemini.apiKey) {
        this.models.set('gemini', new ChatGoogleGenerativeAI({
          model: this.config.gemini.modelName,
          temperature: this.config.gemini.temperature,
          maxOutputTokens: this.config.gemini.maxTokens,
          apiKey: this.config.gemini.apiKey,
        }));
        console.log('[ModelManager] Gemini inicializado correctamente');
      } else {
        console.warn("[ModelManager] Clave de API de Google no proporcionada. Gemini desactivado.");
      }

      // Inicializar Ollama
      try {
        this.models.set('ollama', new ChatOllama({
          model: this.config.ollama.modelName,
          temperature: this.config.ollama.temperature,
          baseUrl: this.config.ollama.baseUrl,
        }));
        console.log('[ModelManager] Ollama inicializado correctamente');
      } catch (error: any) {
        console.warn('[ModelManager] No se pudo conectar con Ollama. ¿Está en ejecución?', error.message);
      }

      // Actualizar proveedor activo si el actual no está disponible
      if (!this.models.has(this.activeProvider) && this.models.size > 0) {
        const availableProvider = Array.from(this.models.keys())[0];
        console.warn(`[ModelManager] Proveedor activo ${this.activeProvider} no disponible. Cambiando a ${availableProvider}`);
        this.activeProvider = availableProvider;
      }

      if (this.models.size === 0) {
        console.error('[ModelManager] No hay modelos disponibles. Configura Ollama o proporciona una clave de API de Google.');
      }

    } catch (error: any) {
      console.error('[ModelManager] Error al inicializar modelos:', error);
    }
  }

  private getActiveModel(): BaseChatModel {
    const model = this.models.get(this.activeProvider);
    if (!model) {
      if (this.models.size > 0) {
        const fallbackProvider = Array.from(this.models.keys())[0];
        console.warn(`[ModelManager] El proveedor '${this.activeProvider}' no está disponible. Usando '${fallbackProvider}'.`);
        this.activeProvider = fallbackProvider;
        return this.models.get(fallbackProvider)!;
      }
      throw new Error(`No hay modelos disponibles. El proveedor '${this.activeProvider}' no se encontró.`);
    }
    return model;
  }

  public setActiveProvider(provider: ModelProvider): void {
    if (!this.models.has(provider)) {
      console.warn(`[ModelManager] El proveedor '${provider}' no está disponible.`);
      return;
    }
    this.activeProvider = provider;
    console.log(`[ModelManager] Proveedor activo cambiado a: ${provider}`);
  }

  public getActiveProvider(): ModelProvider {
    return this.activeProvider;
  }

  public getAvailableProviders(): ModelProvider[] {
    return Array.from(this.models.keys());
  }

  public async generateText(promptText: string): Promise<string> {
    try {
      const model = this.getActiveModel();
      const messages = [new SystemMessage(promptText)];
      const response = await model.invoke(messages);
      return response.content as string;
    } catch (error: any) {
      console.error('[ModelManager] Error al generar texto:', error);
      throw error;
    }
  }

  public async generateChatResponse(
    systemPrompt: string,
    userMessage: string,
    chatHistory: Array<{ role: 'user' | 'assistant' | 'system', content: string }> = []
  ): Promise<string> {
    try {
      const model = this.getActiveModel();
      const messages: BaseMessage[] = [new SystemMessage(systemPrompt)];

      chatHistory.forEach(msg => {
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          messages.push(new AIMessage(msg.content));
        } else {
          messages.push(new SystemMessage(msg.content));
        }
      });
      messages.push(new HumanMessage(userMessage));
      
      const response = await model.invoke(messages);
      return response.content as string;
    } catch (error: any) {
      console.error('[ModelManager] Error al generar respuesta de chat:', error);
      throw error;
    }
  }
}