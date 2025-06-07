// src/core/langgraph/dependencies/DependencyContainer.ts

export class DependencyContainer {
    private services = new Map<string, any>();

    /**
     * Registers a service instance with a given name.
     * @param name The identifier for the service (e.g., 'IMemoryService').
     * @param instance The singleton instance of the service.
     */
    public register<T>(name: string, instance: T): void {
        if (this.services.has(name)) {
            console.warn(`Service with name "${name}" is already registered. Overwriting.`);
        }
        this.services.set(name, instance);
    }

    /**
     * Retrieves a registered service instance.
     * @param name The identifier for the service.
     * @returns The service instance.
     * @throws Error if the service is not found.
     */
    public get<T>(name: string): T {
        const instance = this.services.get(name);
        if (!instance) {
            throw new Error(`Service not found: ${name}. Ensure it has been registered.`);
        }
        return instance as T;
    }
}