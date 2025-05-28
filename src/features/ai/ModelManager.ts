// src/features/ai/ModelManager.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage, BaseMessage, AIMessage } from '@langchain/core/messages';
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

  constructor() {
    this.models = new Map();
    this.config = this.loadDetailedConfiguration();
    this.activeProvider = this.getUserPreferredProvider();
    this.initializeModels();
    this.ensureActiveProviderIsValid();

    console.log(`[ModelManager] Inicializado. Proveedor preferido: ${this.getUserPreferredProvider()}, Proveedor activo: ${this.activeProvider}`);

    this.configChangeDisposable = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('extensionAssistant')) {
        console.log('[ModelManager] Configuración cambiada, reinicializando...');
        const oldPreferredProvider = this.getUserPreferredProvider();
        this.config = this.loadDetailedConfiguration();
        this.activeProvider = this.getUserPreferredProvider(); // Re-evaluar preferencia
        this.initializeModels();
        this.ensureActiveProviderIsValid();

        if (oldPreferredProvider !== this.activeProvider) {
            console.log(`[ModelManager] Proveedor activo cambiado a: ${this.activeProvider} debido a cambio de configuración o disponibilidad.`);
        }
      }
    });
  }

  private getUserPreferredProvider(): ModelProvider {
    const config = vscode.workspace.getConfiguration('extensionAssistant');
   
    return config.get<ModelProvider>('modelType', 'gemini');
  }

  private loadDetailedConfiguration(): Record<ModelProvider, ModelConfig> {
    const vsCodeConfig = vscode.workspace.getConfiguration('extensionAssistant');

    
    return {
      gemini: {
        provider: 'gemini',
        modelName: vsCodeConfig.get<string>('google.modelName') || 'gemini-2.0-flash-exp',
        temperature: vsCodeConfig.get<number>('google.temperature') ?? 0.3,
        maxTokens: vsCodeConfig.get<number>('google.maxTokens') || 4096,
        apiKey: vsCodeConfig.get<string>('google.apiKey') || "AIzaSyBXGZbSj099c4bUOpLxbXKJgysGKKF3sR0",
      },
      ollama: {
        provider: 'ollama',
        modelName: vsCodeConfig.get<string>('ollama.modelName') || 'gemma3:4b',
        temperature: vsCodeConfig.get<number>('ollama.temperature') ?? 0.3,
        baseUrl: vsCodeConfig.get<string>('ollama.baseUrl') || 'http://localhost:11434',
        maxTokens: vsCodeConfig.get<number>('ollama.maxTokens') || 4096,
      }
    };
  }

  private initializeModels(): void {
    this.models.clear();
    const detailedConfigs = this.config;

   
    if (detailedConfigs.gemini.apiKey) {
      try {
        this.models.set('gemini', new ChatGoogleGenerativeAI({
          model: detailedConfigs.gemini.modelName,
          temperature: detailedConfigs.gemini.temperature,
          maxOutputTokens: detailedConfigs.gemini.maxTokens,
          apiKey: detailedConfigs.gemini.apiKey,
        }));
        console.log('[ModelManager] Modelo Gemini inicializado.');
      } catch (error: any) {
        console.warn('[ModelManager] Error al inicializar Gemini:', error.message);
      }
    } else {
      console.warn("[ModelManager] Clave de API de Google no proporcionada. Modelo Gemini no disponible.");
    }

    // Inicializar Ollama
    try {
      this.models.set('ollama', new ChatOllama({
        model: detailedConfigs.ollama.modelName,
        temperature: detailedConfigs.ollama.temperature,
        baseUrl: detailedConfigs.ollama.baseUrl,
        
      }));
      console.log('[ModelManager] Modelo Ollama inicializado.');
    } catch (error: any) {
      console.warn('[ModelManager] No se pudo conectar con Ollama. ¿Está en ejecución?', error.message);
    }
  }

  private ensureActiveProviderIsValid(): void {
    const preferredProvider = this.getUserPreferredProvider();

    if (this.models.has(preferredProvider)) {
      this.activeProvider = preferredProvider;
    } else if (this.models.size > 0) {
      // Fallback al primer modelo disponible si el preferido no está listo
      const fallbackProvider = Array.from(this.models.keys())[0];
      console.warn(`[ModelManager] Proveedor preferido '${preferredProvider}' no disponible. Usando fallback: '${fallbackProvider}'.`);
      this.activeProvider = fallbackProvider;
    } else {
     
      console.error('[ModelManager] No hay modelos disponibles. Configura Ollama o proporciona una clave de API de Google.');
     
    }
  }


  public dispose(): void {
    this.configChangeDisposable.dispose();
  }

  private getActiveModel(): BaseChatModel {
   
    const model = this.models.get(this.activeProvider);
    if (!model) {
      
      throw new Error(`Modelo para el proveedor activo '${this.activeProvider}' no está disponible o no hay modelos configurados.`);
    }
    return model;
  }

  public setActiveProvider(provider: ModelProvider): void {
   
    if (!this.models.has(provider)) {
      console.warn(`[ModelManager] Intento de activar proveedor no disponible: '${provider}'. No se realizaron cambios.`);
     
      return;
    }
    if (this.activeProvider !== provider) {
        this.activeProvider = provider;
        console.log(`[ModelManager] Proveedor activo cambiado manualmente a: ${provider}`);
    }
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
      const messages = [
        new HumanMessage({
          content: promptText
        })
      ];
      const response = await model.invoke(messages);
      return response.content as string;
    } catch (error: any) {
      console.error(`[ModelManager] Error al generar texto con ${this.activeProvider}:`, error);
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
      console.error(`[ModelManager] Error al generar respuesta de chat con ${this.activeProvider}:`, error);
      throw error;
    }
  }
}