import { IExecutor } from "./types";

/**
 * Registry for step executors. Maintains a collection of executors and
 * provides a way to find the appropriate executor for a given action.
 *
 * EXTENSIBILITY: To add a new type of step execution (e.g., a custom API call executor),
 * create a class implementing IExecutor and register it with the ExecutorFactory.
 */
export class ExecutorRegistry {
  private executors: IExecutor[] = [];

  /**
   * Registers a new executor in the registry
   * @param executor The executor to register
   */
  register(executor: IExecutor): void {
    this.executors.push(executor);
    console.log(`[ExecutorRegistry] Registered executor: ${executor.constructor.name}`);
  }

  /**
   * Finds the first executor that can handle the specified action
   * @param action The action to find an executor for
   * @returns The first executor that can handle the action, or undefined if none found
   */
  getExecutorFor(action: string): IExecutor | undefined {
    const executor = this.executors.find(executor => executor.canExecute(action));
    if (!executor) {
        console.warn(`[ExecutorRegistry] No executor found for action: ${action}`);
    }
    return executor;
  }
}