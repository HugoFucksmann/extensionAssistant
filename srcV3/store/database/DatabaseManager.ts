// src/store/database/DatabaseManager.ts
// MODIFIED: Added schema for new tables.

import * as vscode from 'vscode';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class DatabaseManager {
  private db: sqlite3.Database | null = null; // Allow null if not initialized/closed
  private context: vscode.ExtensionContext;
  private static instance: DatabaseManager;
  private dbPath: string;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.dbPath = path.join(context.globalStorageUri.fsPath, 'assistant.db');

    // Ensure directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.openDatabase(); // Open on instantiation
  }

   private openDatabase(): void {
        if (this.db) {
            // Database is already open
            return;
        }

        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('[DatabaseManager] Error opening database:', err.message);
                throw err; // Rethrow to indicate failure
            }
             console.log('[DatabaseManager] Database opened successfully.');
             // Enable foreign keys after opening
             this.db?.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
                 if (pragmaErr) {
                     console.error('[DatabaseManager] Error enabling foreign keys:', pragmaErr.message);
                     // Decide how to handle this critical error
                 }
             });
             // Initialize tables if needed ( idempotent )
             this.initializeTables();
        });
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
   * Gets the SQLite database instance. Throws if database is not open.
   */
  public getDatabase(): sqlite3.Database {
      if (!this.db) {
          // Attempt to re-open if closed unexpectedly? Or just throw?
          // For now, throw to indicate usage error if not properly managed.
          throw new Error('Database connection is not open.');
      }
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
           console.log('[DatabaseManager] Database closed.');
           this.db = null; // Set to null after closing
        }
      });
    }
  }

   /**
    * Initialize all necessary tables if they don't exist.
    * This method is idempotent.
    */
   private initializeTables(): void {
        if (!this.db) return;

        this.db.serialize(() => {
            // chats table (schema unchanged)
            this.db!.run(`
                CREATE TABLE IF NOT EXISTS chats (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    preview TEXT
                )
            `, (err) => {
                if (err) console.error('[DatabaseManager] Error creating chats table:', err.message);
            });

            // messages table (schema unchanged, foreign key constraint is here)
            this.db!.run(`
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    chat_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    sender TEXT NOT NULL, -- 'user', 'assistant', 'system'
                    timestamp INTEGER NOT NULL,
                    -- files TEXT, -- Optional: If storing file paths directly in message
                    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
                )
            `, (err) => {
                 if (err) console.error('[DatabaseManager] Error creating messages table:', err.message);
            });

            // execution_steps table (new)
             this.db!.run(`
                 CREATE TABLE IF NOT EXISTS execution_steps (
                     id TEXT PRIMARY KEY,
                     traceId TEXT NOT NULL, -- Link to the trace/turn ID
                     chatId TEXT NOT NULL, -- Link to the conversation ID
                     stepName TEXT NOT NULL,
                     stepType TEXT NOT NULL, -- 'tool' | 'prompt'
                     stepExecute TEXT NOT NULL, -- Tool name or Prompt type
                     stepParams TEXT, -- JSON string of resolved parameters
                     startTime INTEGER NOT NULL,
                     endTime INTEGER,
                     status TEXT NOT NULL, -- 'running' | 'completed' | 'failed' | 'skipped'
                     result TEXT, -- JSON string of the result
                     error TEXT, -- String representation of the error
                     planningIteration INTEGER,
                     -- Optional: Index on traceId for faster retrieval of steps per trace
                     INDEX idx_traceId (traceId),
                     FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE -- Link to conversation
                 )
             `, (err) => {
                 if (err) console.error('[DatabaseManager] Error creating execution_steps table:', err.message);
             });

             // memory table (new)
              this.db!.run(`
                 CREATE TABLE IF NOT EXISTS memory (
                     id TEXT PRIMARY KEY,
                     chatId TEXT, -- Can be NULL for general memory
                     type TEXT NOT NULL, -- 'fact', 'insight', 'summary', etc.
                     key TEXT NOT NULL UNIQUE, -- Unique key for easy retrieval (e.g., 'project_summary')
                     content TEXT NOT NULL, -- The actual memory content
                     timestamp INTEGER NOT NULL,
                     relevanceScore REAL, -- Optional score
                     relatedEntities TEXT, -- JSON string of related entity IDs
                     -- Optional: Index on key for faster lookup
                     INDEX idx_memory_key (key),
                     INDEX idx_memory_chat (chatId), -- Index for chat-specific memory
                     FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE SET NULL -- Link to conversation, don't delete memory if chat deleted
                 )
              `, (err) => {
                  if (err) console.error('[DatabaseManager] Error creating memory table:', err.message);
              });
        });
   }


  /**
   * Completely resets the database (deletes the file and recreates with schema)
   * NOTE: This is primarily for development or specific reset commands.
   */
  public async resetDatabase(): Promise<void> {
    console.log('[DatabaseManager] Resetting database...');
    return new Promise((resolve, reject) => {
      this.close(); // Close existing connection

      fs.unlink(this.dbPath, (unlinkErr) => {
        if (unlinkErr && unlinkErr.code !== 'ENOENT') { // Ignore error if file doesn't exist
          console.error('[DatabaseManager] Error unlinking database file:', unlinkErr.message);
          reject(unlinkErr);
          return;
        }
         console.log('[DatabaseManager] Old database file deleted (if existed).');

        this.openDatabase(); // Open new database, which will trigger initializeTables
        // Need to wait for initializeTables to complete.
        // A simple delay is unreliable. A better way is to track DB state,
        // but for a reset command, a short delay might suffice for dev/test.
        // Alternatively, refactor initializeTables to return a Promise.
        setTimeout(() => { // Basic delay to allow tables to be created
             console.log('[DatabaseManager] Database reset and re-initialized (assuming tables created).');
             resolve();
        }, 100); // Adjust delay if table creation is slow
      });
    });
  }
}