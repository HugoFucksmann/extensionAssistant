// src/shared/utils/generateIds.ts
import { randomUUID } from 'node:crypto';


export function generateUniqueId(): string {
  return randomUUID();
}
