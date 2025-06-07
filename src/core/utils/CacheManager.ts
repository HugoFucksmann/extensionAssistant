// src/core/utils/CacheManager.ts
import { createHash } from 'node:crypto';
import { Disposable } from '../interfaces/Disposable';

interface CacheEntry {
    value: any;
    createdAt: number;
    lastAccessed: number;
    ttl: number; // Time-to-live in milliseconds
}

export interface CacheConfig {
    defaultTTL: number; // Default TTL in ms
    maxSize: number; // Max number of items in cache
    cleanupInterval: number; // How often to check for expired items in ms
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
    cleanupInterval: 60 * 1000, // 1 minute
};

export class CacheManager implements Disposable {
    private cache = new Map<string, CacheEntry>();
    private config: CacheConfig;
    private cleanupTimer: NodeJS.Timeout;

    constructor(config: Partial<CacheConfig> = {}) {
        this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
        this.cleanupTimer = setInterval(() => this.purgeExpired(), this.config.cleanupInterval);
    }

    public get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry || this.isExpired(entry)) {
            this.cache.delete(key);
            return null;
        }
        entry.lastAccessed = Date.now();
        return entry.value as T;
    }

    public set<T>(key: string, value: T, ttl?: number): void {
        if (this.cache.size >= this.config.maxSize) {
            this.enforceMaxSize();
        }
        const entry: CacheEntry = {
            value,
            createdAt: Date.now(),
            lastAccessed: Date.now(),
            ttl: ttl || this.config.defaultTTL,
        };
        this.cache.set(key, entry);
    }

    public hashInput(input: any): string {
        if (input === null || input === undefined) return 'null';
        // Sort object keys for consistent hashing
        const sortedInput = JSON.stringify(this.sortObjectKeys(input));
        return createHash('md5').update(sortedInput).digest('hex');
    }

    private isExpired(entry: CacheEntry): boolean {
        return Date.now() > entry.createdAt + entry.ttl;
    }

    private purgeExpired(): void {
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                this.cache.delete(key);
            }
        }
    }

    private enforceMaxSize(): void {
        // Simple LRU (Least Recently Used) eviction strategy
        if (this.cache.size < this.config.maxSize) return;

        const oldestEntry = [...this.cache.entries()].sort(
            (a, b) => a[1].lastAccessed - b[1].lastAccessed
        )[0];

        if (oldestEntry) {
            this.cache.delete(oldestEntry[0]);
        }
    }

    private sortObjectKeys(obj: any): any {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            return obj;
        }
        return Object.keys(obj).sort().reduce((result, key) => {
            (result as any)[key] = this.sortObjectKeys(obj[key]);
            return result;
        }, {});
    }

    public dispose(): void {
        clearInterval(this.cleanupTimer);
        this.cache.clear();
    }
}