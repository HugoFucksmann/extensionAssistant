"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteStorage = void 0;
const sqlite3 = __importStar(require("sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class SQLiteStorage {
    constructor(context) {
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
            // Inicializar la base de datos de forma síncrona para asegurar que las tablas existan
            this.initializeDatabaseSync();
        });
    }
    async initializeDatabase() {
        // Check and create global_memory table
        const globalTableExists = await this.checkTableExists("global_memory");
        if (!globalTableExists) {
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
        // Check and create chat_memory table
        const chatTableExists = await this.checkTableExists("chat_memory");
        if (!chatTableExists) {
            await this.db.run(`
        CREATE TABLE chat_memory (
          chatId TEXT,
          key TEXT,
          content TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (chatId, key)
        )
      `);
        }
    }
    initializeDatabaseSync() {
        // Versión síncrona de initializeDatabase para usar en el constructor
        this.db.serialize(() => {
            // Crear tabla global_memory si no existe
            this.db.run(`
        CREATE TABLE IF NOT EXISTS global_memory (
          projectPath TEXT,
          key TEXT,
          content TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (projectPath, key)
        )
      `);
            // Crear tabla chat_memory si no existe
            this.db.run(`
        CREATE TABLE IF NOT EXISTS chat_memory (
          chatId TEXT,
          key TEXT,
          content TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (chatId, key)
        )
      `);
            console.log('[SQLiteStorage] Tablas inicializadas correctamente');
        });
    }
    async checkTableExists(tableName) {
        const result = await this.db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
        return !!result;
    }
    async getProjectMemory(projectPath, key) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM global_memory WHERE projectPath = ? AND key = ?`, [projectPath, key], (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row);
                }
            });
        });
    }
    async getChatMemory(chatId, key) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM chat_memory WHERE chatId = ? AND key = ?`, [chatId, key], (err, row) => {
                if (err) {
                    console.error('[SQLiteStorage] Error al obtener memoria por chat:', err.message);
                    reject(err);
                }
                else {
                    resolve(row);
                }
            });
        });
    }
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('[SQLiteStorage] Error al cerrar la base de datos:', err.message);
            }
        });
    }
    async storeMemory(tableName, keyFields, values) {
        return new Promise((resolve, reject) => {
            const fields = keyFields.join(', ');
            const placeholders = keyFields.map(() => '?').join(', ');
            this.db.run(`INSERT OR REPLACE INTO ${tableName} (${fields}) VALUES (${placeholders})`, values, function (err) {
                if (err) {
                    console.error(`[SQLiteStorage] Error al insertar en ${tableName}:`, err.message);
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async storeProjectMemory(projectPath, key, content) {
        return this.storeMemory('global_memory', ['projectPath', 'key', 'content'], [projectPath, key, content]);
    }
    async storeChatMemory(chatId, key, content) {
        return this.storeMemory('chat_memory', ['chatId', 'key', 'content'], [chatId, key, content]);
    }
}
exports.SQLiteStorage = SQLiteStorage;
//# sourceMappingURL=SQLiteStorage.js.map