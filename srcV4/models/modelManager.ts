// srcV4/models/modelManager.ts
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage, BaseMessage, AIMessage } from '@langchain/core/messages';
import { PromptTemplate as CorePromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';

export type ModelProvider = 'openai' | 'gemini' | 'ollama' | 'anthropic';

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

  constructor(defaultProvider: ModelProvider = 'gemini') {
    this.models = new Map();
    this.config = { // Initialize config here or ensure it's passed
      openai: {
        provider: 'openai',
        modelName: process.env.OPENAI_MODEL_NAME || 'gpt-3.5-turbo',
        temperature: 0.2,
        maxTokens: 4096,
        apiKey: process.env.OPENAI_API_KEY,
      },
      gemini: {
        provider: 'gemini',
        modelName: process.env.GEMINI_MODEL_NAME || 'gemini-pro',
        temperature: 0.2,
        maxTokens: 4096,
        apiKey: process.env.GOOGLE_API_KEY,
      },
      ollama: {
        provider: 'ollama',
        modelName: 'llama3',
        temperature: 0.2,
        baseUrl: 'http://localhost:11434',
        maxTokens: 4096,
      },
      anthropic: {
        provider: 'anthropic',
        modelName: 'claude-3-opus-20240229', // Example, ensure correct model name
        temperature: 0.2,
        maxTokens: 4096,
        apiKey: process.env.ANTHROPIC_API_KEY, // Assuming env var for Anthropic
      }
    };
    this.activeProvider = defaultProvider;
    this.initializeModels();
    console.log(`[ModelManager] Initialized with active provider: ${this.activeProvider}`);
  }

  private initializeModels(): void {
    try {
      if (this.config.openai.apiKey) {
        this.models.set('openai', new ChatOpenAI({
          modelName: this.config.openai.modelName,
          temperature: this.config.openai.temperature,
          maxTokens: this.config.openai.maxTokens,
          openAIApiKey: this.config.openai.apiKey,
        }));
      } else {
        console.warn("[ModelManager] OpenAI API Key not provided. OpenAI models disabled.");
      }

      if (this.config.gemini.apiKey) {
        this.models.set('gemini', new ChatGoogleGenerativeAI({
          model: this.config.gemini.modelName,
          temperature: this.config.gemini.temperature,
          maxOutputTokens: this.config.gemini.maxTokens,
          apiKey: this.config.gemini.apiKey,
        }));
      } else {
        console.warn("[ModelManager] Google API Key not provided. Gemini models disabled.");
      }

      try {
        this.models.set('ollama', new ChatOllama({
          model: this.config.ollama.modelName,
          temperature: this.config.ollama.temperature,
          baseUrl: this.config.ollama.baseUrl,
          // numPredict: this.config.ollama.maxTokens, // Check Ollama docs for max tokens equivalent
        }));
      } catch (error: any) {
        console.warn('[ModelManager] Failed to initialize Ollama (is it running?):', error.message);
      }
      
      // Placeholder for Anthropic if you implement it
      // if (this.config.anthropic.apiKey) { ... }

      if (this.models.size === 0) {
        console.error('[ModelManager] No models available. Please configure API keys or ensure Ollama is running.');
      }

      if (!this.models.has(this.activeProvider) && this.models.size > 0) {
        this.activeProvider = Array.from(this.models.keys())[0];
        console.warn(`[ModelManager] Default provider ${this.config.gemini.provider} not available or not configured. Switched to ${this.activeProvider}`);
      } else if (this.models.size === 0 && this.activeProvider) {
         // If activeProvider was set but no models initialized, log it.
         console.error(`[ModelManager] Active provider ${this.activeProvider} could not be initialized.`);
      }

    } catch (error: any) {
      console.error('[ModelManager] Error initializing models:', error);
    }
  }

  private getActiveModel(): BaseChatModel {
    const model = this.models.get(this.activeProvider);
    if (!model) {
      if (this.models.size > 0) {
        const fallbackProvider = Array.from(this.models.keys())[0];
        console.warn(`[ModelManager] Active model provider '${this.activeProvider}' not available. Falling back to '${fallbackProvider}'.`);
        this.activeProvider = fallbackProvider;
        return this.models.get(fallbackProvider)!;
      }
      throw new Error(`No models available. Active provider '${this.activeProvider}' not found.`);
    }
    return model;
  }

  public setActiveProvider(provider: ModelProvider): void {
    if (!this.config[provider]) { // Check against config, not just initialized models
        console.warn(`[ModelManager] Provider '${provider}' is not configured.`);
        return;
    }
    if (!this.models.has(provider)) {
      console.warn(`[ModelManager] Model for provider '${provider}' not initialized (e.g. missing API key). Cannot set as active.`);
      return;
    }
    this.activeProvider = provider;
    console.log(`[ModelManager] Active provider changed to: ${provider}`);
  }

  public configureProvider(provider: ModelProvider, config: Partial<ModelConfig>): void {
    if (!this.config[provider]) {
        this.config[provider] = { provider, ...config } as ModelConfig;
    } else {
        this.config[provider] = { ...this.config[provider], ...config };
    }
    this.initializeModels(); // Re-initialize all models with new config
    console.log(`[ModelManager] Provider '${provider}' reconfigured.`);
  }

  public async generateResponse(
    prompt: string | CorePromptTemplate | ChatPromptTemplate,
    values?: Record<string, any>
  ): Promise<string> {
    try {
      const model = this.getActiveModel();
      let messages: BaseMessage[];

      if (typeof prompt === 'string') {
        messages = [new SystemMessage(prompt)];
      } else if (prompt instanceof CorePromptTemplate) {
        const formattedPrompt = await prompt.format(values || {});
        messages = [new SystemMessage(formattedPrompt)];
      } else if (prompt instanceof ChatPromptTemplate) {
        const formattedMessages = await prompt.formatMessages(values || {});
        messages = formattedMessages; // This should already be BaseMessage[]
      } else {
        throw new Error("Invalid prompt type. Must be string, CorePromptTemplate, or ChatPromptTemplate.");
      }
      
      const response = await model.invoke(messages);
      return response.content as string;
    } catch (error: any) {
      console.error('[ModelManager] Error generating response:', error);
      throw error;
    }
  }

  public async generateText(promptText: string, modelName?: string): Promise<string> {
    try {
      let modelToUse = this.getActiveModel(); // Default to active model

      if (modelName) {
        const providerEntry = Object.entries(this.config).find(([, conf]) => conf.modelName === modelName);
        if (providerEntry) {
          const providerKey = providerEntry[0] as ModelProvider;
          if (this.models.has(providerKey)) {
            modelToUse = this.models.get(providerKey)!;
          } else {
            console.warn(`[ModelManager] Model ${modelName} (provider ${providerKey}) not initialized. Using active model.`);
          }
        } else {
            console.warn(`[ModelManager] Model ${modelName} not found in config. Using active model.`);
        }
      }
      
      const messages = [new SystemMessage(promptText)];
      const response = await modelToUse.invoke(messages);
      return response.content as string;
    } catch (error: any) {
      console.error('[ModelManager] Error generating text:', error);
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
          messages.push(new AIMessage(msg.content)); // Use AIMessage for assistant
        } else { // system
          messages.push(new SystemMessage(msg.content));
        }
      });
      messages.push(new HumanMessage(userMessage));
      
      const response = await model.invoke(messages);
      return response.content as string;
    } catch (error: any) {
      console.error('[ModelManager] Error generating chat response:', error);
      throw error;
    }
  }
}