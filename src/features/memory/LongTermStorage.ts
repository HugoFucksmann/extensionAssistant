// src/features/memory/LongTermStorage.ts

import * as vscode from 'vscode';
import * as path from 'path';

export class LongTermStorage {
  private storagePath: vscode.Uri;
  private isSaving: boolean = false;
  private saveQueue: Array<() => Promise<void>> = [];

  constructor(private readonly context: vscode.ExtensionContext) {

    this.storagePath = vscode.Uri.joinPath(
      this.context.globalStorageUri,
      'memory-storage'
    );


    this.ensureStorageDirectory().catch(err => {
      console.error('Failed to initialize storage directory:', err);
    });
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await vscode.workspace.fs.createDirectory(this.storagePath);
    } catch (error) {
      console.error('Error creating storage directory:', error);
      throw new Error(`Failed to create storage directory: ${error}`);
    }
  }

  /**
   * Almacena datos en el almacenamiento persistente
   * @param key Clave única para los datos
   * @param data Datos a almacenar (deben ser serializables a JSON)
   * @param metadata Metadatos opcionales para los datos
   */
  public async store<T>(key: string, data: T, metadata?: Record<string, any>): Promise<void> {
    const filePath = this.getFilePath(key);
    const storageData = {
      data,
      metadata: {
        ...metadata,
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    await this.saveToFile(filePath, storageData);
  }

  /**
   * Recupera datos del almacenamiento persistente
   * @param key Clave de los datos a recuperar
   * @returns Los datos almacenados o null si no existen
   */
  public async retrieve<T>(key: string): Promise<{ data: T | null; metadata: Record<string, any> }> {
    const filePath = this.getFilePath(key);

    try {
      const fileContent = await vscode.workspace.fs.readFile(filePath);
      const { data, metadata } = JSON.parse(fileContent.toString());
      return { data, metadata };
    } catch (error) {
      if (error instanceof vscode.FileSystemError && error.code === 'ENOENT') {
        return { data: null, metadata: {} };
      }
      console.error(`Error reading file ${key}:`, error);
      throw new Error(`Failed to read storage file: ${error}`);
    }
  }

  /**
   * Elimina datos del almacenamiento persistente
   * @param key Clave de los datos a eliminar
   */
  public async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);

    try {
      await vscode.workspace.fs.delete(filePath, { useTrash: false });
    } catch (error) {
      if (error instanceof vscode.FileSystemError && error.code === 'ENOENT') {
        return;
      }
      console.error(`Error deleting file ${key}:`, error);
      throw new Error(`Failed to delete storage file: ${error}`);
    }
  }

  /**
   * Busca en los datos almacenados que coincidan con la consulta
   * @param query Consulta de búsqueda
   * @param limit Límite de resultados
   * @returns Array de resultados que coinciden con la consulta
   */
  public async search<T>(query: string, limit: number = 10): Promise<Array<{ key: string; data: T; metadata: any }>> {
    try {
      const files = await vscode.workspace.fs.readDirectory(this.storagePath);
      const results: Array<{ key: string; data: T; metadata: any; score: number }> = [];


      const BATCH_SIZE = 20;
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async ([filename]) => {
            if (!filename.endsWith('.json')) return null;

            const key = path.basename(filename, '.json');
            try {
              const { data, metadata } = await this.retrieve<T>(key);
              if (data === null) return null;


              const dataStr = JSON.stringify(data).toLowerCase();
              const queryLower = query.toLowerCase();
              const score = dataStr.includes(queryLower) ? 1 : 0;

              return { key, data, metadata, score };
            } catch (error) {
              console.error(`Error processing file ${filename}:`, error);
              return null;
            }
          })
        );


        const validResults = batchResults.filter(Boolean) as Array<{
          key: string;
          data: T;
          metadata: any;
          score: number;
        }>;
        results.push(...validResults);
      }


      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ key, data, metadata }) => ({ key, data, metadata }));
    } catch (error) {
      console.error('Error searching storage:', error);
      throw new Error(`Search failed: ${error}`);
    }
  }

  /**
   * Almacena insights en el almacenamiento a largo plazo
   * @param chatId ID del chat relacionado
   * @param insights Array de insights a almacenar
   * @param metadata Metadatos adicionales
   */
  public async storeInsights(
    chatId: string,
    insights: any[],
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (!insights.length) return;

    const key = `insights_${chatId}_${Date.now()}`;
    await this.store(key, insights, {
      ...metadata,
      chatId,
      type: 'insights',
      count: insights.length
    });
  }

  /**
   * Obtiene la ruta del archivo para una clave dada
   * @param key Clave del archivo
   * @returns URI del archivo
   */
  private getFilePath(key: string): vscode.Uri {
    // Sanitizar la clave para usarla como nombre de archivo
    const safeKey = key.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    return vscode.Uri.joinPath(this.storagePath, `${safeKey}.json`);
  }

  /**
   * Guarda datos en un archivo con manejo de concurrencia
   * @param filePath Ruta del archivo
   * @param data Datos a guardar
   */
  private async saveToFile(filePath: vscode.Uri, data: any): Promise<void> {
    const saveOperation = async (): Promise<void> => {
      try {
        const jsonData = JSON.stringify(data, null, 2);
        await vscode.workspace.fs.writeFile(
          filePath,
          new TextEncoder().encode(jsonData)
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error writing to file ${filePath.path}:`, error);
        throw new Error(`Failed to write to storage: ${errorMessage}`);
      }
    };


    if (this.isSaving) {
      return new Promise((resolve, reject) => {
        this.saveQueue.push(async () => {
          try {
            await saveOperation();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }


    this.isSaving = true;
    try {
      await saveOperation();


      while (this.saveQueue.length > 0) {
        const nextOperation = this.saveQueue.shift();
        if (nextOperation) {
          await nextOperation();
        }
      }
    } finally {
      this.isSaving = false;
    }
  }


  public async dispose(): Promise<void> {

    this.saveQueue = [];

  }
}
