

/**
 * Base repository interface for CRUD operations
 */
export interface IRepository<T> {
  create(item: T): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: string, item: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
}

