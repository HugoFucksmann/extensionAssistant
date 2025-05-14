Okay, let's implement the proposed architecture. This involves creating a `PlannerService`, refactoring the `Orchestrator` to manage the execution loop, updating the `InteractionContext` to hold the process state, and modifying the `ChatService` and `ChatRepository` for persistence.

Due to the interconnected nature and size of these changes, I will provide the complete content for the modified files.

**Modified Files:**

1.  `storage/database/DatabaseManager.ts` (Add `context_state` column)
2.  `storage/interfaces/entities.ts` (Add `context_state` property to `Chat`)
3.  `storage/interfaces/IChatRepository.ts` (Add methods for context state)
4.  `storage/repositories/chatRepository.ts` (Implement context state persistence)
5.  `orchestrator/context/interactionContext.ts` (Add state keys for planning/execution)
6.  `orchestrator/planner/plannerService.ts` (New file: Contains planning/evaluation logic)
7.  `orchestrator/planner/index.ts` (New file: Exports PlannerService)
8.  `orchestrator/orchestrator.ts` (Refactored: Implements the execution loop, uses PlannerService)
9.  `orchestrator/execution/types.ts` (Add new state types, potentially `planningEngine` prompt type)
10. `orchestrator/execution/PromptExecutor.ts` (Add `planningEngine` if used)
11. `orchestrator/handlers/baseHandler.ts` (Refactored: `handle` signature and role change)
12. `orchestrator/handlers/conversationHandler.ts` (Refactored: Initialize plan)
13. `orchestrator/handlers/explainCodeHandler.ts` (Refactored: Initialize plan)
14. `orchestrator/handlers/fixCodeHandler.ts` (Refactored: Initialize plan)
15. `orchestrator/index.ts` (Export planner)
16. `chatService.ts` (Refactored: Load/save context, call Orchestrator entry point)
17. `extension.ts` (Update Orchestrator/ChatService instantiation if needed - unlikely major changes here)

Let's start generating the modified files.

--- START OF FILE storage/database/DatabaseManager.ts ---
```typescript
import * as vscode from 'vscode';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class DatabaseManager {
  private db: sqlite3.Database;
  private static instance: DatabaseManager;

  private constructor(context: vscode.ExtensionContext) {
    const dbPath = path.join(context.globalStorageUri.fsPath, 'assistant.db');

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('[DatabaseManager] Error opening database:', err.message);
        throw err;
      }
    });

    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON');

    // Initialize tables on first connection
    this.initializeTables();
  }

  /**
   * Get or create database manager instance (Singleton pattern)
   */
  public static getInstance(context: vscode.ExtensionContext): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(context);
    }
    return DatabaseManager.instance;
  }

  /**
   * Initializes or updates chat tables
   */
  private initializeTables(): void {
    this.db.serialize(() => {
      // Create chats table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS chats (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          preview TEXT,
          context_state TEXT -- Add new column for context state
        )
      `);

      // Create messages table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL,
          content TEXT NOT NULL,
          sender TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
        )
      `);

       // Example of adding a column if it doesn't exist (migration logic)
       // This is a simplified example; proper migrations are complex.
       // For this exercise, we assume `context_state` column might be new.
       this.db.get("PRAGMA table_info(chats)", (err, rowInfo) => {
            if (err) {
                console.error('[DatabaseManager] Error checking table info:', err.message);
                return;
            }
            const columnExists = Array.isArray(rowInfo) && rowInfo.some((col: any) => col.name === 'context_state');
            if (!columnExists) {
                console.log('[DatabaseManager] Adding context_state column to chats table...');
                this.db.run("ALTER TABLE chats ADD COLUMN context_state TEXT", (alterErr) => {
                    if (alterErr) {
                        console.error('[DatabaseManager] Error adding context_state column:', alterErr.message);
                    } else {
                        console.log('[DatabaseManager] context_state column added.');
                    }
                });
            }
       });
    });
  }


  /**
   * Gets the SQLite database instance
   */
  public getDatabase(): sqlite3.Database {
    return this.db;
  }

  /**
   * Closes the database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('[DatabaseManager] Error closing database:', err.message);
        } else {
           console.log('[DatabaseManager] Database connection closed.');
        }
      });
    }
  }
}
```
--- END OF FILE storage/database/DatabaseManager.ts ---

--- START OF FILE storage/interfaces/entities.ts ---
```typescript
export interface Chat {
    id: string;
    title: string;
    timestamp: number;
    preview?: string;
    context_state?: string; // Add context state as a JSON string
}

export interface ChatMessage {
  id?: string; // Make optional for creation
  chatId: string;
  content: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: number;
  files?: string[];
}
```
--- END OF FILE storage/interfaces/entities.ts ---

--- START OF FILE storage/interfaces/IChatRepository.ts ---
```typescript
import { Chat, ChatMessage } from "./entities";
import { IRepository } from "./IRepository";


/**
 * Chat repository specific operations
 */
export interface IChatRepository extends IRepository<Chat> {
    updateTitle(chatId: string, title: string): Promise<void>;
    updateTimestamp(chatId: string): Promise<void>;
    updatePreview(chatId: string, preview: string): Promise<void>;

    addMessage(message: ChatMessage): Promise<ChatMessage>;
    getMessages(chatId: string): Promise<ChatMessage[]>;

    // New methods for context state persistence
    saveContextState(chatId: string, stateJson: string): Promise<void>;
    loadContextState(chatId: string): Promise<string | null>;
  }
```
--- END OF FILE storage/interfaces/IChatRepository.ts ---

--- START OF FILE storage/repositories/chatRepository.ts ---
```typescript
// src/storage/repositories/ChatRepository.ts
import * as vscode from 'vscode';
import * as sqlite3 from 'sqlite3';
import { randomUUID } from 'crypto';
import { IChatRepository } from '../interfaces/IChatRepository';
import { Chat, ChatMessage } from '../interfaces/entities';
import { DatabaseManager } from '../database/DatabaseManager';

export class ChatRepository implements IChatRepository {
  private db: sqlite3.Database;

  constructor(context: vscode.ExtensionContext) {
    const dbManager = DatabaseManager.getInstance(context);
    this.db = dbManager.getDatabase();
    // Table initialization is now handled by DatabaseManager constructor
  }

  /**
   * Creates a new chat
   */
  public async create(chat: Chat): Promise<Chat> {
    return new Promise((resolve, reject) => {
      const chatWithId = {
        ...chat,
        id: chat.id || randomUUID(),
        context_state: chat.context_state || null // Ensure context_state is included
      };

      this.db.run(
        'INSERT INTO chats (id, title, timestamp, context_state) VALUES (?, ?, ?, ?)',
        [chatWithId.id, chatWithId.title, chatWithId.timestamp, chatWithId.context_state],
        (err) => {
          if (err) {
            console.error('[ChatRepository] Error creating chat:', err.message);
            reject(err);
          } else {
            resolve(chatWithId);
          }
        }
      );
    });
  }

  /**
   * Finds a chat by ID
   */
  public async findById(id: string): Promise<Chat | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id, title, timestamp, preview, context_state FROM chats WHERE id = ?', // Select all columns including context_state
        [id],
        (err, row) => {
          if (err) {
            console.error('[ChatRepository] Error finding chat:', err.message);
            reject(err);
          } else {
            resolve(row ? row as Chat : null);
          }
        }
      );
    });
  }

  /**
   * Gets all chats (excluding context_state for performance/memory)
   */
  public async findAll(): Promise<Chat[]> {
    return new Promise((resolve, reject) => {
      // Exclude context_state from findAll for potentially faster list loading
      this.db.all('SELECT id, title, timestamp, preview FROM chats ORDER BY timestamp DESC', (err, rows) => {
        if (err) {
          console.error('[ChatRepository] Error finding all chats:', err.message);
          reject(err);
        } else {
          // Add a placeholder for context_state if needed, or handle its absence
          resolve(rows.map(row => ({ ...row, context_state: undefined })) as Chat[]);
        }
      });
    });
  }

  /**
   * Updates a chat
   */
  public async update(id: string, item: Partial<Chat>): Promise<void> {
    // Build update query dynamically based on provided fields
    // Allow updating context_state via this generic update, but also provide specific methods
    const fields = Object.keys(item).filter(key => key !== 'id');
    if (fields.length === 0) {
      return Promise.resolve();
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (item as any)[field]);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE chats SET ${setClause} WHERE id = ?`,
        [...values, id],
        (err) => {
          if (err) {
            console.error('[ChatRepository] Error updating chat:', err.message);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Updates a chat's title
   */
  public async updateTitle(chatId: string, title: string): Promise<void> {
    return this.update(chatId, { title });
  }

  /**
   * Updates a chat's timestamp
   */
  public async updateTimestamp(chatId: string): Promise<void> {
    return this.update(chatId, { timestamp: Date.now() });
  }

  /**
   * Updates a chat's preview
   */
  public async updatePreview(chatId: string, preview: string): Promise<void> {
    // Take first 100 characters as preview
    const trimmedPreview = preview.length > 100 ? `${preview.substring(0, 97)}...` : preview;
    return this.update(chatId, { preview: trimmedPreview });
  }

  /**
   * Deletes a chat
   */
  public async delete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM chats WHERE id = ?', [id], (err) => {
        if (err) {
          console.error('[ChatRepository] Error deleting chat:', err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Adds a message to a chat
   */
  public async addMessage(message: ChatMessage): Promise<ChatMessage> {
    return new Promise((resolve, reject) => {
      const messageWithId = {
        ...message,
        id: message.id || randomUUID()
      };

      this.db.run(
        'INSERT INTO messages (id, chat_id, content, sender, timestamp) VALUES (?, ?, ?, ?, ?)',
        [messageWithId.id, messageWithId.chatId, messageWithId.content, messageWithId.sender, messageWithId.timestamp],
        async (err) => {
          if (err) {
            console.error('[ChatRepository] Error adding message:', err.message);
            reject(err);
          } else {
            // Update chat timestamp and preview for user messages
            try {
              if (message.sender === 'user') {
                // Only update preview for the first user message? Or always? Let's update on every user message for simplicity now.
                await this.updatePreview(message.chatId, message.content);
              }
              await this.updateTimestamp(message.chatId);
              resolve(messageWithId);
            } catch (err) {
              console.error('[ChatRepository] Error updating chat after message:', err);
              resolve(messageWithId); // Still return message even if chat update fails
            }
          }
        }
      );
    });
  }

  /**
   * Gets all messages for a chat
   */
  public async getMessages(chatId: string): Promise<ChatMessage[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, chat_id, content, sender, timestamp FROM messages WHERE chat_id = ? ORDER BY timestamp ASC', // Select specific columns
        [chatId],
        (err, rows) => {
          if (err) {
            console.error('[ChatRepository] Error getting chat messages:', err.message);
            reject(err);
          } else {
            // Map row data to ChatMessage structure, ensure files is an empty array if not stored
            resolve(rows.map(row => ({
                id: row.id,
                chatId: row.chat_id,
                content: row.content,
                sender: row.sender as 'user' | 'assistant' | 'system',
                timestamp: row.timestamp,
                files: [] // Assuming files are not stored in DB for now
            })) as ChatMessage[]);
          }
        }
      );
    });
  }

  /**
   * Saves the context state for a chat
   * @param chatId The ID of the chat
   * @param stateJson The JSON string representation of the context state
   */
  public async saveContextState(chatId: string, stateJson: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE chats SET context_state = ? WHERE id = ?',
        [stateJson, chatId],
        (err) => {
          if (err) {
            console.error('[ChatRepository] Error saving context state:', err.message);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Loads the context state for a chat
   * @param chatId The ID of the chat
   * @returns The JSON string representation of the context state, or null if not found
   */
  public async loadContextState(chatId: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT context_state FROM chats WHERE id = ?',
        [chatId],
        (err, row) => {
          if (err) {
            console.error('[ChatRepository] Error loading context state:', err.message);
            reject(err);
          } else {
            resolve(row ? (row as any).context_state : null);
          }
        }
      );
    });
  }
}
```
--- END OF FILE storage/repositories/chatRepository.ts ---

--- START OF FILE orchestrator/context/interactionContext.ts ---
```typescript
// src/orchestrator/context/interactionContext.ts
import { InputAnalysisResult, ExecutionStep, StepResult } from '../execution/types';

