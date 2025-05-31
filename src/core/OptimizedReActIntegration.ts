

import * as vscode from 'vscode';
import { OptimizedReActEngine } from './OptimizedReActEngine';
import { OptimizedReActFactory } from './OptimizedReActFactory';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { ComponentFactory } from './ComponentFactory';

export class OptimizedReActIntegration {
  private static instance: OptimizedReActEngine;


  public static initialize(
    context: vscode.ExtensionContext,
    dispatcher: InternalEventDispatcher,
    toolRegistry: ToolRegistry
  ): OptimizedReActEngine {
    if (!this.instance) {
      
      this.instance = OptimizedReActFactory.create(context, dispatcher, toolRegistry);
     
    }
    return this.instance;
  }


  public static getInstance(context?: vscode.ExtensionContext): OptimizedReActEngine {
    if (!this.instance && context) {
      const dispatcher = ComponentFactory.getInternalEventDispatcher();
      const toolRegistry = ComponentFactory.getToolRegistry();
      return this.initialize(context, dispatcher, toolRegistry);
    }
    
    if (!this.instance) {
      throw new Error('[OptimizedReActIntegration] No se ha inicializado el motor ReAct optimizado');
    }
    
    return this.instance;
  }
}
