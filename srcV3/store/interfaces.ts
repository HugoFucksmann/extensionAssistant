import * as vscode from 'vscode';
export * from './interfaces/index';

import { IChatRepository, ICacheRepository, IMemoryRepository } from './interfaces/index';

/**
 * Interface for the service managing access to all data repositories.
 * This is the single entry point for consumers needing database interaction.
 */
export interface IStorageService extends vscode.Disposable {
    /**
     * Gets the repository for managing chat conversations and messages.
     * @returns An instance of the IChatRepository.
     */
    getChatRepository(): IChatRepository;

    /**
     * Gets the repository for managing cached data.
     * @returns An instance of the ICacheRepository.
     */
    getCacheRepository(): ICacheRepository;

    /**
     * Gets the repository for managing semantic memory items.
     * @returns An instance of the IMemoryRepository.
     */
    getMemoryRepository(): IMemoryRepository;
}