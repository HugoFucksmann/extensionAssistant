// src/core/OptimizedReActFactory.ts
import * as vscode from 'vscode';
import { OptimizedReActEngine } from './OptimizedReActEngine';
import { ModelManager } from '../features/ai/ModelManager';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { LongTermStorage } from '../features/memory/LongTermStorage';

export class OptimizedReActFactory {

  public static create(
    context: vscode.ExtensionContext,
    dispatcher: InternalEventDispatcher,
    toolRegistry: ToolRegistry
  ): OptimizedReActEngine {

    const modelManager = new ModelManager();
    
 
    const longTermStorage = new LongTermStorage(context);
    
    
    const reactEngine = new OptimizedReActEngine(
      modelManager,
      toolRegistry,
      dispatcher,
      longTermStorage
    );
    
    return reactEngine;
  }
}
