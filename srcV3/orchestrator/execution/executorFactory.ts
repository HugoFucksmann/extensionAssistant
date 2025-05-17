// src/orchestrator/execution/ExecutorFactory.ts

import { ExecutorRegistry } from "./ExecutorRegistry";
import { PromptExecutor } from "./PromptExecutor"; 
import { ToolExecutor } from "./ToolExecutor"; 
import { IExecutor } from "./types"; 


import { IModelService } from '../../models/interfaces';
import { IToolRunner } from '../../tools'; 

export class ExecutorFactory {
  /**
   * Creates and initializes a fully configured ExecutorRegistry with all available executors.
   * Centralized factory method to ensure consistent executor registration.
   * Requires the necessary services to instantiate the executors.
   * @param modelService The instance of IModelService.
   * @param toolRunner The instance of IToolRunner.
   * @returns A configured ExecutorRegistry.
   */
  public static createExecutorRegistry(modelService: IModelService, toolRunner: IToolRunner): ExecutorRegistry { 
    const registry = new ExecutorRegistry();

    
    registry.register(new ToolExecutor(toolRunner)); 
    registry.register(new PromptExecutor(modelService));

    return registry;
  }

  /**
   * Registers a custom executor to the provided registry.
   * Useful for extending functionality or adding custom executors at runtime.
   * Note: Custom executors added this way must be instantiated *outside* the factory.
   */
  public static registerCustomExecutor(registry: ExecutorRegistry, executor: IExecutor): void {
    registry.register(executor);
  }
}