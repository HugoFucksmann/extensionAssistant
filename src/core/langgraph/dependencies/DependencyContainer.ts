// src/core/langgraph/dependencies/DependencyContainer.ts

export class DependencyContainer {
    private services = new Map<string, any>();


    public register<T>(name: string, instance: T): void {
        if (this.services.has(name)) {
            console.warn(`Service with name "${name}" is already registered. Overwriting.`);
        }
        this.services.set(name, instance);
    }


    public get<T>(name: string): T {
        const instance = this.services.get(name);
        if (!instance) {
            throw new Error(`Service not found: ${name}. Ensure it has been registered.`);
        }
        return instance as T;
    }
}