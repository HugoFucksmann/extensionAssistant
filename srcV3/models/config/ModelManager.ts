// src/models/config/ModelManager.ts
// MODIFIED: Replaced custom ModelAPI implementations with LangChain wrappers.
// MODIFIED: Removed ModelAPI interface and custom API instance properties.
// MODIFIED: Updated getLangChainModelInstance to return ChatOllama or ChatGoogleGenerativeAI.
// MODIFIED: Removed sendPrompt method.

import { ConfigurationManager } from "../../config/ConfigurationManager";
// REMOVED: import { GeminiAPI } from "../providers/gemini"; // Removed custom API
// REMOVED: import { OllamaAPI } from "../providers/ollama"; // Removed custom API
import { ModelType } from "./types";

// Import LangChain LLM interfaces and specific model classes
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
// Assuming you have these installed:
// npm install @langchain/community @langchain/google-genai
import { ChatOllama } from "@langchain/ollama";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";


// REMOVED: ModelAPI interface - Replaced by using LangChain's BaseChatModel interface
/*
export interface ModelAPI {
  // generateResponse(prompt: string): Promise<string>; // This method will be less used directly by PromptService
  abortRequest(): void;
  // Maybe add a method like getLangChainModel(): BaseChatModel; to the API interface itself
  // Or ModelManager wraps the API's native client in a LangChain model.
}
*/

/**
 * ModelManager class - Handles model selection, interaction, and provides LangChain models.
 */
export class ModelManager {
  // REMOVED: Hold instances of the underlying API clients
  // private ollamaApiInstance: OllamaAPI | null = null;
  // private geminiApiInstance: GeminiAPI | null = null;

  private configurationManager: ConfigurationManager;
   private abortController: AbortController | null = null; // Keep abort controller here to manage global abort


