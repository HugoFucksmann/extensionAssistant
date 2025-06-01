// src/features/ai/lcel/ChainRegistry.ts
import { ChainConfiguration } from './types';

export class ChainRegistry {
  private chains = new Map<string, ChainConfiguration<any, any, any>>();

  public registerChain(config: ChainConfiguration<any, any, any>): void {
    if (this.chains.has(config.name)) {
      console.warn(`[ChainRegistry] Chain "${config.name}" is already registered. Overwriting.`);
    }
    this.chains.set(config.name, config);
    console.log(`[ChainRegistry] Registered chain: ${config.name}`);
  }

  public getChainConfiguration(name: string): ChainConfiguration<any, any, any> | undefined {
    const config = this.chains.get(name);
    if (!config) {
      // No lanzar error aquí, permitir que el llamador decida.
      // El GenericLCELChainExecutor sí lanzará un error si no la encuentra.
      console.warn(`[ChainRegistry] Chain configuration for "${name}" not found.`);
    }
    return config;
  }

  public getAllChainNames(): string[] {
    return Array.from(this.chains.keys());
  }

  public getAllChainConfigurations(): ChainConfiguration<any, any, any>[] {
    return Array.from(this.chains.values());
  }

  public unregisterChain(name: string): boolean {
    if (this.chains.has(name)) {
      this.chains.delete(name);
      console.log(`[ChainRegistry] Unregistered chain: ${name}`);
      return true;
    }
    console.warn(`[ChainRegistry] Attempted to unregister non-existent chain: ${name}`);
    return false;
  }

  public clearAllChains(): void {
    this.chains.clear();
    console.log('[ChainRegistry] All chains cleared.');
  }
}