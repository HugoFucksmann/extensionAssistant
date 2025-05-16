import * as vscode from 'vscode';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class DatabaseManager {
  private db: sqlite3.Database;
  private context: vscode.ExtensionContext;
  private static instance: DatabaseManager;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const dbPath = path.join(context.globalStorageUri.fsPath, 'assistant.db');

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('[DatabaseManager] Error opening database:', err.message);
        // In a real extension, you might want to show an error message to the user
        // vscode.window.showErrorMessage('Failed to open database.');
        throw err; // Re-throw to prevent extension activation
      }
      console.log('[DatabaseManager] Database opened successfully.');
    });

    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
             console.error('[DatabaseManager] Failed to enable foreign keys:', err.message);
        }
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
            console.log('[DatabaseManager] Database closed.');
        }
      });
      // Clear the instance reference so it can be re-created if needed (e.g., after reset)
      DatabaseManager.instance = null as any; // Cast to any to allow setting null
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
    });
  }

  /**
   * NOTE ON SCHEMA MIGRATIONS:
   * The current implementation uses CREATE TABLE IF NOT EXISTS on activation,
   * which is sufficient for initial setup but WILL NOT handle schema changes
   * in future versions of the extension without data loss (unless using resetDatabase).
   * For a production-ready extension, implement a proper database migration system
   * using a library like 'db-migrate', 'node-sqlite3-migration', or similar.
   * This involves tracking schema versions and applying incremental changes.
   */
}