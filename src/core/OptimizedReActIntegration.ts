/**
 * Integración del motor ReAct optimizado con el sistema existente
 * Proporciona una forma de usar el nuevo motor optimizado en el flujo actual
 */

import * as vscode from 'vscode';
import { OptimizedReActEngine } from './OptimizedReActEngine';
import { OptimizedReActFactory } from './OptimizedReActFactory';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { ComponentFactory } from './ComponentFactory';

export class OptimizedReActIntegration {
  private static instance: OptimizedReActEngine;

  /**
   * Inicializa el motor ReAct optimizado y lo integra con el sistema existente
   */
  public static initialize(
    context: vscode.ExtensionContext,
    dispatcher: InternalEventDispatcher,
    toolRegistry: ToolRegistry
  ): OptimizedReActEngine {
    if (!this.instance) {
      console.log('[OptimizedReActIntegration] Inicializando motor ReAct optimizado');
      this.instance = OptimizedReActFactory.create(context, dispatcher, toolRegistry);
      console.log('[OptimizedReActIntegration] Motor ReAct optimizado inicializado correctamente');
    }
    return this.instance;
  }

  /**
   * Obtiene la instancia del motor ReAct optimizado
   * Si no existe, la crea utilizando el contexto de la extensión
   */
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
