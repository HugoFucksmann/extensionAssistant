// src/services/StorageService.ts

import * as vscode from 'vscode';
import { DatabaseManager } from '../store/database/DatabaseManager';
import { ChatRepository } from '../store/repositories/ChatRepository';
import { CacheRepository } from '../store/repositories/CacheRepository';
import { MemoryRepository } from '../store/repositories/MemoryRepository';
import { IStorageService } from '../store/interfaces';
import { 
  IChatRepository,
  ICacheRepository, 
  IMemoryRepository 
} from '../store/interfaces/index';

export class StorageService implements IStorageService {
    private dbManager: DatabaseManager;
    private chatRepository: IChatRepository;
    private cacheRepository: ICacheRepository;
    private memoryRepository: IMemoryRepository;
    private disposables: vscode.Disposable[] = [];

    constructor(context: vscode.ExtensionContext) {
        console.log('[StorageService] Initializing...');

        
        this.dbManager = DatabaseManager.getInstance(context);

       
        this.chatRepository = new ChatRepository(context);
        this.cacheRepository = new CacheRepository(context);
        this.memoryRepository = new MemoryRepository(context);

       

        console.log('[StorageService] Initialized repositories.');
    }

    /**
     * Gets the repository for managing chat conversations and messages.
     */
    public getChatRepository(): IChatRepository {
        return this.chatRepository;
    }

    /**
     * Gets the repository for managing cached data.
     */
    public getCacheRepository(): ICacheRepository {
        return this.cacheRepository;
    }

    /**
     * Gets the repository for managing semantic memory items.
     */
    public getMemoryRepository(): IMemoryRepository {
        return this.memoryRepository;
    }

    /**
     * Disposes of resources held by the StorageService.
     * Primarily closes the database connection via DatabaseManager.
     */
    dispose(): void {
        console.log('[StorageService] Disposing.');
      
        this.disposables.forEach(d => d.dispose());
        this.disposables = []; // Clear the array

        // Close the database connection managed by the Singleton DatabaseManager
        // This is crucial.
        if (this.dbManager) {
             this.dbManager.close(); 
        }
    }
}