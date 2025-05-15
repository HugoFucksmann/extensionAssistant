import { IExecutor } from "./types";

/**
 * Registry for step executors. Maintains a collection of executors and
 * provides a way to find the appropriate executor for a given action.
 */
export class ExecutorRegistry {
  private executors: IExecutor[] = [];

  /**
   * Registers a new executor in the registry
   * @param executor The executor to register
   */
  register(executor: IExecutor): void {
    this.executors.push(executor);
  }

  /**
   * Finds the first executor that can handle the specified action
   * @param action The action to find an executor for
   * @returns The first executor that can handle the action, or undefined if none found
   */
  getExecutorFor(action: string): IExecutor | undefined {
    return this.executors.find(executor => executor.canExecute(action));
  }
}