// src/core/OptimizedReActFactory.ts
import * as vscode from 'vscode';
import { OptimizedReActEngine } from './OptimizedReActEngine';
import { ModelManager } from '../features/ai/ModelManager';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { LongTermStorage } from '../features/memory/LongTermStorage';

export class OptimizedReActFactory {
  /**
   * Crea una instancia del motor ReAct optimizado con todas sus dependencias
   */
  public static create(
    context: vscode.ExtensionContext,
    dispatcher: InternalEventDispatcher,
    toolRegistry: ToolRegistry
  ): OptimizedReActEngine {
    // Crear instancia de ModelManager
    const modelManager = new ModelManager();
    
    // Crear instancia de LongTermStorage
    const longTermStorage = new LongTermStorage(context);
    
    // Crear instancia de OptimizedReActEngine
    const reactEngine = new OptimizedReActEngine(
      modelManager,
      toolRegistry,
      dispatcher,
      longTermStorage
    );
    
    return reactEngine;
  }
}
