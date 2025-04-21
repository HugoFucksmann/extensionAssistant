import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';

export class SQLiteStorage {
  private db: sqlite3.Database;

  constructor(context: vscode.ExtensionContext) {
    
    const dbPath = path.join(context.globalStorageUri.fsPath, 'memory_agent.db');

    // Asegurar que el directorio existe
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('[SQLiteStorage] Error al abrir la base de datos:', err.message);
        throw err;
      }
      this.initializeDatabase();
    });
  }

  private async initializeDatabase(): Promise<void> {
    const tableExists = await this.checkTableExists("global_memory");
    if (!tableExists) {
      await this.db.run(`
        CREATE TABLE global_memory (
          projectPath TEXT,
          key TEXT,
          content TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (projectPath, key)
        )
      `);
    }
  }

  private async checkTableExists(tableName: string): Promise<boolean> {
    const result = await this.db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );
    return !!result;
  }

  public async getProjectMemory(projectPath: string, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM global_memory WHERE projectPath = ? AND key = ?`,
        [projectPath, key],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }


  public async getChatMemory(chatId: string, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM chat_memory WHERE chatId = ? AND key = ?`,
        [chatId, key],
        (err, row) => {
          if (err) {
            console.error('[SQLiteStorage] Error al obtener memoria por chat:', err.message);
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  public close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('[SQLiteStorage] Error al cerrar la base de datos:', err.message);
      }
    });
  }

  private async storeMemory(tableName: string, keyFields: string[], values: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const fields = keyFields.join(', ');
      const placeholders = keyFields.map(() => '?').join(', ');
      this.db.run(
        `INSERT OR REPLACE INTO ${tableName} (${fields}) VALUES (${placeholders})`,
        values,
        function (err) {
          if (err) {
            console.error(`[SQLiteStorage] Error al insertar en ${tableName}:`, err.message);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  public async storeProjectMemory(projectPath: string, key: string, content: string): Promise<void> {
    return this.storeMemory('global_memory', ['projectPath', 'key', 'content'], [projectPath, key, content]);
  }
  
  public async storeChatMemory(chatId: string, key: string, content: string): Promise<void> {
    return this.storeMemory('chat_memory', ['chatId', 'key', 'content'], [chatId, key, content]);
  }
}