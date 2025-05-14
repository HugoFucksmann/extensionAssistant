// src/orchestrator/execution/ExecutorFactory.ts

import { ExecutorRegistry } from "./ExecutorRegistry";
import { PromptExecutor } from "./PromptExecutor";
import { ToolExecutor } from "./ToolExecutor";
import { IExecutor } from "./types";


export class ExecutorFactory {
  /**
   * Creates and initializes a fully configured ExecutorRegistry with all available executors.
   * Centralized factory method to ensure consistent executor registration.
   */
  public static createExecutorRegistry(): ExecutorRegistry {
    const registry = new ExecutorRegistry();

    // Register standard executors
    registry.register(new ToolExecutor());
    registry.register(new PromptExecutor());

    // More executors can be registered here in the future

    return registry;
  }

  /**
   * Registers a custom executor to the provided registry.
   * Useful for extending functionality or adding custom executors at runtime.
   */
  public static registerCustomExecutor(registry: ExecutorRegistry, executor: IExecutor): void {
    registry.register(executor);
  }
}