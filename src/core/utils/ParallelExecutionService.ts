// src/core/utils/ParallelExecutionService.ts

import { Disposable } from "@core/interfaces/Disposable";


class Semaphore {
    private permits: number;
    private waitingQueue: Array<() => void> = [];

    constructor(permits: number) {
        this.permits = permits;
    }

    async acquire(): Promise<() => void> {
        return new Promise((resolve) => {
            if (this.permits > 0) {
                this.permits--;
                resolve(this.release.bind(this));
            } else {
                this.waitingQueue.push(() => {
                    this.permits--;
                    resolve(this.release.bind(this));
                });
            }
        });
    }

    private release(): void {
        this.permits++;
        if (this.waitingQueue.length > 0) {
            const next = this.waitingQueue.shift()!;
            next();
        }
    }
}

export interface ParallelOptions {
    maxConcurrency?: number;
    timeoutMs?: number;
    failFast?: boolean;
}

export class ParallelExecutionService implements Disposable {
    public async execute<T>(
        tasks: Array<() => Promise<T>>,
        options: ParallelOptions = {}
    ): Promise<Array<T | null>> {
        const { maxConcurrency = 3, timeoutMs = 30000, failFast = false } = options;
        const semaphore = new Semaphore(maxConcurrency);

        const createTimeout = (ms: number): Promise<never> => {
            return new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Task timed out after ${ms}ms`)), ms);
            });
        };

        const wrappedTasks = tasks.map(task => async () => {
            const release = await semaphore.acquire();
            try {
                return await Promise.race([task(), createTimeout(timeoutMs)]);
            } finally {
                release();
            }
        });

        if (failFast) {
            return Promise.all(wrappedTasks.map(t => t()));
        }

        const results = await Promise.allSettled(wrappedTasks.map(t => t()));
        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            console.warn(`[ParallelExecutionService] Task ${index} failed:`, result.reason);
            return null;
        });
    }


    public dispose(): void {
        console.log('[ParallelExecutionService] Disposed.');
    }
}