import * as sqlite3 from 'sqlite3';
import { DatabaseManager } from './DatabaseManager';
import * as vscode from 'vscode';

/**
 * Abstract base class for database repositories.
 * Provides protected methods to interact with the database using Promises.
 * Ensures the database is ready before executing queries.
 */
export abstract class BaseRepository {
    // Use a Promise to hold the database instance, resolving when it's ready
    protected dbPromise: Promise<sqlite3.Database>;

    constructor(context: vscode.ExtensionContext) {
        const dbManager = DatabaseManager.getInstance(context);
        // Get the database promise from the manager
        this.dbPromise = dbManager.getDatabase();

        // Optional: Handle potential database opening/initialization errors early
        this.dbPromise.catch(err => {
             // Log the error but don't throw here. Individual method calls will await
             // this promise and handle the rejection there.
             console.error(`[${this.constructor.name}] Failed to get database instance during construction:`, err.message);
        });
    }

    /**
     * Executes a SQL query that does not return data (INSERT, UPDATE, DELETE, CREATE, DROP).
     * Waits for the database to be ready.
     * @param sql The SQL query string.
     * @param params Parameters for the query.
     * @returns A Promise that resolves when the query is complete.
     * @throws Error if the query fails or database is not ready.
     */
    protected async run(sql: string, params: any[] = []): Promise<void> {
        const db = await this.dbPromise; // Wait for the database instance (handles connection/init errors)
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err: Error | null) {
                if (err) {
                    console.error(`[${this.constructor.name}] Error running SQL: "${sql}" with params:`, params, err.message);
                    reject(err);
                } else {
                    // `this` refers to the statement object in sqlite3's callback
                    // this.lastID and this.changes are available here if needed by subclasses
                    resolve();
                }
            });
        });
    }

    /**
     * Executes a SQL query that returns a single row.
     * Waits for the database to be ready.
     * @param sql The SQL query string.
     * @param params Parameters for the query.
     * @returns A Promise that resolves with the row object (as type T), or null if no row is found.
     * @template T The expected type of the returned row object.
     * @throws Error if the query fails or database is not ready.
     */
    protected async get<T>(sql: string, params: any[] = []): Promise<T | null> {
        const db = await this.dbPromise; // Wait for the database instance (handles connection/init errors)
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err: Error | null, row: any) => {
                if (err) {
                    console.error(`[${this.constructor.name}] Error getting SQL: "${sql}" with params:`, params, err.message);
                    reject(err);
                } else {
                    // row is undefined if no row is found, which correctly maps to null
                    resolve(row as T || null);
                }
            });
        });
    }

    /**
     * Executes a SQL query that returns multiple rows.
     * Waits for the database to be ready.
     * @param sql The SQL query string.
     * @param params Parameters for the query.
     * @returns A Promise that resolves with an array of row objects (as type T[]). Returns an empty array if no rows are found.
     * @template T The expected type of the objects in the returned array.
     * @throws Error if the query fails or database is not ready.
     */
    protected async all<T>(sql: string, params: any[] = []): Promise<T[]> {
        const db = await this.dbPromise; // Wait for the database instance (handles connection/init errors)
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err: Error | null, rows: any[]) => {
                if (err) {
                    console.error(`[${this.constructor.name}] Error getting all SQL: "${sql}" with params:`, params, err.message);
                    reject(err);
                } else {
                    // rows is an empty array if no rows are found, which correctly maps to T[]
                    resolve(rows as T[]);
                }
            });
        });
    }

    /**
     * Disposes of any resources held by the repository.
     * In this case, the DB connection is managed by DatabaseManager.
     */
    dispose(): void {
        // Override in derived classes if they hold specific resources
        console.log(`[${this.constructor.name}] Disposing.`);
    }
}