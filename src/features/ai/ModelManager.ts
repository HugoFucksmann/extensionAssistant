// src/features/ai/ModelManager.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import * as vscode from 'vscode';
import { Disposable } from '../../core/interfaces/Disposable';

export type ModelProvider = 'gemini' | 'ollama';

export interface ModelConfig {
  provider: ModelProvider;
  modelName: string;
  temperature: number;
  maxTokens?: number;
  apiKey?: string;
  baseUrl?: string;
}

export class ModelManager implements Disposable {
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

    console.log(`[ModelManager] Initialized. Preferred provider: ${this.getUserPreferredProvider()}, Active provider: ${this.activeProvider}`);

    this.configChangeDisposable = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('extensionAssistant')) {
        console.log('[ModelManager] Configuration changed, re-initializing...');
        const oldPreferredProvider = this.getUserPreferredProvider();
        this.config = this.loadDetailedConfiguration();
        this.activeProvider = this.getUserPreferredProvider(); // Re-evaluate preference
        this.initializeModels();
        this.ensureActiveProviderIsValid();

        if (oldPreferredProvider !== this.activeProvider) {
          vscode.window.showInformationMessage(`AI model provider switched to: ${this.activeProvider}`);
          console.log(`[ModelManager] Active provider switched to: ${this.activeProvider} due to configuration change or availability.`);
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
        modelName: vsCodeConfig.get<string>('google.model', 'gemini-1.5-flash-latest'),
        temperature: vsCodeConfig.get<number>('google.temperature', 0.2),
        maxTokens: 8192,
        apiKey: vsCodeConfig.get<string>('google.apiKey') || process.env.GOOGLE_API_KEY,
      },
      ollama: {
        provider: 'ollama',
        modelName: vsCodeConfig.get<string>('ollama.model', 'qwen2.5-coder:7b'),
        temperature: vsCodeConfig.get<number>('ollama.temperature', 0.2),
        baseUrl: vsCodeConfig.get<string>('ollama.baseUrl', 'http://localhost:11434'),
        maxTokens: 4096,
      }
    };
  }

  private initializeModels(): void {
    this.models.clear();
    const geminiConfig = this.config.gemini;

    if (geminiConfig.apiKey) {
      if (!/^AIzaSy[0-9A-Za-z_-]{33}$/.test(geminiConfig.apiKey)) {
        vscode.window.showWarningMessage('Invalid Google API Key format. Gemini model disabled.');
        console.warn('[ModelManager] Invalid Google API Key format. It should start with "AIzaSy".');
      } else {
        try {
          this.models.set('gemini', new ChatGoogleGenerativeAI({
            model: geminiConfig.modelName,
            temperature: geminiConfig.temperature,
            maxOutputTokens: geminiConfig.maxTokens,
            apiKey: geminiConfig.apiKey,
          }));
          console.log('[ModelManager] Gemini model initialized.');
        } catch (error: any) {
          vscode.window.showErrorMessage(`Error initializing Gemini: ${error.message}`);
          console.warn('[ModelManager] Error initializing Gemini:', error.message);
        }
      }
    } else {
      console.log("[ModelManager] Google API Key not provided. Gemini model is not available.");
    }

    try {
      this.models.set('ollama', new ChatOllama({
        model: this.config.ollama.modelName,
        temperature: this.config.ollama.temperature,
        baseUrl: this.config.ollama.baseUrl,
      }));
      console.log('[ModelManager] Ollama model initialized.');
    } catch (error: any) {
      console.warn('[ModelManager] Could not initialize Ollama. Is it running?', error.message);
    }
  }

  private ensureActiveProviderIsValid(): void {
    const preferredProvider = this.getUserPreferredProvider();

    if (this.models.has(preferredProvider)) {
      this.activeProvider = preferredProvider;
    } else if (this.models.size > 0) {
      const fallbackProvider = Array.from(this.models.keys())[0];
      this.activeProvider = fallbackProvider;
      vscode.window.showWarningMessage(`Preferred model '${preferredProvider}' is not available. Falling back to '${fallbackProvider}'.`);
      console.warn(`[ModelManager] Preferred provider '${preferredProvider}' not available. Using fallback: '${fallbackProvider}'.`);
    } else {
      this.activeProvider = 'ollama'; // Default to prevent crash
      vscode.window.showErrorMessage('No AI models available. Please configure Google API Key or ensure Ollama is running.');
      console.error('[ModelManager] No models available. Please ensure Ollama is running or configure a Google API key.');
    }
  }

  public dispose(): void {
    this.configChangeDisposable.dispose();
  }

  public getActiveModel(): BaseChatModel {
    const model = this.models.get(this.activeProvider);
    if (!model) {
      this.ensureActiveProviderIsValid(); // Attempt to recover
      const recoveredModel = this.models.get(this.activeProvider);
      if (!recoveredModel) {
        throw new Error(`Critical: No AI model available for active provider '${this.activeProvider}'.`);
      }
      return recoveredModel;
    }
    return model;
  }

  public setActiveProvider(provider: ModelProvider): void {
    if (!this.models.has(provider)) {
      vscode.window.showWarningMessage(`Attempted to switch to unavailable model provider: '${provider}'.`);
      console.warn(`[ModelManager] Attempted to activate unavailable provider: '${provider}'. No changes made.`);
      return;
    }
    this.activeProvider = provider;
    console.log(`[ModelManager] Active provider manually switched to: ${provider}`);
  }
}