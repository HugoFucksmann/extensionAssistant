/**
 * Índice de adaptadores para los componentes principales
 * Facilita la importación de todos los adaptadores desde un único punto
 */

// Exportar adaptadores

//export { MemoryManagerAdapter } from '../../memory/memoryManagerAdapter';
export { ModelManagerAdapter } from '../../models/modelManagerAdapter';
export { ToolRegistryAdapter } from '../../modules/tools';
export { ReActGraphAdapter } from '../../langgraph/reactGraphAdapter';

// Exportar interfaces
export { IEventBus } from '../interfaces/event-bus.interface';
//export { IMemoryManager } from '../interfaces/memory-manager.interface';
export { IModelManager } from '../interfaces/model-manager.interface';
export { IToolRegistry } from '../interfaces/tool-registry.interface';
export { IReActGraph } from '../interfaces/react-graph.interface';
export { IConversationManager } from '../interfaces/conversation-manager.interface';
