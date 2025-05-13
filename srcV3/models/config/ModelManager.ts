import { ConfigurationManager } from "../../config/ConfigurationManager";
import { GeminiAPI } from "../providers/gemini";
import { OllamaAPI } from "../providers/ollama";
import { ModelType } from "./types";

export interface ModelAPI {
  generateResponse(prompt: string): Promise<string>;
  abortRequest(): void;
}

/**
 * ModelManager class - Handles model selection and interaction
 */
export class ModelManager {
  private modelInstance: ModelAPI | null = null;
  private configurationManager: ConfigurationManager;

  constructor(configurationManager: ConfigurationManager) {
    this.configurationManager = configurationManager;
    console.log(`[ModelManager] Initialized with model: ${this.configurationManager.getModelType()}`);
  }

  getCurrentModel(): ModelType {
    return this.configurationManager.getModelType();
  }

  async setModel(modelType: ModelType): Promise<void> {
    const validModels: ModelType[] = ["ollama", "gemini"];
    if (!validModels.includes(modelType)) {
      console.error(`[ModelManager] Attempted to change to invalid model: ${modelType}`);
      throw new Error(`Unsupported or invalid model: ${modelType}`);
    }

    const currentModel = this.configurationManager.getModelType();
    if (currentModel === modelType) {
      console.log(`[ModelManager] Model already configured as ${modelType}.`);
      return;
    }

    console.log(`[ModelManager] Changing model: ${currentModel} -> ${modelType}`);
    
    try {
      await this.configurationManager.setModelType(modelType);
      this.modelInstance = null;
      console.log(`[ModelManager] Model changed to ${modelType}.`);
    } catch (error) {
      console.error(`[ModelManager] Error during model change to ${modelType}:`, error);
      throw error;
    }
  }

  private getModelInstance(): ModelAPI {
    if (!this.modelInstance) {
      const modelType = this.configurationManager.getModelType();
      
      if (modelType === "ollama") {
        this.modelInstance = new OllamaAPI();
      } else if (modelType === "gemini") {
        const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBXGZbSj099c4bUOpLxbXKJgysGKKF3sR0";
        if (!process.env.GEMINI_API_KEY) {
          console.warn("[ModelManager] Gemini API key not found. Using default value.");
        }
        this.modelInstance = new GeminiAPI(apiKey);
      } else {
        throw new Error(`Unsupported model: ${modelType}`);
      }
    }
    
    return this.modelInstance;
  }

  async sendPrompt(prompt: string): Promise<string> {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      throw new Error("Prompt cannot be empty.");
    }

    try {
      const modelType = this.configurationManager.getModelType();
      console.log(`[ModelManager] Generating response with ${modelType} (Prompt len: ${prompt.length})`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ModelManager] PROMPT:\n${prompt.substring(0, 500)}${prompt.length > 500 ? '...' : ''}`);
      }
      
      const response = await this.getModelInstance().generateResponse(prompt);
      
      console.log(`[ModelManager] Response received (len: ${response.length})`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ModelManager] RESPONSE:\n${response.substring(0, 500)}${response.length > 500 ? '...' : ''}`);
      }
      
      return response;
    } catch (error: any) {
      console.error(`[ModelManager] Error generating response:`, error.message);
      throw new Error(`Error generating response: ${error.message}`);
    }
  }

  abortRequest(): void {
    if (this.modelInstance) {
      console.log(`[ModelManager] Aborting request for ${this.configurationManager.getModelType()}`);
      this.modelInstance.abortRequest();
    }
  }

  dispose(): void {
    this.abortRequest();
    this.modelInstance = null;
  }
}