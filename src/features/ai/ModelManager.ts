// src/features/ai/ModelManager.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { cleanResponseString } from './util/responseCleaner';
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
        temperature: vsCodeConfig.get<number>('google.temperature') ?? 0.2,
        maxTokens: vsCodeConfig.get<number>('google.maxTokens') || 4096,
        apiKey: vsCodeConfig.get<string>('google.apiKey') || "AIzaSyBXGZbSj099c4bUOpLxbXKJgysGKKF3sR0",
      },
      ollama: {
        provider: 'ollama',
        modelName: vsCodeConfig.get<string>('ollama.modelName') || 'qwen2.5-coder:7b',
        temperature: vsCodeConfig.get<number>('ollama.temperature') ?? 0.2,
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

  private wrapModelWithCleaning(model: BaseChatModel): BaseChatModel {
    return new Proxy(model, {
      get: (target, prop, receiver) => {
        const original = Reflect.get(target, prop, receiver);

        if (prop === '_generate' || prop === 'invoke' || prop === 'call') {
          return async (...args: any[]) => {
            console.log(`[ModelManager] [${String(prop)}] Input al modelo:`, JSON.stringify(args, null, 2));
            try {
              const result = await original.apply(target, args);
              console.log(`[ModelManager] [${String(prop)}] Output crudo del modelo:`, JSON.stringify(result, null, 2));
              
              // Caso 1: Respuesta estándar de LangChain
              if (result?.generations?.[0]?.text) {
                return {
                  ...result,
                  generations: [{
                    ...result.generations[0],
                    text: cleanResponseString(result.generations[0].text)
                  }]
                };
              }
              
              // Caso 2: Respuesta directa (content)
              if (result?.content) {
                return {
                  ...result,
                  content: cleanResponseString(result.content)
                };
              }
              
              // Caso 3: String directo
              if (typeof result === 'string') {
                return cleanResponseString(result);
              }

              return result;
            } catch (error) {
              console.error('Error cleaning model response:', error);
              throw new Error(`Failed to process model response: ${error}`);
            }
          };
        }
        return original;
      }
    });
  }


  public dispose(): void {
    this.configChangeDisposable.dispose();
  }

  public getActiveModel(): BaseChatModel {
    const model = this.models.get(this.activeProvider);
    if (!model) {
      throw new Error(`Modelo para el proveedor activo '${this.activeProvider}' no está disponible.`);
    }
    return this.wrapModelWithCleaning(model);
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

 





}