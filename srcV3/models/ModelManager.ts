import { ConfigurationManager } from "../config/ConfigurationManager";
import { GeminiAPI } from "./providers/gemini";
import { OllamaAPI } from "./providers/ollama";
import { ModelType } from "./types";



// Interface for model-specific implementations
export interface ModelAPI {
  generateResponse(prompt: string): Promise<string>;
  abortRequest(): void;
}

/**
 * ModelManager class - Handles model selection and interaction
 * 
 * This class is an internal implementation detail of the prompt system.
 * It should not be used directly by application code.
 */
export class ModelManager {
  private modelInstance: ModelAPI | null = null;
  private configurationManager: ConfigurationManager;

  private abortController: AbortController | null = null;

  /**
   * Constructor for ModelManager
   * @param configurationManager ConfigurationManager instance
   */
  constructor(configurationManager: ConfigurationManager) {
    this.configurationManager = configurationManager;
    
    // Subscribe to model changes
   // por implementar
    
    console.log(`[ModelManager] Initialized with model: ${this.configurationManager.getModelType()}`);
  }

  /**
   * Gets the current model type
   */
  getCurrentModel(): ModelType {
    return this.configurationManager.getModelType();
  }

  /**
   * Changes the AI model at runtime
   */
  async setModel(modelType: ModelType): Promise<void> {
    const validModels: ModelType[] = ["ollama", "gemini"];
    if (!modelType || !validModels.includes(modelType)) {
      console.error(`[ModelManager] Attempted to change to invalid model: ${modelType}`);
      throw new Error(`Unsupported or invalid model: ${modelType}`);
    }

    const currentModel = this.configurationManager.getModelType();
    if (currentModel === modelType) {
      console.log(`[ModelManager] Model already configured as ${modelType}.`);
      return; // No change needed
    }

    console.log(`[ModelManager] Changing model: ${currentModel} -> ${modelType}`);
    
    try {
      // Update configuration
      await this.configurationManager.setModelType(modelType);
      
      // Reset model instance
      this.modelInstance = null;
      
      console.log(`[ModelManager] Model changed to ${modelType}.`);
    } catch (error) {
      console.error(`[ModelManager] Error during model change to ${modelType}:`, error);
      throw error;
    }
  }

  /**
   * Gets or creates a model instance based on current configuration
   */
  private getModelInstance(): ModelAPI {
    if (!this.modelInstance) {
      const modelType = this.configurationManager.getModelType();
      
      if (modelType === "ollama") {
        this.modelInstance = new OllamaAPI();
      } else if (modelType === "gemini") {
        // Get API key securely
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

  /**
   * Sends a prompt to the selected model and returns the raw response
   */
  async sendPrompt(prompt: string): Promise<string> {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      console.error("[ModelManager] Attempted to generate response with invalid prompt.");
      throw new Error("Prompt cannot be empty.");
    }

    try {
      const modelType = this.configurationManager.getModelType();
      console.log(`[ModelManager] Generating response with ${modelType} (Prompt len: ${prompt.length})`);
      console.log(`[ModelManager] PROMPT:\n${prompt.substring(0, 500)}${prompt.length > 500 ? '...' : ''}`);
      
      const response = await this.getModelInstance().generateResponse(prompt);
      
      console.log(`[ModelManager] Response received (len: ${response.length})`);
      console.log(`[ModelManager] RESPONSE:\n${response.substring(0, 500)}${response.length > 500 ? '...' : ''}`);
      
      return response;
    } catch (error: any) {
      console.error(`[ModelManager] Error generating response:`, error.message);
      throw new Error(`Error generating response: ${error.message}`);
    }
  }

  /**
   * Aborts any ongoing generation request
   */
  abortRequest(): void {
    if (this.modelInstance) {
      console.log(`[ModelManager] Aborting request for ${this.configurationManager.getModelType()}`);
      this.modelInstance.abortRequest();
    } else {
      console.log(`[ModelManager] No active model instance to abort.`);
    }
  }

  /**
   * Releases resources
   */
  dispose(): void {
    this.abortRequest();
    this.modelInstance = null;
  }
}