// Define possible processing statuses
type ProcessingStatus = 'idle' | 'analyzing' | 'planning' | 'executing' | 'evaluating' | 'needs_user_input' | 'complete' | 'error';

interface ChatMessage {
    role?: 'user' | 'assistant';
    content: string;
    timestamp: number;
    sender?: 'user' | 'assistant' | 'system'; // Include 'system' for internal messages
    chatId?: string;
    files?: string[];
}

interface InteractionContextState {
    chatId: string;
    chatHistory: ChatMessage[];
    // New state keys for orchestration
    processingStatus: ProcessingStatus;
    currentPlan: ExecutionStep[]; // Steps remaining to be executed
    lastStepResult?: StepResult; // Result of the last executed step
    finalResponseContent?: string; // The message to send when complete/error
    requiresUserInputReason?: string; // Why user input is needed

    // Dynamic keys from step results and analysis
    analysisResult?: InputAnalysisResult;
    userMessage: string; // Store the current user's message for the turn
    referencedFiles?: string[]; // Files referenced in the current user message
    projectInfo?: any; // Project context gathered at the start of the turn
    // ... other dynamic keys for step results like 'activeEditorContent', 'fileContent:xyz', etc.

    [key: string]: any; // Allow other dynamic properties
}

/**
 * Manages the state and data for a single conversation turn or session.
 * Accumulates chat history, analysis results, and step execution outcomes.
 * It is also used by the Orchestrator and Planner to manage the workflow state.
 */
export class InteractionContext {
    private state: InteractionContextState;

    constructor(chatId: string, initialState?: InteractionContextState) {
        // Initialize with a default state or restore from provided state
        this.state = initialState ? JSON.parse(JSON.stringify(initialState)) : {
            chatId: chatId,
            chatHistory: [],
            processingStatus: 'idle',
            currentPlan: [],
            userMessage: '' // Initialize userMessage
            // Other keys like analysisResult, lastStepResult, etc., are undefined initially
        };
         console.log(`[Context:${this.state.chatId}] Initialized with status: ${this.state.processingStatus}`);
    }

    getChatId(): string {
        return this.state.chatId;
    }

     /**
      * Adds a message to the chat history.
      * @param sender The sender of the message ('user', 'assistant', 'system')
      * @param content The message content
      * @param files Optional list of files associated with the message
      */
    addMessage(sender: 'user' | 'assistant' | 'system', content: string, files?: string[]) {
        // Ensure 'role' for model prompts if needed, but 'sender' is more precise here
        const role = sender === 'user' ? 'user' : 'assistant'; // Map system messages to assistant role for model history
        this.state.chatHistory.push({ sender, role, content, timestamp: Date.now(), files });
        console.log(`[Context:${this.state.chatId}] Added message (sender: ${sender}, len: ${content.length})`);
    }

    getHistory(limit?: number): ChatMessage[] {
        const history = [...this.state.chatHistory];
        if (limit !== undefined) {
            // Get the last 'limit' messages
            return history.slice(-limit);
        }
        return history;
    }

