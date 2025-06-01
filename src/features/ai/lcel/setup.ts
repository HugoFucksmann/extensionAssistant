// src/features/ai/lcel/setup.ts
import { ChainRegistry } from './ChainRegistry';
import { GenericLCELChainExecutor } from './GenericLCELChainExecutor';
import { ModelManager } from '../ModelManager';
import { allChainConfigs } from './chainConfigs';

/**
 * Inicializa un registro de cadenas con las configuraciones predefinidas
 * y opcionalmente con configuraciones personalizadas adicionales.
 * 
 * @param customConfigs Configuraciones personalizadas adicionales para registrar
 * @returns Una instancia inicializada de ChainRegistry
 */
export function initializeChainRegistry(customConfigs = []) {
  const registry = new ChainRegistry();
  
  // Registrar todas las configuraciones predefinidas
  allChainConfigs.forEach(config => registry.registerChain(config));
  
  // Registrar configuraciones personalizadas si existen
  customConfigs.forEach(config => registry.registerChain(config));
  
  return registry;
}

/**
 * Crea una instancia de GenericLCELChainExecutor con un registro inicializado
 * y el ModelManager proporcionado.
 * 
 * @param modelManager Instancia de ModelManager para la ejecución de cadenas
 * @param customRegistry Registro personalizado opcional (si no se proporciona, se crea uno nuevo)
 * @returns Una instancia inicializada de GenericLCELChainExecutor
 */
export function createChainExecutor(
  modelManager: ModelManager,
  customRegistry?: ChainRegistry
) {
  const registry = customRegistry || initializeChainRegistry();
  return new GenericLCELChainExecutor(registry, modelManager);
}

/**
 * Función de ayuda para migrar gradualmente del sistema antiguo al nuevo.
 * Permite ejecutar una cadena optimizada utilizando el nuevo sistema LCEL.
 * 
 * @param chainName Nombre de la cadena a ejecutar
 * @param input Entrada para la cadena
 * @param modelManager Instancia de ModelManager
 * @returns Resultado de la ejecución de la cadena
 */
export async function executeOptimizedChain(
  chainName: string,
  input: any,
  modelManager: ModelManager
) {
  const executor = createChainExecutor(modelManager);
  return await executor.execute(chainName, input, {
    model: modelManager.getActiveModel()
  });
}
