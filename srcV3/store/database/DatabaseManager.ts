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
    
    // DEBUG: Show db path in output channel
    const outputChannel = vscode.window.createOutputChannel('Database Debug');
    outputChannel.appendLine(`Database path: ${dbPath}`);
    outputChannel.show(true);
    
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
        }
      });
    }
  }
  
  /**
   * Completely resets the database (deletes and recreates with schema)
   */
  public async resetDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(this.context.globalStorageUri.fsPath, 'assistant.db');
      
      // 1. Close existing connection
      this.close();
      
      // 2. Delete database file if exists
      fs.unlink(dbPath, (unlinkErr) => {
        if (unlinkErr && unlinkErr.code !== 'ENOENT') {
          reject(unlinkErr);
          return;
        }
        
        // 3. Create new database
        this.db = new sqlite3.Database(dbPath);
        
        // 4. Enable foreign keys and verify
        this.db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
          if (pragmaErr) {
            reject(pragmaErr);
          } else {
            resolve();
          }
        });
      });
    });
  }
}