    /**
     * Gets formatted history string for model prompts.
     * Excludes 'system' messages from this view, as they are internal workflow updates.
     */
    getHistoryForModel(limit?: number): string {
        return this.getHistory(limit)
            .filter(msg => msg.sender !== 'system') // Exclude internal system messages
            .map(msg => {
                // Use the mapped role ('user' or 'assistant') for model context
                const role = msg.role || 'assistant'; // Fallback to assistant if role is missing (shouldn't happen with addMessage)
                return `${role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
            })
            .join('\n');
    }

    /**
     * Stores a value in the context state using a specific key.
     * Can be used for step results, temporary data, etc.
     * Avoids overwriting core state keys like chatId, chatHistory, processingStatus, currentPlan.
     */
    setValue(key: string, value: any) {
        const protectedKeys = ['chatId', 'chatHistory', 'processingStatus', 'currentPlan', 'lastStepResult', 'finalResponseContent', 'requiresUserInputReason', 'userMessage', 'referencedFiles', 'projectInfo'];
        if (protectedKeys.includes(key)) {
            // Allow setting these via direct property access or dedicated methods if needed,
            // but prevent accidental overwrite via generic setValue.
             // However, for dynamic storage of step results, we need to allow arbitrary keys.
             // Let's refine this: block setting the fixed state keys, but allow dynamic keys.
             if (['chatId', 'chatHistory'].includes(key)) {
                 console.warn(`[Context:${this.state.chatId}] Attempted to overwrite protected core state key: ${key}`);
                 return;
             }
             // Allow setting other keys, including the fixed state keys used by Orchestrator/Planner logic.
             // The planner/orchestrator logic will directly set processingStatus, currentPlan etc.
             // Dynamic step results use keys like 'activeEditorContent', 'fileContent:xyz', 'analysisResult', 'proposedFixResult'.
             // These should be allowed.
             this.state[key] = value;
             // console.log(`[Context:${this.state.chatId}] Set value for key '${key}'.`); // Too noisy
        } else {
           this.state[key] = value;
            // console.log(`[Context:${this.state.chatId}] Set dynamic value for key '${key}'.`); // Too noisy
        }
    }

    /**
     * Retrieves a value from the context state by key.
     */
    getValue<T = any>(key: string): T | undefined {
        return this.state[key] as T | undefined;
    }

     // --- Getters for core state ---
     getProcessingStatus(): ProcessingStatus {
         return this.state.processingStatus;
     }

     setProcessingStatus(status: ProcessingStatus): void {
         console.log(`[Context:${this.state.chatId}] Status changed: ${this.state.processingStatus} -> ${status}`);
         this.state.processingStatus = status;
     }

     getCurrentPlan(): ExecutionStep[] {
         return this.state.currentPlan;
     }

     setCurrentPlan(plan: ExecutionStep[]): void {
         this.state.currentPlan = plan;
     }

     getLastStepResult(): StepResult | undefined {
         return this.state.lastStepResult;
     }

     setLastStepResult(result: StepResult | undefined): void {
         this.state.lastStepResult = result;
     }

     getFinalResponseContent(): string | undefined {
         return this.state.finalResponseContent;
     }

     setFinalResponseContent(content: string | undefined): void {
         this.state.finalResponseContent = content;
     }

     getRequiresUserInputReason(): string | undefined {
        return this.state.requiresUserInputReason;
     }

     setRequiresUserInputReason(reason: string | undefined): void {
         this.state.requiresUserInputReason = reason;
     }


    // --- Getters for common structured data ---

    getAnalysisResult(): InputAnalysisResult | undefined {
        return this.getValue<InputAnalysisResult>('analysisResult');
    }

    getObjective(): string | undefined {
        return this.getAnalysisResult()?.objective;
    }

    getExtractedEntities(): InputAnalysisResult['extractedEntities'] | undefined {
        return this.getAnalysisResult()?.extractedEntities;
    }

    /**
     * Provides a flattened view of the context state suitable for parameter resolution
     * via {{placeholder}} patterns. Includes all simple values and string representations
     * of complex objects if needed, plus the formatted chat history string.
     * This is the data passed to the PromptBuilder and Tool Parameter Resolver.
     */
    getResolutionContext(): Record<string, any> {
        const resolutionContextData: Record<string, any> = {};
        // Copy all state keys EXCEPT chatHistory itself
        for (const key in this.state) {
            if (key !== 'chatHistory' && this.state[key] !== undefined) {
                 // Basic check to avoid putting massive objects directly unless intended
                 // For now, copy everything except chatHistory
                resolutionContextData[key] = this.state[key];
            }
        }
        // Add the specially formatted history string
        resolutionContextData['chatHistoryString'] = this.getHistoryForModel(10); // Limit history for model
        return resolutionContextData;
    }

    /**
     * Gets the full internal state. Useful for persistence.
     * Returns a deep copy to prevent external modification.
     */
    getState(): InteractionContextState {
        // Return a deep copy to protect internal state
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Restores the internal state from a saved state object.
     */
    restoreState(state: InteractionContextState) {
        if (state && state.chatId === this.state.chatId) {
            this.state = JSON.parse(JSON.stringify(state)); // Ensure deep copy on restore
            console.log(`[Context:${this.state.chatId}] State restored with status: ${this.state.processingStatus}`);
        } else {
            console.error(`[Context:${this.state.chatId}] Failed to restore state: Invalid state object or chatId mismatch.`);
        }
    }
}
```
--- END OF FILE orchestrator/context/interactionContext.ts ---

--- START OF FILE orchestrator/planner/plannerService.ts ---
```typescript
// src/orchestrator/planner/plannerService.ts

import { InteractionContext } from "../context/interactionContext";
import { ExecutionStep, StepResult, InputAnalysisResult } from "../execution/types";
import { ModelManager } from "../../models/config/ModelManager"; // Need ModelManager for Planner prompts if any

/**
 * Determines the next step in the execution flow based on the current context state
 * and evaluates the results of completed steps to update the context and plan.
 */
export class PlannerService {
    private modelManager: ModelManager; // Keep if planner uses AI prompts

    constructor(modelManager: ModelManager) {
        this.modelManager = modelManager;
        console.log('[PlannerService] Initialized.');
    }

    /**
     * Determines the *next* step to execute based on the current state of the context.
     * Updates the context's plan and status.
     * @param context The current interaction context.
     * @returns The next step to execute, or null if the process is complete or needs user input.
     */
    planNextStep(context: InteractionContext): ExecutionStep | null {
        const chatId = context.getChatId();
        const status = context.getProcessingStatus();
        const analysisResult = context.getAnalysisResult();
        const currentPlan = context.getCurrentPlan(); // Steps remaining in the plan
        const lastStepResult = context.getLastStepResult(); // Result of the step just evaluated

        console.log(`[PlannerService:${chatId}] Planning next step. Status: ${status}`);
        // console.log(`[PlannerService:${chatId}] Current Plan:`, currentPlan.map(s => s.name)); // Too noisy
        // console.log(`[PlannerService:${chatId}] Last Step Result:`, lastStepResult ? lastStepResult.step.name + ' - ' + (lastStepResult.success ? 'Success' : 'Failed') : 'None'); // Too noisy

        // Logic depends heavily on the current status and previous results

        if (status === 'analyzing') {
             // Initial analysis done. Now transition to planning based on the analysis result.
             if (!analysisResult) {
                 console.error(`[PlannerService:${chatId}] Analysis status but no analysisResult in context.`);
                 context.setProcessingStatus('error');
                 context.setFinalResponseContent("Failed to analyze your request.");
                 return null; // Stop process
             }

             let initialPlan: ExecutionStep[] = [];
             const intent = analysisResult.intent;

             console.log(`[PlannerService:${chatId}] Analysis complete. Intent: ${intent}. Building initial plan.`);

             switch (intent) {
                 case 'explainCode':
                     initialPlan = this.buildExplainCodePlan(context, analysisResult);
                     break;
                 case 'fixCode':
                     initialPlan = this.buildFixCodePlan(context, analysisResult);
                     break;
                 case 'conversation':
                 case 'unknown': // Default to conversation for unknown
                 default:
                     initialPlan = this.buildConversationPlan(context, analysisResult);
                     break;
             }

             context.setCurrentPlan(initialPlan);
             context.setProcessingStatus(initialPlan.length > 0 ? 'executing' : 'complete'); // Execute the first step immediately if plan exists
             console.log(`[PlannerService:${chatId}] Initial plan built (${initialPlan.length} steps). Transitioning to ${context.getProcessingStatus()}`);

             // If the plan is empty, the process is complete immediately after analysis
             if (initialPlan.length === 0) {
                 context.setFinalResponseContent("Understood your request, but no steps were planned based on the analysis."); // Default message
                 return null; // Stop process
             }

             // The Orchestrator loop will transition to 'executing' and pick up the first step.
             // We return null here because we've just updated the plan, not necessarily determined the *next* step to return from this function call yet.
             // The Orchestrator will check the plan in the 'executing' phase.
             return null;

        } else if (status === 'evaluating') {
            // Evaluation of the last step is complete (handled by evaluateStepResult).
            // The evaluateStepResult function should have updated the context based on the result.
            // Now, we need to decide what the *next* step should be based on the updated context.

            // Simple sequential execution: Shift the executed step off the plan.
            const updatedPlan = currentPlan.slice(1); // Remove the step that was just evaluated
            context.setCurrentPlan(updatedPlan);
            context.setLastStepResult(undefined); // Clear the last result after it's been evaluated

            if (updatedPlan.length > 0) {
                // There are more steps in the plan, continue executing.
                context.setProcessingStatus('executing');
                 console.log(`[PlannerService:${chatId}] Evaluation complete. More steps in plan. Transitioning to executing.`);
                 // Return null. The Orchestrator loop will pick up the new first step in the next iteration.
                return null; // updatedPlan[0]; // Alternatively, return the first step directly to skip a loop iteration
            } else {
                // Plan is empty. The process for this turn is complete.
                context.setProcessingStatus('complete');
                 console.log(`[PlannerService:${chatId}] Evaluation complete. Plan is empty. Transitioning to complete.`);
                 // Set a default final message if the specific handler didn't already set one based on final step results
                 if (!context.getFinalResponseContent()) {
                      // This fallback might be overridden by evaluateStepResult for the final step
                       context.setFinalResponseContent("Process completed.");
                 }

                return null; // Stop process
            }

        } else if (status === 'needs_user_input' || status === 'complete' || status === 'error' || status === 'idle') {
            // Process is stopped or idle. No step to plan.
             console.log(`[PlannerService:${chatId}] Process status ${status}. No step to plan.`);
            return null;

        } else if (status === 'executing') {
             // Planner should not be called when status is 'executing'.
             // This indicates a potential logic error in the Orchestrator loop.
             console.warn(`[PlannerService:${chatId}] Called planNextStep while status is 'executing'. This should not happen.`);
             // In a robust system, you might handle this by re-evaluating the state or erroring out.
             // For now, we'll let the Orchestrator loop handle the 'executing' phase.
             return null;
        }


         // Fallback: Should not be reached if all statuses are handled
         console.error(`[PlannerService:${chatId}] Reached end of planNextStep logic without a clear path. Status: ${status}. Setting status to error.`);
         context.setProcessingStatus('error');
         context.setFinalResponseContent("Internal planner error.");
         return null;
    }

     /**
      * Evaluates the result of a completed step and updates the context accordingly.
      * This sets up the context for the next planning phase.
      * @param context The current interaction context.
      * @param result The result of the step that just finished executing.
      */
    evaluateStepResult(context: InteractionContext, result: StepResult): void {
        const chatId = context.getChatId();
        console.log(`[PlannerService:${chatId}] Evaluating result for step '${result.step.name}'. Success: ${result.success}. Skipped: ${result.skipped}.`);

        if (!result.success) {
            console.warn(`[PlannerService:${chatId}] Step '${result.step.name}' failed. Error:`, result.error);
            // Decide how to handle failure:
            // - Stop the process and ask for user input?
            // - Try an alternative step (needs more complex planning logic)?
            // - Just log and continue, hoping subsequent steps can compensate?
            // For now, let's stop and inform the user for critical steps.
            // We could add a `failBehavior: 'stop' | 'continue'` to the step definition.
            // For simplicity, if a step fails, we might transition to 'needs_user_input' or 'error'.

            // Example basic failure handling:
            if (result.step.name.startsWith('readMentionedFile') || result.step.name === 'readActiveEditorForExplain' || result.step.name === 'readActiveEditorForFix') {
                 // Failed to read code context - likely cannot proceed with explain/fix
                 context.setProcessingStatus('needs_user_input');
                 context.setRequiresUserInputReason(`Failed to read necessary file content for step '${result.step.name}'. Error: ${result.error?.message || 'unknown error'}. Please ensure the file exists and is accessible.`);
                 context.setFinalResponseContent(context.getRequiresUserInputReason()); // Set final message immediately
                 console.log(`[PlannerService:${chatId}] Evaluation failure: Transitioning to needs_user_input.`);
            } else if (result.step.name === 'analyzeUserInput') {
                 context.setProcessingStatus('error');
                 context.setFinalResponseContent(`Failed to analyze your input. Error: ${result.error?.message || 'unknown error'}`);
                 console.log(`[PlannerService:${chatId}] Evaluation failure: Transitioning to error.`);
            } else if (result.step.name === 'proposeCodeFix') {
                 // Fix proposal failed, can't validate or apply
                 context.setProcessingStatus('needs_user_input');
                 context.setRequiresUserInputReason(`Failed to generate a code fix proposal. Error: ${result.error?.message || 'unknown error'}.`);
                 context.setFinalResponseContent(context.getRequiresUserInputReason()); // Set final message immediately
                 console.log(`[PlannerService:${chatId}] Evaluation failure: Transitioning to needs_user_input.`);
            } else if (result.step.name === 'validateProposedFix') {
                 // Validation failed - store feedback, but process might continue or stop depending on desired flow.
                 // For now, let the next planning step decide based on the validation result stored in context.
                 console.warn(`[PlannerService:${chatId}] Validation step failed unexpectedly. Error: ${result.error?.message || 'unknown error'}.`);
                 // Store validation failure details in context so the *next* planning step can see it.
                 context.setValue('proposedFixValidationPassed', false);
                 context.setValue('proposedFixValidationMessage', `Validation step failed unexpectedly: ${result.error?.message || 'unknown error'}`);
                 // Do NOT transition to error/needs_user_input here. Let the next plan phase decide based on the *stored* validation result.

            }
             // For other steps, maybe just log the error and let the next planning phase decide if the overall objective can still be met.

        } else if (result.skipped) {
             console.log(`[PlannerService:${chatId}] Step '${result.step.name}' was skipped by condition.`);
             // No specific action needed for skipping, context is already updated by StepExecutor if storeAs was set.
        } else {
            // Step succeeded. Evaluate the *meaning* of the result.
            switch (result.step.name) {
                 case 'analyzeUserInput':
                     // Store analysis result (already done by StepExecutor if storeAs was set)
                     // analysisResult is now available in context for planning
                     break;
                 case 'readActiveEditorForExplain':
                 case 'readActiveEditorForFix':
                      // Content is stored as 'activeEditorContent'. Planner can now see if code is available.
                     context.setValue('hasActiveEditorContent', !!result.result?.content);
                     break;
                 // Handle evaluation for dynamic file content steps (e.g., fileContent:xyz)
                 // StepExecutor already stores the content. Planner will check keys starting with 'fileContent:'.
                 // We could add a flag here if needed, e.g., context.setValue('hasMentionedFileContent', true);
                 case 'proposeCodeFix':
                      // Result is stored as 'proposedFixResult'.
                      // Extract and store proposedChanges and messageToUser separately for easier access.
                      const fixResult = result.result as { messageToUser?: string, proposedChanges?: any[], error?: string } | undefined;
                      if (fixResult) {
                           context.setValue('proposedFixMessage', fixResult.messageToUser);
                           context.setValue('proposedChanges', Array.isArray(fixResult.proposedChanges) ? fixResult.proposedChanges : undefined);
                           context.setValue('hasProposedChanges', Array.isArray(fixResult.proposedChanges) && fixResult.proposedChanges.length > 0);
                      } else {
                           context.setValue('proposedFixMessage', undefined);
                           context.setValue('proposedChanges', undefined);
                           context.setValue('hasProposedChanges', false);
                           console.warn(`[PlannerService:${chatId}] proposeCodeFix step succeeded but result was unexpected:`, result.result);
                      }
                      break;
                 case 'validateProposedFix':
                      // Result is stored as 'fixValidationResult'.
                      // Extract and store validation status and feedback separately.
                      const validationResult = result.result as { isValid?: boolean, feedback?: string, error?: string } | undefined;
                      if (validationResult) {
                           context.setValue('proposedFixValidationPassed', validationResult.isValid ?? false); // Default to false if isValid is missing
                           context.setValue('proposedFixValidationMessage', validationResult.feedback || validationResult.error || '');
                      } else {
                           context.setValue('proposedFixValidationPassed', false);
                           context.setValue('proposedFixValidationMessage', 'Validation step succeeded but result was unexpected.');
                            console.warn(`[PlannerService:${chatId}] validateProposedFix step succeeded but result was unexpected:`, result.result);
                      }
                     break;
                 case 'generateExplanation':
                      // Result is stored as 'explanationResult'.
                      // Extract the explanation string for potential final message use.
                      const explanationResult = result.result as { explanation?: string, error?: string } | undefined;
                       if (explanationResult?.explanation) {
                            context.setFinalResponseContent(explanationResult.explanation);
                       } else if (explanationResult?.error) {
                            // If the prompt returned an error within the JSON
                           console.warn(`[PlannerService:${chatId}] generateExplanation prompt returned error in result:`, explanationResult.error);
                           context.setFinalResponseContent(`Sorry, I encountered an error while generating the explanation: ${explanationResult.error}`);
                       } else {
                            // If the prompt succeeded but no explanation was provided
                           console.warn(`[PlannerService:${chatId}] generateExplanation step succeeded but no explanation found in result.`);
                           context.setFinalResponseContent("Successfully processed request, but the model didn't provide an explanation.");
                       }
                     break;
                 case 'generateConversationResponse':
                      // Result is stored as 'conversationResponse'.
                      // This prompt is expected to return the final message string directly.
                      const conversationResponse = result.result as string | { messageToUser?: string };
                       if (typeof conversationResponse === 'string') {
                           context.setFinalResponseContent(conversationResponse);
                       } else if (conversationResponse?.messageToUser) {
                            context.setFinalResponseContent(conversationResponse.messageToUser);
                       } else {
                            console.warn(`[PlannerService:${chatId}] generateConversationResponse step succeeded but result was unexpected:`, result.result);
                             context.setFinalResponseContent("Successfully processed request, but the model didn't provide a conversation response.");
                       }
                     break;

                 // Add evaluation logic for other step types here
                 default:
                     // For steps without specific evaluation logic, just log success.
                     console.log(`[PlannerService:${chatId}] No specific evaluation logic for step '${result.step.name}'.`);
                     break;
            }
        }

        // After evaluation, the PlannerService doesn't transition the status here.
        // The Orchestrator loop handles the status transition to 'planning' after evaluation.
    }


    /**
     * Builds the initial execution plan for the 'explainCode' intent.
     * @param context The current interaction context.
     * @param analysis The analysis result.
     * @returns An array of ExecutionStep definitions.
     */
    private buildExplainCodePlan(context: InteractionContext, analysis: InputAnalysisResult): ExecutionStep[] {
         const plan: ExecutionStep[] = [];
         const entities = analysis.extractedEntities;

         // 1. Gather code context
         // Always try active editor first
         plan.push({
             name: 'readActiveEditorForExplain',
             type: 'tool',
             execute: 'filesystem.getActiveEditorContent',
             params: {},
             storeAs: 'activeEditorContent'
         });

         // Read explicitly mentioned files
         const filesToReadExplicitly = (entities?.filesMentioned || []);
         if (filesToReadExplicitly.length > 0) {
             plan.push(...filesToReadExplicitly.map((filePath, index) => ({
                  name: `readMentionedFile:${index}:${filePath}`,
                  type: 'tool',
                  execute: 'filesystem.getFileContents',
                  params: { filePath: filePath },
                  // Store using a dynamic key based on file path
                  storeAs: `fileContent:${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`
             })));
         }

         // Add other context gathering steps based on entities (e.g., find function definitions)
         // ... (placeholder for future steps)

         // 2. Generate the explanation (conditional on having *some* code context)
         // The condition check for having code context happens in the prompt builder or implicitly in the prompt itself
         plan.push({
              name: 'generateExplanation',
              type: 'prompt',
              execute: 'explainCodePrompt',
              params: {}, // Context variables are passed by PromptExecutor via buildVariables
              storeAs: 'explanationResult'
         });

         // Note: No validation/feedback steps needed for simple explanation

         return plan;
    }

    /**
     * Builds the initial execution plan for the 'fixCode' intent.
     * @param context The current interaction context.
     * @param analysis The analysis result.
     * @returns An array of ExecutionStep definitions.
     */
    private buildFixCodePlan(context: InteractionContext, analysis: InputAnalysisResult): ExecutionStep[] {
         const plan: ExecutionStep[] = [];
         const entities = analysis.extractedEntities;

         // 1. Gather code context
         // Always try active editor first
         plan.push({
             name: 'readActiveEditorForFix',
             type: 'tool',
             execute: 'filesystem.getActiveEditorContent',
             params: {},
             storeAs: 'activeEditorContent'
         });

         // Read explicitly mentioned files
         const filesToReadExplicitly = (entities?.filesMentioned || []);
         if (filesToReadExplicitly.length > 0) {
             plan.push(...filesToReadExplicitly.map((filePath, index) => ({
                  name: `readMentionedFile:${index}:${filePath}`,
                  type: 'tool',
                  execute: 'filesystem.getFileContents',
                  params: { filePath: filePath },
                  storeAs: `fileContent:${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`
             })));
         }

          // Search for errors if mentioned
         const errorsToSearch = entities?.errorsMentioned || [];
         if (errorsToSearch.length > 0) {
             const errorsForSearch = errorsToSearch.slice(0, 3); // Limit search queries
             plan.push(...errorsForSearch.map((errorMsg, index) => ({
                 name: `searchError:${index}`,
                 type: 'tool',
                 execute: 'project.search', // Assuming 'project.search' tool exists
                 params: { query: errorMsg, scope: 'workspace' },
                 storeAs: `searchResults:${errorMsg.replace(/[^a-zA-Z0-9]/g, '_')}`
             })));
         }

         // Add other context gathering steps based on entities (e.g., find function definitions, find references)
         // ... (placeholder for future steps)


         // 2. Propose the fix (conditional on having *some* code context - checked by prompt builder)
         plan.push({
             name: 'proposeCodeFix',
             type: 'prompt',
             execute: 'fixCodePrompt',
             params: {}, // Context variables passed by PromptExecutor
             storeAs: 'proposedFixResult' // Stores { messageToUser, proposedChanges, error }
         });

         // 3. Validate the proposed fix (conditional on having proposed changes - checked by condition or prompt builder)
         // This step relies on 'proposedChanges' being stored in context by the previous step's evaluation
         plan.push({
             name: 'validateProposedFix',
             type: 'prompt', // Or 'tool' if code validation is a tool
             execute: 'codeValidator', // Assuming 'codeValidator' prompt/tool exists
             params: {}, // Context variables passed by PromptExecutor, including 'proposedChanges'
             storeAs: 'fixValidationResult', // Stores { isValid, feedback, error }
             // Optional: Add a condition here if validation should ONLY run if proposedChanges exists
             // condition: (contextData) => Array.isArray(contextData.proposedChanges) && contextData.proposedChanges.length > 0
             // Note: The prompt builder/prompt itself should also handle the case where proposedChanges is missing
         });

         // 4. Decision/Formatting based on validation result (Implicit in final message generation or could be another step)
         // The final message generation logic in Orchestrator will use 'proposedFixResult' and 'fixValidationResult' from context.

         return plan;
    }

     /**
      * Builds the initial execution plan for the 'conversation' intent.
      * @param context The current interaction context.
      * @param analysis The analysis result.
      * @returns An array of ExecutionStep definitions.
      */
    private buildConversationPlan(context: InteractionContext, analysis: InputAnalysisResult): ExecutionStep[] {
         const plan: ExecutionStep[] = [];

         // Simple conversation just needs the conversation responder prompt
         plan.push({
             name: 'generateConversationResponse',
             type: 'prompt',
             execute: 'conversationResponder',
             params: {}, // Context variables passed by PromptExecutor
             storeAs: 'conversationResponse' // Stores the generated message string
         });

         return plan;
    }

    // Potential future methods:
    // private buildPlanningEnginePlan(context: InteractionContext): ExecutionStep[] { ... call planningEngine prompt ... }
    // private evaluatePlanningEngineResult(context: InteractionContext, result: any): void { ... update plan based on AI planning ... }
}
```
--- END OF FILE orchestrator/planner/plannerService.ts ---

--- START OF FILE orchestrator/planner/index.ts ---
```typescript
export { PlannerService } from './plannerService';
```
--- END OF FILE orchestrator/planner/index.ts ---

--- START OF FILE orchestrator/orchestrator.ts ---
```typescript
import { InteractionContext } from './context/interactionContext';
import { StepExecutor } from './execution/stepExecutor';
import { ExecutionStep, InputAnalysisResult, StepResult, ProcessingStatus } from './execution/types';
import { BaseHandler } from './handlers/baseHandler';
import { ConversationHandler, ExplainCodeHandler, FixCodeHandler } from './handlers'; // Keep handlers for initial plan bootstrapping
import { ExecutorFactory } from './execution/executorFactory';
import { PlannerService } from './planner/plannerService'; // Import PlannerService
import { ModelManager } from '../models/config/ModelManager'; // Orchestrator needs ModelManager to pass to Planner

/**
 * Main orchestrator that manages conversations, analyzes input,
 * and drives the multi-step execution process using PlannerService and StepExecutor.
 * Manages interaction contexts per chat session and handles persistence loading/saving.
 */
export class Orchestrator {
    private contexts: Map<string, InteractionContext>; // In-memory cache of active contexts
    private stepExecutor: StepExecutor;
    private plannerService: PlannerService; // Inject PlannerService
    private modelManager: ModelManager; // Keep reference to ModelManager

    // Orchestrator now depends on ModelManager and PlannerService
    constructor(modelManager: ModelManager) {
        this.modelManager = modelManager; // Store ModelManager
        const registry = ExecutorFactory.createExecutorRegistry();
        this.stepExecutor = new StepExecutor(registry);
        this.plannerService = new PlannerService(modelManager); // Instantiate PlannerService

        this.contexts = new Map(); // Map<chatId, InteractionContext>
        console.log('[Orchestrator] Initialized with PlannerService.');
    }

     /**
      * Loads an existing context from state or creates a new one.
      * This method is internal to the Orchestrator/ChatService boundary.
      * @param chatId
      * @param savedState Optional saved state to restore
      * @returns The InteractionContext instance
      */
    private getOrCreateContext(chatId: string, savedState?: any): InteractionContext {
        if (this.contexts.has(chatId)) {
            const context = this.contexts.get(chatId)!;
             // If saved state is provided and different from current in-memory state, restore it
             // (This handles cases where ChatService loaded a fresh state from DB)
            if (savedState && JSON.stringify(context.getState()) !== JSON.stringify(savedState)) {
                 console.log(`[Orchestrator:${chatId}] Restoring context from saved state.`);
                 context.restoreState(savedState);
            } else {
                 console.log(`[Orchestrator:${chatId}] Using existing in-memory context.`);
            }
            return context;
        }

        console.log(`[Orchestrator:${chatId}] Creating new context.`);
        const newContext = new InteractionContext(chatId, savedState); // Restore state if provided
        this.contexts.set(chatId, newContext);
        return newContext;
    }

    /**
     * Clears the in-memory context for a chat. Should be called when a chat is deleted.
     * @param chatId
     */
    public clearContext(chatId: string): void {
        if (this.contexts.has(chatId)) {
            console.log(`[Orchestrator:${chatId}] Clearing in-memory context.`);
            this.contexts.delete(chatId);
        } else {
            console.warn(`[Orchestrator:${chatId}] Attempted to clear non-existent in-memory context.`);
        }
    }

    /**
     * The main entry point to process a user message.
     * Manages the multi-step execution loop based on the context state and planner.
     * This method is designed to be called by ChatService.
     * @param chatId The ID of the chat.
     * @param text The user's message.
     * @param files Files referenced by the user.
     * @param projectInfo Project context.
     * @param savedContextState The context state loaded from persistence for this chat.
     * @returns A Promise resolving to the final message content to be sent to the user.
     */
    public async processUserMessage(
        chatId: string,
        text: string,
        files: string[] | undefined,
        projectInfo: any,
        savedContextState: any // Pass loaded state from ChatService
    ): Promise<{ messageContent: string, updatedContextState: any }> {

        const context = this.getOrCreateContext(chatId, savedContextState);
        const initialStatus = context.getProcessingStatus();

        // If the process is currently 'idle', this is a new user turn.
        // Add user message and start the analysis/planning phase.
        if (initialStatus === 'idle' || initialStatus === 'complete' || initialStatus === 'error' || initialStatus === 'needs_user_input') {
            console.log(`[Orchestrator:${chatId}] Starting new turn. Status was: ${initialStatus}`);
            context.addMessage('user', text, files); // Add user message to history
            // Reset state for a new turn
            context.setCurrentPlan([]);
            context.setLastStepResult(undefined);
            context.setFinalResponseContent(undefined);
            context.setRequiresUserInputReason(undefined);
            context.setValue('analysisResult', undefined); // Clear previous analysis
            context.setValue('userMessage', text); // Store current user message
            context.setValue('referencedFiles', files || []); // Store referenced files
            context.setValue('projectInfo', projectInfo); // Store project info

            // Start with analysis
            context.setProcessingStatus('analyzing');
            console.log(`[Orchestrator:${chatId}] Transitioning to 'analyzing'.`);

        } else {
             // Process was ongoing (e.g., 'executing', 'evaluating') when user sent another message.
             // This scenario requires careful handling. For this implementation,
             // we'll treat a new user message while processing as a cancellation
             // of the current process and start a new turn with the latest message.
             // A more advanced system might interpret the new message in the context
             // of the current task (e.g., "wait, actually use file X instead").
             console.warn(`[Orchestrator:${chatId}] New message received while status was '${initialStatus}'. Aborting previous process and starting new turn.`);
             // Abort any pending model requests
             this.modelManager.abortRequest();
             // Clear current process state and restart
             context.addMessage('user', text, files); // Add the new user message
             context.setCurrentPlan([]);
             context.setLastStepResult(undefined);
             context.setFinalResponseContent(undefined);
             context.setRequiresUserInputReason(undefined);
             context.setValue('analysisResult', undefined); // Clear previous analysis
             context.setValue('userMessage', text); // Store current user message
             context.setValue('referencedFiles', files || []); // Store referenced files
             context.setValue('projectInfo', projectInfo); // Store project info

             // Start with analysis for the new message
             context.setProcessingStatus('analyzing');
             console.log(`[Orchestrator:${chatId}] Aborted previous process. Transitioning to 'analyzing' for new message.`);
        }


        // --- The Multi-Step Execution Loop ---
        // This loop runs synchronously for now.
        // In a real async system, each iteration might be triggered externally
        // after the previous step's result is saved and evaluated.
        while (['analyzing', 'planning', 'executing', 'evaluating'].includes(context.getProcessingStatus())) {
             const currentStatus = context.getProcessingStatus();
             console.log(`[Orchestrator:${chatId}] Loop iteration. Current status: ${currentStatus}`);

             try {
                if (currentStatus === 'analyzing') {
                    // Step: Analyze User Input
                    const analyzeStep: ExecutionStep = {
                        name: 'analyzeUserInput',
                        type: 'prompt',
                        execute: 'inputAnalyzer',
                        params: {}, // Params handled by buildInputAnalyzerVariables using context
                        storeAs: 'analysisResult',
                    };
                    const analysisResultStep = await this.stepExecutor.runStep(analyzeStep, context);

                    if (!analysisResultStep.success || !context.getAnalysisResult()) {
                        console.warn(`[Orchestrator:${chatId}] Input analysis step failed or result missing.`, analysisResultStep.error);
                        context.setProcessingStatus('error');
                        context.setFinalResponseContent(`Failed to analyze your input. Error: ${analysisResultStep.error?.message || 'Analysis error'}`);
                        break; // Exit loop on critical failure
                    } else {
                        console.log(`[Orchestrator:${chatId}] Input analysis step succeeded.`);
                        context.setProcessingStatus('planning'); // Move to planning phase
                        context.setLastStepResult(analysisResultStep); // Store result for potential planner evaluation (though analysis is usually just stored)
                    }

                } else if (currentStatus === 'planning') {
                    // Step: Plan Next Action(s)
                    console.log(`[Orchestrator:${chatId}] Status: Planning next step...`);
                    // Planner determines the next step(s) and updates context.currentPlan and status.
                    // It returns the *first* step to execute, or null if planning leads to completion/waiting.
                    const nextStepToExecute = this.plannerService.planNextStep(context);

                    if (context.getCurrentPlan().length > 0 && nextStepToExecute === null) {
                         // Planner updated the plan and set status to 'executing' or similar
                         console.log(`[Orchestrator:${chatId}] Planner updated plan. Transitioning to ${context.getProcessingStatus()}`);
                         // Loop will continue to the next status check ('executing')
                    } else if (context.getProcessingStatus() === 'planning') {
                         // Planner did not add steps or transition status, meaning the plan is complete or needs user input based on current context.
                         console.log(`[Orchestrator:${chatId}] Planner did not add steps. Assuming process complete or needs user input.`);
                         // The planner should have set the final status ('complete', 'needs_user_input', 'error').
                         // If not, force it to complete as no more steps were planned.
                         if (context.getProcessingStatus() === 'planning') {
                             context.setProcessingStatus('complete');
                              if (!context.getFinalResponseContent()) {
                                   context.setFinalResponseContent("Process completed (no further steps planned).");
                              }
                         }
                         break; // Exit loop if status is no longer iterative
                    }
                     // If nextStepToExecute was returned, the planner logic might expect the orchestrator
                     // to immediately execute it. However, our loop structure naturally transitions
                     // from 'planning' -> 'executing' in the next iteration if the plan is non-empty.

                } else if (currentStatus === 'executing') {
                    // Step: Execute Current Step in Plan
                    console.log(`[Orchestrator:${chatId}] Status: Executing step...`);
                    const plan = context.getCurrentPlan();
                    // Get the *first* step from the plan to execute
                    const stepToExecute = plan[0]; // Assumes Planner puts next step at index 0

                    if (!stepToExecute) {
                         console.warn(`[Orchestrator:${chatId}] Execution status but plan is empty. Setting status to error.`);
                         context.setProcessingStatus('error');
                         context.setFinalResponseContent("Internal error: Execution requested but no step in plan.");
                         break; // Exit loop
                    }

                    const stepResult = await this.stepExecutor.runStep(stepToExecute, context);
                    context.setLastStepResult(stepResult); // Store result for evaluation
                    context.setProcessingStatus('evaluating'); // Move to evaluation phase
                    console.log(`[Orchestrator:${chatId}] Step execution finished for '${stepToExecute.name}'. Success: ${stepResult.success}. Transitioning to 'evaluating'.`);
                    context.addMessage('system', `Step '${stepToExecute.name}' completed. Success: ${stepResult.success}.`); // Log step completion

                } else if (currentStatus === 'evaluating') {
                    // Step: Evaluate Last Step's Result
                     console.log(`[Orchestrator:${chatId}] Status: Evaluating step result...`);
                     const lastResult = context.getLastStepResult();
                     if (!lastResult) {
                         console.warn(`[Orchestrator:${chatId}] Evaluation status but no lastStepResult. Setting status to error.`);
                         context.setProcessingStatus('error');
                         context.setFinalResponseContent("Internal error: No step result to evaluate.");
                          break; // Exit loop
                     }

                     // Planner evaluates the result and updates the context (e.g., adds flags, modifies plan).
                     this.plannerService.evaluateStepResult(context, lastResult);

                     // After evaluation, remove the executed step from the plan
                     const updatedPlan = context.getCurrentPlan().slice(1); // Remove the first step
                     context.setCurrentPlan(updatedPlan);
                     context.setLastStepResult(undefined); // Clear evaluated result

                     // Transition back to planning to decide the next action based on evaluation
                     context.setProcessingStatus('planning');
                     console.log(`[Orchestrator:${chatId}] Evaluation complete. Transitioning to 'planning'.`);
                     context.addMessage('system', `Evaluation complete for '${lastResult.step.name}'. Planning next action.`);

                }

             } catch (error: any) {
                 console.error(`[Orchestrator:${chatId}] UNEXPECTED Error during process loop (status: ${context.getProcessingStatus()}):`, error);
                 context.setProcessingStatus('error');
                 context.setFinalResponseContent(`An unexpected error occurred during processing: ${error.message}`);
                 context.addMessage('system', `Process failed. Status: ${context.getProcessingStatus()}. Error: ${error.message}`);
                 break; // Exit loop on unexpected error
             }

             // IMPORTANT: In a synchronous loop, we just continue.
             // In an async implementation, saving the context here would trigger the next iteration.
             // For this synchronous version, the loop condition handles progression.
        }

        // --- Loop finished ---
        // Status is now 'complete', 'error', or 'needs_user_input'.
        const finalStatus = context.getProcessingStatus();
        console.log(`[Orchestrator:${chatId}] Process loop finished with status: ${finalStatus}`);

        // Generate the final message content based on the final status and context state.
        let finalMessageContent = context.getFinalResponseContent();
        if (!finalMessageContent) {
             // Fallback messages if not set by planner/evaluation
             if (finalStatus === 'complete') {
                 finalMessageContent = "Process completed successfully.";
             } else if (finalStatus === 'needs_user_input') {
                 finalMessageContent = context.getRequiresUserInputReason() || "The process requires your input to continue.";
             } else if (finalStatus === 'error') {
                 finalMessageContent = `An error occurred: ${context.getFinalResponseContent() || 'See logs for details.'}`; // Use content if set, else generic
             } else {
                 finalMessageContent = `Process ended with unexpected status: ${finalStatus}`;
             }
        }

        // Reset status back to idle for the next user message
        if (finalStatus !== 'needs_user_input') { // Keep 'needs_user_input' status until user responds
             context.setProcessingStatus('idle');
             console.log(`[Orchestrator:${chatId}] Setting final status to 'idle'.`);
        } else {
             console.log(`[Orchestrator:${chatId}] Keeping status as 'needs_user_input'.`);
        }

         // Return the final message and the updated context state for persistence
        return {
            messageContent: finalMessageContent,
            updatedContextState: context.getState()
        };
    }

    // Orchestrator no longer needs handle() methods for intents directly.
    // The PlannerService determines the steps based on analysis.

    public getInteractionContext(chatId: string): InteractionContext | undefined {
        return this.contexts.get(chatId);
    }

     // Add a dispose method if necessary to clean up contexts
     dispose(): void {
         console.log('[Orchestrator] Disposing. Clearing all in-memory contexts.');
         this.contexts.clear();
     }
}
```
--- END OF FILE orchestrator/orchestrator.ts ---

--- START OF FILE orchestrator/execution/types.ts ---
```typescript

export type PromptVariables = Record<string, any>;

export interface InputAnalysisResult {
  intent: 'conversation' | 'explainCode' | 'fixCode' | 'unknown';
  objective: string;
  extractedEntities: {
    filesMentioned: string[];
    functionsMentioned: string[];
    errorsMentioned: string[];
    customKeywords: string[];
    [key: string]: any; // Allow other entities
  };
  confidence: number;
  [key: string]: any; // Allow other analysis data
}

// Define possible processing statuses for the InteractionContext
export type ProcessingStatus = 'idle' | 'analyzing' | 'planning' | 'executing' | 'evaluating' | 'needs_user_input' | 'complete' | 'error';


// Define a single step in an execution flow.
// Can be a tool call or a model prompt interaction.
export interface ExecutionStep {
  /** Unique name for this step within its context (useful for logging/debugging). */
  name: string;
  /** The type of execution: 'tool' or 'prompt'. */
  type: 'tool' | 'prompt';
  /** The specific tool name or prompt type to execute. */
  execute: string; // e.g., 'filesystem.getFileContents' or 'inputAnalyzer'
  /** Parameters for the tool or prompt. For tool steps, can contain {{placeholder}} patterns. For prompt steps, these are non-contextual config params (e.g., temperature). */
  params?: Record<string, any>;
  /** Optional condition function to determine if this step should run. Checks against the context data used for parameter resolution. */
  condition?: (contextData: Record<string, any>) => boolean;
  /** Key in the InteractionContext to store the successful result of this step. */
  storeAs?: string;
  /** Optional: Timeout for the step in milliseconds. */
  timeout?: number;
  // Add other properties as needed (e.g., retries, error handling behavior)
}

/**
 * Represents the outcome of executing a single step.
 */
export interface StepResult<T = any> {
    /** Indicates if the step completed successfully. */
    success: boolean;
    /** The actual result from the tool/prompt if successful. */
    result?: T;
    /** The error object if the step failed. */
    error?: any;
    /** Timestamp when the step finished. */
    timestamp: number;
    /** Reference to the step definition that was executed. */
    step: ExecutionStep;
    /** If the step was skipped due to a condition. */
    skipped?: boolean;
}


export interface IExecutor {
  /**
   * Executes the specified action with the provided parameters
   * @param action The action identifier to execute
   * @param params Parameters required by the action. For prompt executors, this is the full context data.
   * @returns Promise resolving to the result of the execution
   */
  execute(action: string, params: Record<string, any>): Promise<any>;

  /**
   * Checks if this executor can handle the specified action
   * @param action The action identifier to check
   * @returns true if this executor can handle the action, false otherwise
   */
  canExecute(action: string): boolean;
}

// --- Updated PromptType ---
// Define types for prompt system
export type PromptType =
  | 'inputAnalyzer'
  | 'planningEngine' // Added Planning Engine prompt type (if used)
  | 'editing' // Example placeholder
  | 'examination' // Example placeholder
  | 'projectManagement' // Example placeholder
  | 'projectSearch' // Example placeholder
  | 'resultEvaluator' // Example placeholder
  | 'conversationResponder'
  | 'explainCodePrompt'
  | 'fixCodePrompt'
  | 'codeValidator';

// --- Standardized Prompt Variable Interfaces ---

/** Base interface for common variables available to most prompts. */
export interface BasePromptVariables {
    userMessage: string; // The current user's message for this turn
    chatHistory: string; // Recent conversation history (formatted string, excludes system messages)
    objective?: string; // The user's overall objective for the turn
    extractedEntities?: InputAnalysisResult['extractedEntities']; // Entities extracted from user input
    projectContext?: any; // Information about the current project/workspace (gathered once per turn)
    activeEditorContent?: string; // Content of the active text editor (if gathered)
    // Dynamic keys for results stored by steps:
    [key: `fileContent:${string}`]: string | undefined; // Content of specific files, keyed by a sanitized path
    [key: `searchResults:${string}`]: any | undefined; // Results from search operations, keyed by query/identifier
    analysisResult?: InputAnalysisResult; // The full analysis result object
    proposedFixResult?: any; // The raw result from the fixCodePrompt step
    fixValidationResult?: any; // The raw result from the codeValidator step
    // Add other common keys as needed for prompt builders to access results
}

// Specific prompt variable interfaces can extend BasePromptVariables


```
--- END OF FILE orchestrator/execution/types.ts ---

--- START OF FILE orchestrator/execution/PromptExecutor.ts ---
```typescript
// src/orchestrator/execution/PromptExecutor.ts

import { executeModelInteraction } from "../../models/promptSystem";
import { IExecutor, PromptType } from "./types";


/**
 * PromptExecutor implements the IExecutor interface for AI prompt-based actions.
 * It delegates to promptSystem for model interactions.
 */
export class PromptExecutor implements IExecutor {
  private readonly validPromptTypes: Set<string>;

  constructor() {
    // Initialize with all known prompt types from the PromptType union
    // Add 'planningEngine' if you decide to implement it as a prompt
    const allPromptTypes: PromptType[] = [
      'inputAnalyzer',
      'resultEvaluator',
      'conversationResponder',
      'explainCodePrompt',
      'fixCodePrompt',
      'codeValidator',
      'planningEngine' // Added if you have a planning prompt
    ];
    this.validPromptTypes = new Set(allPromptTypes);
  }

  /**
   * Checks if this executor can handle the specified prompt action
   * @param action The prompt type to check
   * @returns true if the prompt type is recognized
   */
  canExecute(action: string): boolean {
    // Check if the action is a valid PromptType
    return this.validPromptTypes.has(action as PromptType);
  }

  /**
   * Executes the specified prompt with the provided parameters.
   * For PromptExecutor, the 'params' parameter is the full resolution context data.
   * @param action The prompt type to execute
   * @param fullContextData The full resolution context data from InteractionContext
   * @returns Promise resolving to the result of the model interaction
   */
  async execute(action: string, fullContextData: Record<string, any>): Promise<any> {
    // Cast action to PromptType as we've validated it in canExecute
    // Pass the full context data directly to executeModelInteraction
    // The executeModelInteraction function will call the correct buildVariables function
    // for the action (PromptType) to format the fullContextData for the prompt template.
    return executeModelInteraction(action as PromptType, fullContextData);
  }
}
```
--- END OF FILE orchestrator/execution/PromptExecutor.ts ---

--- START OF FILE orchestrator/handlers/baseHandler.ts ---
```typescript
// src/orchestrator/handlers/baseHandler.ts

import { InteractionContext } from '../context/interactionContext';
import { StepExecutor } from '../execution/stepExecutor'; // Keep StepExecutor if handlers need to run initial steps directly (less ideal)
import { ExecutionStep, StepResult, InputAnalysisResult } from '../execution/types';

/**
 * Base class for all intent-specific handlers.
 * In the new architecture, handlers are primarily responsible for
 * building the *initial plan* based on the analysis result.
 * The Orchestrator then takes over to execute the plan iteratively.
 */
export abstract class BaseHandler {
    protected context: InteractionContext;
    // StepExecutor is less critical here now, as Orchestrator runs steps
    // protected stepExecutor: StepExecutor;

    constructor(context: InteractionContext /*, stepExecutor: StepExecutor*/) {
        this.context = context;
        // this.stepExecutor = stepExecutor;
    }

    /**
     * Abstract method to be implemented by concrete handlers.
     * Contains the logic to read the analysis result from the context
     * and build the *initial plan* (an array of ExecutionStep definitions)
     * for the Orchestrator to execute.
     * This method is called by the Orchestrator (or potentially the Planner)
     * after the input analysis is complete.
     * Handlers should *not* execute steps directly in this new model.
     * Handlers should return the initial plan array.
     * They can also set an initial message in the context if needed.
     * @returns An array of ExecutionStep definitions representing the initial plan.
     */
    abstract buildInitialPlan(): ExecutionStep[]; // Return type is array of steps

     /**
      * Optional method for handlers to set an initial message after analysis.
      * @returns An optional string message to be added to the chat after analysis.
      */
     getInitialMessage(): string | undefined {
         return undefined; // Default: no initial message from handler
     }

    // Helper methods like runExecutionStep, runStepsSequence, runStepsParallel
    // are now typically used by the Orchestrator/StepExecutor, not the handlers.
    // Remove or mark as deprecated/internal if they remain.
}
```
--- END OF FILE orchestrator/handlers/baseHandler.ts ---

--- START OF FILE orchestrator/handlers/conversationHandler.ts ---
```typescript
// src/orchestrator/handlers/conversationHandler.ts

import { BaseHandler } from './baseHandler';
import { ExecutionStep } from '../execution/types';
// No longer need StepExecutor import here

/**
 * Handler specifically for 'conversation' intent.
 * In the new architecture, it simply defines the initial step
 * to generate a response from the conversation model.
 */
export class ConversationHandler extends BaseHandler {
    /**
     * Builds the initial plan for the 'conversation' intent.
     * @returns An array containing the single step to generate the conversation response.
     */
    buildInitialPlan(): ExecutionStep[] {
        console.log(`[ConversationHandler:${this.context.getChatId()}] Building initial plan for conversation intent.`);

        // Define the execution step to call the conversation model
        const generateResponseStep: ExecutionStep = {
            name: 'generateConversationResponse',
            type: 'prompt',
            execute: 'conversationResponder',
            params: {}, // Context variables are passed by PromptExecutor via buildVariables
            storeAs: 'conversationResponse' // Stores the raw result (expected to be string or object)
        };

        // The plan is just this single step
        return [generateResponseStep];
    }

     /**
      * Provides an optional initial message.
      * @returns An initial message string.
      */
     getInitialMessage(): string {
         // Could make this more dynamic based on project info, time of day, etc.
         return "Okay, I'm ready to chat. What's on your mind?";
     }
}
```
--- END OF FILE orchestrator/handlers/conversationHandler.ts ---

--- START OF FILE orchestrator/handlers/explainCodeHandler.ts ---
```typescript
// src/orchestrator/handlers/explainCodeHandler.ts

import { BaseHandler } from './baseHandler';
import { ExecutionStep, InputAnalysisResult } from '../execution/types';
// No longer need StepExecutor import here

/**
 * Handler specifically for 'explainCode' intent.
 * Defines the initial plan to gather context and generate an explanation.
 */
export class ExplainCodeHandler extends BaseHandler {

    /**
     * Builds the initial plan for the 'explainCode' intent.
     * @returns An array of ExecutionStep definitions.
     */
    buildInitialPlan(): ExecutionStep[] {
        const chatId = this.context.getChatId();
        const analysis = this.context.getAnalysisResult(); // Analysis result is in context

        if (!analysis) {
             console.error(`[ExplainCodeHandler:${chatId}] Analysis result missing from context.`);
             // In a real scenario, the Orchestrator/Planner should handle this error upstream.
             // Returning an empty plan signifies no steps can be taken.
             return [];
        }

        const entities = analysis.extractedEntities;

        console.log(`[ExplainCodeHandler:${chatId}] Building initial plan for explainCode intent.`);

        const plan: ExecutionStep[] = [];

        // --- Step 1: Recopilación de Contexto ---
        // Define all relevant context gathering steps upfront in the initial plan.
        // The Orchestrator will execute these sequentially or the Planner might reorder/add more.

        // Always try to get the active editor content
        plan.push({
            name: 'readActiveEditorForExplain',
            type: 'tool',
            execute: 'filesystem.getActiveEditorContent',
            params: {},
            storeAs: 'activeEditorContent' // Standard key for active editor content
        });

        // Read any specific files the user mentioned
        const filesToReadExplicitly = (entities?.filesMentioned || []);
        if (filesToReadExplicitly.length > 0) {
             console.log(`[ExplainCodeHandler:${chatId}] Adding steps to read explicitly mentioned files: ${filesToReadExplicitly.join(', ')}.`);
             plan.push(...filesToReadExplicitly.map((filePath, index) => ({
                  name: `readMentionedFile:${index}:${filePath}`,
                  type: 'tool',
                  execute: 'filesystem.getFileContents',
                  params: { filePath: filePath },
                  // Store using a dynamic key based on file path
                  storeAs: `fileContent:${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`
             })));
        }

        // Add other initial gathering steps here if needed (e.g., initial search based on keywords)
        // ... (placeholder for future steps)


        // --- Step 2: Generar la Explicación Final usando el Contexto Recopilado ---
        // Define the step to call the single explanation prompt.
        // This step will be executed *after* the gathering steps by the Orchestrator.
        plan.push({
            name: 'generateExplanation',
            type: 'prompt',
            execute: 'explainCodePrompt', // Use the prompt type
            params: {}, // Context variables are passed by PromptExecutor via buildVariables
            storeAs: 'explanationResult' // Store the parsed result object { explanation: string, ... }
        });

        // Note: The PlannerService's evaluateStepResult for 'explanationResult'
        // will extract the explanation string and potentially set it as the final response.

        return plan;
    }

     /**
      * Provides an optional initial message.
      * @returns An initial message string based on the objective.
      */
     getInitialMessage(): string | undefined {
         const objective = this.context.getObjective();
         if (objective) {
             return `Okay, I'll gather the code context and explain: "${objective}".`;
         }
         return "Okay, I'll gather the code context and prepare an explanation.";
     }
}
```
--- END OF FILE orchestrator/handlers/explainCodeHandler.ts ---

--- START OF FILE orchestrator/handlers/fixCodeHandler.ts ---
```typescript
// src/orchestrator/handlers/fixCodeHandler.ts

import { BaseHandler } from './baseHandler';
import { ExecutionStep, InputAnalysisResult } from '../execution/types';
// No longer need StepExecutor import here

/**
 * Handler specifically for 'fixCode' intent.
 * Defines the initial plan to gather context, propose a fix, and validate it.
 */
export class FixCodeHandler extends BaseHandler {

    /**
     * Builds the initial plan for the 'fixCode' intent.
     * @returns An array of ExecutionStep definitions.
     */
    buildInitialPlan(): ExecutionStep[] {
        const chatId = this.context.getChatId();
        const analysis = this.context.getAnalysisResult(); // Analysis result is in context

         if (!analysis) {
             console.error(`[FixCodeHandler:${chatId}] Analysis result missing from context.`);
             // In a real scenario, the Orchestrator/Planner should handle this error upstream.
             // Returning an empty plan signifies no steps can be taken.
             return [];
         }

        const entities = analysis.extractedEntities;

        console.log(`[FixCodeHandler:${chatId}] Building initial plan for fixCode intent.`);

        const plan: ExecutionStep[] = [];

        // --- Step 1: Recopilación de Contexto ---
        // Define all relevant context gathering steps upfront in the initial plan.

        // Always try to get the active editor content
        plan.push({
            name: 'readActiveEditorForFix',
            type: 'tool',
            execute: 'filesystem.getActiveEditorContent',
            params: {},
            storeAs: 'activeEditorContent' // Standard key for active editor content
        });

        // Read any specific files the user mentioned
        const filesToReadExplicitly = (entities?.filesMentioned || []);
        if (filesToReadExplicitly.length > 0) {
             console.log(`[FixCodeHandler:${chatId}] Adding steps to read explicitly mentioned files: ${filesToReadExplicitly.join(', ')}.`);
             plan.push(...filesToReadExplicitly.map((filePath, index) => ({
                  name: `readMentionedFile:${index}:${filePath}`,
                  type: 'tool',
                  execute: 'filesystem.getFileContents',
                  params: { filePath: filePath },
                  storeAs: `fileContent:${filePath.replace(/[^a-zA-Z0-9]/g, '_')}` // Store with standard dynamic key
             })));
        }

        // Search for errors if mentioned
        const errorsToSearch = entities?.errorsMentioned || [];
        if (errorsToSearch.length > 0) {
             console.log(`[FixCodeHandler:${chatId}] Errors mentioned, adding search steps.`);
             const errorsForSearch = errorsToSearch.slice(0, 3); // Limit search queries
             plan.push(...errorsForSearch.map((errorMsg, index) => ({
                 name: `searchError:${index}`,
                 type: 'tool',
                 execute: 'project.search', // Assuming 'project.search' tool exists
                 params: { query: errorMsg, scope: 'workspace' },
                 storeAs: `searchResults:${errorMsg.replace(/[^a-zA-Z0-9]/g, '_')}`
             })));
        }

        // Add other initial gathering steps here if needed (e.g., find function definitions, find references)
        // ... (placeholder for future steps)


        // --- Step 2: Proponer la Solución (Generar Cambios) ---
        // Define the step to call the single fix prompt.
        plan.push({
            name: 'proposeCodeFix',
            type: 'prompt',
            execute: 'fixCodePrompt', // Use the prompt type
            params: {}, // Context variables passed by PromptExecutor via buildVariables
            storeAs: 'proposedFixResult' // Store the parsed result object { messageToUser, proposedChanges, ... }
        });

        // --- Step 3: Validate the proposed fix ---
        // This step relies on 'proposedChanges' being stored in context by the previous step's evaluation
        plan.push({
            name: 'validateProposedFix',
            type: 'prompt', // Or 'tool' if code validation is a tool
            execute: 'codeValidator', // Assuming 'codeValidator' prompt/tool exists
            params: {}, // Context variables passed by PromptExecutor, including 'proposedChanges'
            storeAs: 'fixValidationResult', // Store the validation result { isValid, feedback, error }
             // The PlannerService's evaluateStepResult for 'validateProposedFix' will
             // store validation status/message in context.
        });

        // Note: The final message generation logic in Orchestrator will use
        // 'proposedFixResult' and 'fixValidationResult' from context.

        return plan;
    }

     /**
      * Provides an optional initial message.
      * @returns An initial message string based on the objective.
      */
     getInitialMessage(): string | undefined {
         const objective = this.context.getObjective();
         if (objective) {
             return `Okay, I'll analyze the code and propose a fix for: "${objective}".`;
         }
         return "Okay, I'll analyze the code and propose a fix.";
     }
}
```
--- END OF FILE orchestrator/handlers/fixCodeHandler.ts ---

--- START OF FILE orchestrator/index.ts ---
```typescript
export { Orchestrator } from './orchestrator';
export { InteractionContext } from './context/interactionContext';
export { StepExecutor } from './execution/stepExecutor';
export * from './execution/types';
export * from './handlers';
export * from './planner'; // Export the planner service
```
--- END OF FILE orchestrator/index.ts ---

--- START OF FILE chatService.ts ---
```typescript
import * as vscode from 'vscode';
import { IChatRepository } from '../storage/interfaces/IChatRepository';
import { ChatRepository } from '../storage/repositories/chatRepository';
import { Chat, ChatMessage } from '../storage/interfaces/entities';
import { ModelManager } from '../models/config/ModelManager';
import { Orchestrator, InteractionContext, ProcessingStatus } from '../orchestrator'; // Import Orchestrator and relevant types
import { getProjectInfo } from '../modules/getProjectInfo';

/**
 * Service for managing conversation interactions and integrating the AI model.
 * This service orchestrates the steps of a chat turn by interacting with the Orchestrator.
 * It also handles persistence of chat history and context state.
 */
export class ChatService {
  private repository: IChatRepository;
  private orchestrator: Orchestrator; // Orchestrator handles the complex process logic
  private modelManager: ModelManager; // Keep ModelManager reference
  private activeChatId: string | null = null; // Currently active chat ID

  constructor(context: vscode.ExtensionContext, modelManager: ModelManager, orchestrator: Orchestrator) {
    this.repository = new ChatRepository(context);
    this.modelManager = modelManager;
    this.orchestrator = orchestrator; // Orchestrator is now injected
  }

  /**
   * Creates a new conversation (saves to DB)
   * Initializes a new InteractionContext state for it.
   */
  public async createConversation(title: string = 'New Conversation'): Promise<Chat> {
    const newChatId = randomUUID(); // Generate ID upfront

    // Create an empty InteractionContext state for the new chat
    const initialContextState = new InteractionContext(newChatId).getState();

    const chat: Chat = {
      id: newChatId,
      title,
      timestamp: Date.now(),
      context_state: JSON.stringify(initialContextState) // Stringify the initial state
    };

    const newChat = await this.repository.create(chat);
    this.activeChatId = newChat.id;
    console.log(`[ChatService] Created new chat: ${newChat.id}`);

    // Initialize the Orchestrator's in-memory context as well
    this.orchestrator.getInteractionContext(newChat.id, initialContextState); // Orchestrator will create/get and restore if needed

    return newChat;
  }

   /**
    * Prepares the service for a new conversation.
    * Resets active chat state locally. The actual chat is created on first message.
    */
  public prepareNewConversation(): void {
      // If there's an active chat and its process is not complete/idle, maybe abort it?
      // For now, just clearing the activeId allows the next sendMessage to create a new chat.
      if (this.activeChatId) {
           console.log(`[ChatService] Preparing new chat. Clearing active chat ID ${this.activeChatId}.`);
           // Optional: Abort any ongoing process for the old chat
           // This requires the Orchestrator to expose a method to abort a specific context's process.
           // this.orchestrator.abortProcess(this.activeChatId);
           this.activeChatId = null;
      } else {
          console.log('[ChatService] Preparing new chat. No active chat to clear.');
      }
  }


  /**
   * Gets all conversations
   */
  public async getConversations(): Promise<Chat[]> {
    const chats = await this.repository.findAll();
    console.log(`[ChatService] Retrieved ${chats.length} chats`);
    return chats;
  }

  /**
   * Loads a specific conversation and its messages.
   * Also loads and restores the InteractionContext state.
   * @returns Promise resolving to the chat messages.
   */
  public async loadConversation(chatId: string): Promise<ChatMessage[]> {
    const chat = await this.repository.findById(chatId);
    if (!chat) {
      const error = new Error(`Conversation with ID ${chatId} not found`);
      console.error('[ChatService]', error.message);
      throw error;
    }

    this.activeChatId = chatId;
    console.log(`[ChatService] Loaded chat ${chatId}.`);

    // Load context state
    const contextStateJson = chat.context_state;
    let savedContextState: any | undefined;
    if (contextStateJson) {
      try {
        savedContextState = JSON.parse(contextStateJson);
        console.log(`[ChatService] Loaded context state for chat ${chatId}. Status: ${savedContextState?.processingStatus}`);
      } catch (e) {
        console.error(`[ChatService] Failed to parse context state for chat ${chatId}:`, e);
        savedContextState = undefined; // Treat as no saved state
      }
    } else {
         console.log(`[ChatService] No context state found for chat ${chatId}.`);
    }

    // Restore/initialize the Orchestrator's in-memory context with the loaded state
    // Orchestrator handles whether to create new or restore existing based on chatId
    this.orchestrator.getOrCreateContext(chatId, savedContextState);


    const messages = await this.repository.getMessages(chatId);
    console.log(`[ChatService] Loaded ${messages.length} messages for chat ${chatId}.`);
    return messages;
  }

  /**
   * Updates a conversation's title
   */
  public async updateConversationTitle(chatId: string, title: string): Promise<void> {
    console.log(`[ChatService] Updating title for chat ${chatId} to "${title}"`);
    return this.repository.updateTitle(chatId, title);
  }

  /**
   * Deletes a conversation and its messages.
   * Also clears the in-memory context.
   */
  public async deleteConversation(chatId: string): Promise<void> {
    console.log(`[ChatService] Deleting chat ${chatId}`);
    if (this.activeChatId === chatId) {
      this.activeChatId = null;
      this.prepareNewConversation(); // Reset active chat state
      console.log('[ChatService] Deleted active chat, preparing new chat state.');
    }
    this.orchestrator.clearContext(chatId); // Clear in-memory context
    return this.repository.delete(chatId);
  }

  /**
   * Gets the current conversation ID
   */
  public getCurrentConversationId(): string | null {
    return this.activeChatId;
  }

  /**
   * Sends a message in the current conversation.
   * This triggers the Orchestrator's multi-step process.
   * @returns Promise resolving to the assistant's final message content.
   */
  public async sendMessage(text: string, files?: string[]): Promise<ChatMessage> {
    // 1. Ensure a chat exists or create a new one if none is active
    if (!this.activeChatId) {
       const newChat = await this.createConversation(); // createConversation sets activeChatId and initializes context
       this.activeChatId = newChat.id;
       console.log(`[ChatService] No active chat. Created new chat: ${this.activeChatId}`);
    }

    const chatId = this.activeChatId!; // We now have a guaranteed chatId

    // 2. Load the latest context state from the database
    // This is important if the extension was closed and reopened between turns,
    // or if multiple VS Code windows/extensions were interacting with the same DB (less common).
    // Even if Orchestrator has an in-memory copy, ensure it's based on the latest persisted state.
    let savedContextStateJson: string | null = null;
    try {
         savedContextStateJson = await this.repository.loadContextState(chatId);
    } catch (e) {
         console.error(`[ChatService] Failed to load context state for chat ${chatId}:`, e);
         // Continue with potentially empty or old in-memory context
    }
    let savedContextState: any | undefined;
     if (savedContextStateJson) {
         try {
             savedContextState = JSON.parse(savedContextStateJson);
         } catch (e) {
             console.error(`[ChatService] Failed to parse loaded context state for chat ${chatId}:`, e);
             savedContextState = undefined;
         }
     }


    // 3. Pass the message and loaded context state to the Orchestrator
    console.log(`[ChatService] Passing message to Orchestrator for chat ${chatId}.`);
    const { messageContent, updatedContextState } = await this.orchestrator.processUserMessage(
        chatId,
        text,
        files,
        await getProjectInfo(), // Fetch project info for the start of the turn
        savedContextState // Pass the loaded state
    );

    // 4. Save the updated context state back to the database
    try {
         await this.repository.saveContextState(chatId, JSON.stringify(updatedContextState));
         console.log(`[ChatService] Saved updated context state for chat ${chatId}.`);
    } catch (e) {
         console.error(`[ChatService] Failed to save updated context state for chat ${chatId}:`, e);
         // Non-critical failure? Log and continue.
    }


    // 5. Add the final assistant message to the database chat history
    // The Orchestrator added the message to the in-memory context history,
    // but we need to save it to the persistent message history table.
    // We also need to create a ChatMessage object with a generated ID.
    const assistantMessage: ChatMessage = {
        id: randomUUID(), // Generate ID for DB
        chatId: chatId,
        content: messageContent,
        sender: 'assistant', // Orchestrator determined the final message
        timestamp: Date.now(),
        files: [] // Assistant messages typically don't have associated files in this model
    };

    try {
        const savedAssistantMessage = await this.repository.addMessage(assistantMessage);
        console.log(`[ChatService] Saved assistant message ${savedAssistantMessage.id} to DB.`);
        return savedAssistantMessage; // Return the saved message object
    } catch (e) {
         console.error(`[ChatService] Failed to save assistant message to DB for chat ${chatId}:`, e);
         // Return a basic message object even if DB save failed
         return assistantMessage;
    }
  }

  /**
   * Saves a message to the repository (used for user messages added by UI)
   * Note: In the new flow, sendMessage handles adding the user message to context/DB.
   * This method might be deprecated or used for internal/system messages added outside the main flow.
   */
  public async saveMessage(message: ChatMessage): Promise<ChatMessage> {
     // Ensure chat exists before saving a message
     if (!message.chatId && this.activeChatId) {
         message.chatId = this.activeChatId;
     } else if (!message.chatId) {
          // If no chat specified and no active chat, create a new one?
          // This scenario needs clarification - how can UI save a message without a chat context?
          // For now, throw error or create new chat. Let's create a new chat for user messages.
          if (message.sender === 'user') {
               console.warn('[ChatService] saveMessage called for user message without chatId. Creating new chat.');
               const newChat = await this.createConversation();
               message.chatId = newChat.id;
               this.activeChatId = newChat.id; // Set as active
          } else {
               throw new Error("Cannot save message without a specified chatId or active chat.");
          }
     }
    return this.repository.addMessage(message);
  }

   /**
    * Gets the InteractionContext for a given chat ID.
    * Useful for the UI to read state like proposed changes.
    * @param chatId
    * @returns The InteractionContext or undefined if not in memory.
    */
   public getChatContext(chatId: string): InteractionContext | undefined {
       // This might need adjustment depending on whether Orchestrator contexts
       // are always in sync with DB state when requested by UI.
       // A simple way is to load/restore from DB before returning, but could be slow.
       // For now, return the in-memory version from Orchestrator.
       return this.orchestrator.getInteractionContext(chatId);
   }

   // Add a dispose method if necessary to clean up orchestrator and repo
    dispose(): void {
        console.log('[ChatService] Disposing.');
        this.orchestrator.dispose();
        // DatabaseManager is a singleton, closing should be handled globally if needed
        // DatabaseManager.getInstance().close(); // Only if DatabaseManager isn't used elsewhere
    }
}
```
--- END OF FILE chatService.ts ---

--- START OF FILE extension.ts ---
```typescript
import * as vscode from 'vscode';
import { WebviewProvider } from './ui/webView/webviewProvider';
import { ConfigurationManager } from './config/ConfigurationManager';
import { initializePromptSystem } from './models/promptSystem';
import { ModelManager } from './models/config/ModelManager';
import { ChatService } from './services/chatService';
import { Orchestrator } from './orchestrator/orchestrator'; // Update import statement
import { FileSystemService } from './services/fileSystemService';
import { DatabaseManager } from './storage/database/DatabaseManager'; // Import DatabaseManager

export function activate(context: vscode.ExtensionContext) {
  // Initialize DatabaseManager early
  DatabaseManager.getInstance(context);
  console.log('[Extension] DatabaseManager initialized.');

  const config = new ConfigurationManager(context);
  const modelManager = new ModelManager(config);
  initializePromptSystem(modelManager); // promptSystem needs ModelManager

  const fileSystemService = new FileSystemService(); // Assuming FileSystemService is a wrapper around tools
  const orchestrator = new Orchestrator(modelManager); // Orchestrator needs ModelManager
  const chatService = new ChatService(context, modelManager, orchestrator); // ChatService needs context, ModelManager, Orchestrator

  // The WebviewProvider now needs ChatService, Orchestrator (to get context), and FileSystemService
  const webview = new WebviewProvider(context.extensionUri, config, chatService, orchestrator, fileSystemService);

  // Initialize theme handler
  webview.setThemeHandler();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('aiChat.chatView', webview),

    // Register new titlebar commands
    vscode.commands.registerCommand('extensionAssistant.newChat', () => {
      webview.createNewChat(); // Webview handles this
    }),

    vscode.commands.registerCommand('extensionAssistant.settings', async () => {
      // Open VS Code settings focused on extension settings
      await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:user.extensionassistant');
    }),

    vscode.commands.registerCommand('extensionAssistant.switchModel', async () => {
      const current = config.getModelType();
      // Assuming 'ollama' and 'gemini' are the only two options and we just toggle
      const newModel = current === 'ollama' ? 'gemini' : 'ollama';
      try {
         await modelManager.setModel(newModel);
         // Notify webview to update UI if needed
         webview.updateModel(newModel);
         vscode.window.showInformationMessage(`Switched AI model to ${newModel}`);
      } catch (error: any) {
         vscode.window.showErrorMessage(`Failed to switch model: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
      // Show history panel by updating the state in the webview
      webview.showChatHistory(); // Webview handles this
    }),

    // Redundant command? Keeping for now but seems identical to switchModel
    vscode.commands.registerCommand('extensionAssistant.model.change', async () => {
       const current = config.getModelType();
       const newModel = current === 'ollama' ? 'gemini' : 'ollama';
       try {
          await modelManager.setModel(newModel);
          // Notify webview to update UI if needed
          webview.updateModel(newModel);
          vscode.window.showInformationMessage(`Switched AI model to ${newModel}`);
       } catch (error: any) {
          vscode.window.showErrorMessage(`Failed to switch model: ${error.message}`);
       }
    })
    // Add commands for applying diffs, etc., which would interact with ChatService/Orchestrator
    // and potentially FileSystemService
  );

  // Add disposables for services that need cleanup
  context.subscriptions.push(webview);
  context.subscriptions.push(chatService); // Add chatService to subscriptions for dispose
  // Orchestrator is disposed by ChatService, ModelManager by promptSystem or ChatService
  // DatabaseManager is a singleton, dispose might be global or handled by VS Code exit

  console.log('[Extension] Activated with multi-step orchestration and persistence.');
}

// This deactivate is called when extension is deactivated
export function deactivate() {
  console.log('[Extension] Deactivating.');
  // Ensure database connection is closed on deactivation
  try {
      DatabaseManager.getInstance(null as any).close(); // Pass null or a dummy object if context isn't available during deactivate
  } catch (e) {
      console.error('[Extension] Error closing database on deactivate:', e);
  }
  // Other disposables are handled by context.subscriptions
}
```
--- END OF FILE extension.ts ---

**Summary of Changes:**

1.  **DatabaseManager:** Added `context_state` column to `chats` table and simple migration logic.
2.  **Entities & IChatRepository:** Added `context_state` property to `Chat` and methods (`saveContextState`, `loadContextState`) to the repository interface.
3.  **ChatRepository:** Implemented the `saveContextState` and `loadContextState` methods using JSON stringification. Updated CRUD operations to handle the new column.
4.  **InteractionContext:** Added `processingStatus`, `currentPlan`, `lastStepResult`, `finalResponseContent`, `requiresUserInputReason` state keys. Added getters/setters for these. Added `sender: 'system'` for internal messages. Modified `getHistoryForModel` to exclude system messages. Added `userMessage`, `referencedFiles`, `projectInfo` keys to store start-of-turn data.
5.  **PlannerService (New):** Implemented `planNextStep` and `evaluateStepResult`. `planNextStep` contains the core logic to decide the next action based on the context state and intent. `evaluateStepResult` updates context flags based on step outcomes. Includes placeholder `build...Plan` methods for different intents.
6.  **Orchestrator:** Refactored `processUserMessage` to become the main driver. It now loads context state, manages the `analyzing -> planning -> executing -> evaluating` loop, calls `PlannerService` in the relevant phases, calls `StepExecutor`, updates context state, and returns the final message and state to `ChatService`. Added `getOrCreateContext` to handle loading/restoring state.
7.  **BaseHandler & Intent Handlers:** Simplified handlers. Their `handle()` method is removed. They now implement `buildInitialPlan()` which returns an array of steps for their intent, and optionally `getInitialMessage()`.
8.  **PromptExecutor:** Added `planningEngine` to `validPromptTypes` in case you implement planning as a prompt.
9.  **Orchestrator Index:** Exported `PlannerService`.
10. **ChatService:** Refactored `sendMessage` to load context state, pass it to `Orchestrator.processUserMessage`, receive the updated state and final message, save the updated state, and save the final assistant message to the DB. Updated `createConversation` and `loadConversation` to handle context state. Added `getChatContext` to allow UI access.
11. **Extension:** Updated service instantiations and dependencies. Added DatabaseManager initialization and closing. Added `chatService` to subscriptions for dispose.

This provides the structural foundation for the multi-step workflow. The `PlannerService.planNextStep` and `evaluateStepResult` methods contain the core logic that you will refine to make the AI's decision-making more sophisticated, incorporating more context variables and potentially more complex conditions or even using AI prompts for planning/evaluation themselves.

Remember that the loop in `Orchestrator.processUserMessage` is currently synchronous. For a large number of steps or long-running steps, you might want to refactor this loop into an asynchronous state machine managed outside the immediate function call, potentially using background tasks or event emitters to keep the UI responsive. However, this synchronous version demonstrates the core state management and planning logic.