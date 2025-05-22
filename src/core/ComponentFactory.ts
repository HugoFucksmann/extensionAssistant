// src/core/ComponentFactory.ts
import { VSCodeContext, WindsurfState } from '../shared/types';
import { eventBus } from '../features/events/EventBus'; // Importa la instancia singleton
import { EventLogger } from '../features/events/EventLogger';
import { ModelManager } from '../features/ai/ModelManager';
import { PromptManager } from '../features/ai/promptManager';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { WindsurfGraph } from '../features/ai/ReActGraph';
import { MemoryManager } from '../features/memory/MemoryManager';
import { ConversationManager } from './ConversationManager';
import { WindsurfController } from './WindsurfController';
// Opcional: importa la interfaz si la creaste
// import { IWindsurfController } from './interfaces/IWindsurfController';

export class ComponentFactory {
  private static windsurfControllerInstance: WindsurfController;

  public static getWindsurfController(vscodeContext: VSCodeContext): WindsurfController {
    if (!this.windsurfControllerInstance) {
      // EventBus es un singleton, EventLogger se suscribe al ser instanciado
      new EventLogger(vscodeContext); // Pasa el contexto para el outputChannel

      // Los managers que necesitan contexto de VS Code (para almacenamiento, config)
      const memoryManager = new MemoryManager(vscodeContext);
      const modelManager = new ModelManager(/* defaultProvider, se carga desde config VSCode */);

      // Managers que no dependen directamente del contexto de VS Code en su constructor
      const promptManager = new PromptManager();
      const toolRegistry = new ToolRegistry(/* vscodeContext si alguna herramienta lo necesita directamente */);
      const conversationManager = new ConversationManager();

      const reactGraph = new WindsurfGraph(modelManager, toolRegistry, promptManager);

      this.windsurfControllerInstance = new WindsurfController(
        vscodeContext,
        eventBus, // Pasa la instancia singleton
        memoryManager,
        reactGraph,
        conversationManager,
        toolRegistry // Para obtener información de herramientas si es necesario
      );
      console.log('[ComponentFactory] WindsurfController instance created.');
    }
    return this.windsurfControllerInstance;
  }

  // Podrías añadir métodos para obtener otros singletons si fuera necesario,
  // pero muchos (como ModelManager, MemoryManager) se instancian una vez
  // y se pasan al controlador.
}