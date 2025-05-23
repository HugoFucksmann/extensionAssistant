// src/core/ComponentFactory.ts
import * as vscode from 'vscode'; // Asegúrate de importar vscode
import { VSCodeContext } from '../shared/types'; // Este VSCodeContext es tu tipo personalizado
import { eventBus } from '../features/events/EventBus';
import { EventLogger } from '../features/events/EventLogger';
import { ModelManager } from '../features/ai/ModelManager';
import { PromptManager } from '../features/ai/promptManager';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { WindsurfGraph } from '../features/ai/ReActGraph';
import { MemoryManager } from '../features/memory/MemoryManager';
import { ConversationManager } from './ConversationManager';
import { WindsurfController } from './WindsurfController';

export class ComponentFactory {
  private static windsurfControllerInstance: WindsurfController;

  // Cambia VSCodeContext aquí por vscode.ExtensionContext
  public static getWindsurfController(extensionContext: vscode.ExtensionContext): WindsurfController {
    if (!this.windsurfControllerInstance) {
      // EventBus es un singleton, EventLogger se suscribe al ser instanciado
      // Pasa el outputChannel del extensionContext si EventLogger lo necesita así,
      // o ajusta EventLogger para tomar solo el OutputChannel.
      // Por ahora, asumimos que EventLogger puede tomar el VSCodeContext personalizado si es necesario,
      // o simplemente el outputChannel.
      // Si EventLogger necesita el VSCodeContext personalizado:
      const customVSCodeContext: VSCodeContext = {
          extensionUri: extensionContext.extensionUri,
          extensionPath: extensionContext.extensionPath,
          subscriptions: extensionContext.subscriptions,
          outputChannel: vscode.window.createOutputChannel("Extension Assistant Log"), // O pásalo desde extension.ts
          // Asegúrate de que el outputChannel se cree y pase correctamente.
          // Si ya tienes un outputChannel en tu VSCodeContext personalizado, úsalo.
          // El error principal es con MemoryManager.
          state: extensionContext.globalState, // o workspaceState según necesites
      };
      new EventLogger(customVSCodeContext); // O ajusta EventLogger

      // Los managers que necesitan contexto de VS Code (para almacenamiento, config)
      const memoryManager = new MemoryManager(extensionContext); // <--- AHORA USA extensionContext
      const modelManager = new ModelManager(/* defaultProvider, se carga desde config VSCode */);

      // Managers que no dependen directamente del contexto de VS Code en su constructor
      const promptManager = new PromptManager();
      const toolRegistry = new ToolRegistry(/* extensionContext si alguna herramienta lo necesita directamente */);
      const conversationManager = new ConversationManager();

      const reactGraph = new WindsurfGraph(modelManager, toolRegistry, promptManager);

      this.windsurfControllerInstance = new WindsurfController(
        customVSCodeContext, // WindsurfController usa tu tipo personalizado
        eventBus,
        memoryManager,
        reactGraph,
        conversationManager,
        toolRegistry
      );
      console.log('[ComponentFactory] WindsurfController instance created.');
    }
    return this.windsurfControllerInstance;
  }
}