  constructor(configurationManager: ConfigurationManager) {
    this.configurationManager = configurationManager;
    console.log(`[ModelManager] Initialized with model: ${this.configurationManager.getModelType()}`);
     // Note: LangChain model instances are created on demand in getLangChainModelInstance
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
       // Abort any ongoing requests before changing model
       this.abortRequest();
       // No need to dispose old custom API instances anymore

      await this.configurationManager.setModelType(modelType);
      console.log(`[ModelManager] Model changed to ${modelType}.`);
    } catch (error) {
      console.error(`[ModelManager] Error during model change to ${modelType}:`, error);
      throw error;
    }
  }

  // REMOVED: Helper to get the underlying API instance - No longer needed
  /*
  private getModelAPIInstance(): ModelAPI {
     const modelType = this.configurationManager.getModelType();
      if (modelType === "ollama") {
          if (!this.ollamaApiInstance) this.ollamaApiInstance = new OllamaAPI();
          return this.ollamaApiInstance;
      } else if (modelType === "gemini") {
          // Ensure API key is handled securely (e.g., VS Code secrets API, not env var)
          const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBXGZbSj099c4bUOpLxbXKJgysGKKF3sR0"; // Placeholder
           if (!process.env.GEMINI_API_KEY) {
             console.warn("[ModelManager] Gemini API key not found. Using default value. Use VS Code Secrets API in production.");
           }
          if (!this.geminiApiInstance) this.geminiApiInstance = new GeminiAPI(apiKey);
          return this.geminiApiInstance;
      } else {
          throw new Error(`Unsupported model type configured: ${modelType}`);
      }
  }
  */


   /**
    * Provides a LangChain compatible ChatModel instance for the current model type.
    * This is the method PromptService will use.
    */
  getLangChainModelInstance(): BaseChatModel {
      const modelType = this.configurationManager.getModelType();

      // --- LangChain Integration ---
      if (modelType === 'ollama') {
          // Need to get the specific model name (e.g., 'gemma3:4b') from config or default
          const ollamaModelName = this.configurationManager.getValue('ollamaModelName', 'gemma3:4b'); // Get from config
          // Need to get the Ollama base URL from config or default ('http://localhost:11434')
          const ollamaBaseUrl = this.configurationManager.getValue('ollamaBaseUrl', 'http://localhost:11434'); // Get from config

          // Instantiate ChatOllama
          return new ChatOllama({
               baseUrl: ollamaBaseUrl,
               model: ollamaModelName,
               temperature: this.configurationManager.getValue('ollamaTemperature', 0.3), // Get from config
               // other options from config if needed
          });

      } else if (modelType === 'gemini') {
           // Need to get API key, model name ('gemini-2.0-flash-exp'), etc. from config/secrets
           // TODO: Implement secure fetching of Gemini API key using VS Code Secrets API.
           // For now, using a placeholder or config value (NOT RECOMMENDED FOR PRODUCTION).
           const apiKey = this.configurationManager.getValue('geminiApiKey', 'YOUR_GEMINI_API_KEY_PLACEHOLDER'); // Get from config/secrets later
           if (apiKey === 'YOUR_GEMINI_API_KEY_PLACEHOLDER') {
               console.warn("[ModelManager] Using placeholder Gemini API key. Configure 'extensionAssistant.geminiApiKey' securely.");
           }
           const geminiModelName = this.configurationManager.getValue('geminiModelName', "gemini-2.0-flash-exp"); // Get from config

          // Instantiate ChatGoogleGenerativeAI
          return new ChatGoogleGenerativeAI({
               apiKey: apiKey,
               model: geminiModelName,
               temperature: this.configurationManager.getValue('geminiTemperature', 0.2), // Get from config
               maxOutputTokens: this.configurationManager.getValue('geminiMaxOutputTokens', 2048), // Get from config
               // other options from config if needed
          });

      } else {
          // Should not happen due to setModel validation
          throw new Error(`Attempted to get LangChain model for unsupported type: ${modelType}`);
      }
  }


   // REMOVED: sendPrompt is removed - PromptService handles the interaction via getLangChainModelInstance().invoke()
   /*
   async sendPrompt(prompt: string): Promise<string> {
       const api = this.getModelAPIInstance();
       return api.generateResponse(prompt);
   }
   */

   abortRequest(): void {
     // Abort the current active request via the underlying AbortController
     if (this.abortController) {
         console.log('[ModelManager] Aborting current request.');
         this.abortController.abort();
         // Do NOT set to null immediately, the signal might still be needed by
         // the ongoing LangChain invoke call to detect cancellation.
         // It should be set to null *after* the operation completes or is confirmed aborted.
         // A better pattern is to create a *new* AbortController for each turn/request
         // and pass its signal down. ModelManager would then only need to manage the *current* one.
         // Let's refine this: ModelManager creates a new controller per turn/request
         // and PromptService receives it via invoke options.
         // The AbortController property here is primarily for the *external* abort command.
         // Let's keep the current abortRequest for external triggers, but the one used
         // by PromptService should be per-invoke.
         // For now, this method aborts the controller that *might* be used by the current invoke.
     }
      // No custom API instances to call abort on anymore
   }

   /**
    * Returns the current AbortController instance or creates a new one if none exists.
    * This allows external components (like OrchestratorService) to access the abort signal for cancellation.
    * A new controller should ideally be created per turn/request by the orchestrator.
    * This method is mainly for the VS Code command to abort the *currently running* operation.
    * Let's adjust: ModelManager *creates* the controller when a turn starts (via Orchestrator),
    * and `getAbortController` returns the *current* one. `abortRequest` aborts the current one.
    * Orchestrator needs to tell ModelManager when a new turn starts to get a fresh controller.
    * Or, Orchestrator creates the controller and passes it to PromptService/ToolAdapter.
    * Let's stick to the simpler pattern for now: ModelManager manages *one* controller for the extension's lifetime,
    * and `abortRequest` aborts it. `getAbortController` returns it. This is simpler for a global abort command.
    * The Orchestrator/PromptService will use `getAbortController().signal` in their `invoke` calls.
    */
   getAbortController(): AbortController {
       if (!this.abortController) {
           this.abortController = new AbortController();
           console.log('[ModelManager] Created new AbortController.');
       }
       return this.abortController;
   }

  dispose(): void {
    this.abortRequest(); // Abort any pending request
     // No custom API instances to dispose
     // The LangChain model instances created in getLangChainModelInstance are short-lived per invocation,
     // they don't need explicit disposal here.
    console.log('[ModelManager] Disposed.');
  }
}