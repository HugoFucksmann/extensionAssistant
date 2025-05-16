import * as vscode from 'vscode';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class DatabaseManager {
  private db: sqlite3.Database | null = null; // Initialize as null
  private context: vscode.ExtensionContext;
  private static instance: DatabaseManager;
  private isInitialized: boolean = false; // Track if tables have been initialized
  private initPromise: Promise<void> | null = null; // Promise to track initialization status
  private dbOpenPromise: Promise<sqlite3.Database>; // Promise for the database opening itself

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    // Use globalStorageUri for persistent data specific to the extension
    const dbPath = path.join(context.globalStorageUri.fsPath, 'assistant.db');

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch (error: any) {
        console.error('[DatabaseManager] Failed to create database directory:', error.message);
        // Handle error appropriately, maybe show a critical error message
        vscode.window.showErrorMessage('Failed to create extension storage directory.');
        // We cannot proceed if storage fails, throw error to potentially halt activation
        throw error;
      }
    }

    // Create a promise for the database opening process
    this.dbOpenPromise = new Promise((resolve, reject) => {
        // Open the database. sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE is the default.
        const db = new sqlite3.Database(dbPath, (err) => {
          if (err) {
            console.error('[DatabaseManager] Error opening database:', err.message);
            // Show error message to the user
            vscode.window.showErrorMessage('Failed to open extension database.');
            this.db = null; // Ensure db is null on error
            reject(err); // Reject the promise
          } else {
            console.log('[DatabaseManager] Database opened successfully:', dbPath);
            this.db = db; // Store the opened db instance
            resolve(db); // Resolve the promise with the db instance
          }
        });
    });


    // Chain initialization after the database is successfully opened
    this.initPromise = this.dbOpenPromise
        .then(db => {
             // Enable foreign keys immediately after opening the database
             return new Promise<void>((resolve, reject) => {
                 db.run('PRAGMA foreign_keys = ON', (err) => {
                     if (err) {
                          console.error('[DatabaseManager] Failed to enable foreign keys:', err.message);
                          vscode.window.showErrorMessage('Failed to enable database foreign key support.');
                          reject(err); // Reject init if foreign keys fail
                     } else {
                         console.log('[DatabaseManager] Foreign keys enabled.');
                         resolve();
                     }
                 });
             });
        })
        .then(() => this.initializeTables()) // Then initialize tables
        .catch(initErr => {
             console.error('[DatabaseManager] Failed during database initialization sequence:', initErr);
             vscode.window.showErrorMessage('Failed during extension database initialization.');
             this.isInitialized = false; // Mark as not initialized on any error
             // The error is already logged and potentially shown to the user.
             // The initPromise will remain rejected, causing subsequent getDatabase calls to fail.
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
   * Gets the SQLite database instance.
   * Waits for the database to be opened and tables initialized.
   * @returns A Promise that resolves with the sqlite3 Database instance.
   * @throws Error if the database connection or initialization failed.
   */
  public async getDatabase(): Promise<sqlite3.Database> {
      // Wait for the entire initialization sequence (opening + tables)
      if (this.initPromise) {
          await this.initPromise;
      } else if (!this.isInitialized) {
           // Fallback/error state: initPromise should always be set in constructor.
           // If not set and not initialized, something went wrong early.
           console.error('[DatabaseManager] getDatabase called but initialization sequence was not started or completed successfully.');
           throw new Error("Database initialization sequence did not complete.");
      }

      // Check if the database instance is actually available after waiting
      if (!this.db) {
          // This case should be covered by the initPromise rejecting,
          // but as a final check, ensure db is not null.
          throw new Error("Database connection is not available after initialization.");
      }

      return this.db;
  }

  /**
   * Initialize chat, message, cache, and memory tables if they do not exist.
   * This method is called automatically after the database is opened.
   * NOTE: This is a basic initialization. For schema changes, a proper migration system is required.
   */
  private async initializeTables(): Promise<void> {
      if (this.isInitialized) {
          console.log('[DatabaseManager] Tables already initialized.');
          return Promise.resolve();
      }
      console.log('[DatabaseManager] Initializing database tables...');

      // Ensure db is available before running schema creation
      const db = this.db;
      if (!db) {
          const error = new Error("Database connection not available for table initialization.");
          console.error('[DatabaseManager]', error.message);
          throw error;
      }

      return new Promise((resolve, reject) => {
          // Use serialize to ensure commands run in order
          db.serialize(() => {
              db.run(`
                  CREATE TABLE IF NOT EXISTS chats (
                      id TEXT PRIMARY KEY,
                      title TEXT NOT NULL,
                      timestamp INTEGER NOT NULL,
                      preview TEXT
                  )
              `, function(err) { if (err) { console.error('[DatabaseManager] Chat table creation failed:', err.message); reject(err); } }); // Use function() for 'this' context

              db.run(`
                  CREATE TABLE IF NOT EXISTS messages (
                      id TEXT PRIMARY KEY,
                      chat_id TEXT NOT NULL,
                      content TEXT NOT NULL,
                      sender TEXT NOT NULL,
                      timestamp INTEGER NOT NULL,
                      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
                  )
              `, function(err) { if (err) { console.error('[DatabaseManager] Messages table creation failed:', err.message); reject(err); } });

              db.run(`
                  CREATE TABLE IF NOT EXISTS cache_items (
                      key TEXT PRIMARY KEY,
                      data TEXT NOT NULL,
                      timestamp INTEGER NOT NULL
                  )
              `, function(err) { if (err) { console.error('[DatabaseManager] Cache table creation failed:', err.message); reject(err); } });

              // Added 'reason' column to match MemoryItem interface and prompt structure
              db.run(`
                  CREATE TABLE IF NOT EXISTS memory_items (
                      id TEXT PRIMARY KEY,
                      user_id TEXT,
                      project_id TEXT,
                      type TEXT NOT NULL,
                      key_name TEXT,
                      content TEXT NOT NULL,
                      timestamp INTEGER NOT NULL,
                      reason TEXT, -- Added reason column
                      UNIQUE(project_id, type, key_name) ON CONFLICT REPLACE
                  )
              `, function(err) { if (err) { console.error('[DatabaseManager] Memory table creation failed:', err.message); reject(err); } });

              // Use a final callback to know when all serialized commands are done
              // A simple SELECT 1 is a good way to get a final callback after all runs
              db.get("SELECT 1", (err) => {
                  if (err) {
                      console.error('[DatabaseManager] Final check after table initialization failed:', err.message);
                      this.isInitialized = false; // Mark as not initialized if error occurred
                      reject(err);
                  } else {
                      console.log('[DatabaseManager] Database tables initialized.');
                      this.isInitialized = true;
                      resolve();
                  }
              });
          });
      });
  }


  /**
   * Closes the database connection. Should be called on extension deactivation.
   */
  public close(): void {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('[DatabaseManager] Error closing database:', err.message);
        } else {
            console.log('[DatabaseManager] Database closed.');
        }
        this.db = null; // Clear the reference after closing
      });
      // Clear the instance reference so a new one can be created if needed (e.g., after reset)
      DatabaseManager.instance = null as any; // Cast to any to allow setting null
      this.isInitialized = false; // Reset initialization status
      this.initPromise = null; // Clear the promise
      // dbOpenPromise might still be pending or resolved, but subsequent getInstance will create a new one
    }
  }

  /**
   * Completely resets the database (deletes the file).
   * NOTE: This is primarily for development or specific reset commands.
   * A production system would require schema migration logic.
   * After deleting, a new instance will re-initialize tables on next access.
   */
  public async resetDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(this.context.globalStorageUri.fsPath, 'assistant.db');

      this.close(); // Close existing connection first

      // Wait a moment to ensure close is processed before unlinking, though fs.unlink should handle busy files.
      // A more robust approach might involve checking if the file handle is released.
      // For typical extension use, a small delay or relying on OS handling is often sufficient.
      setTimeout(() => {
          fs.unlink(dbPath, (unlinkErr) => {
            if (unlinkErr && unlinkErr.code !== 'ENOENT') {
              console.error('[DatabaseManager] Error unlinking database file:', unlinkErr.message);
              reject(unlinkErr);
              return;
            }
            console.log('[DatabaseManager] Database file unlinked.');
            // The next call to getInstance will create a new DB and initialize tables
            resolve();
          });
      }, 100); // Small delay
    });
  }


}