// src/core/langgraph/initialization/SystemInitializer.ts
import * as vscode from 'vscode';
import { ComponentFactory } from '../../ComponentFactory';
import { LangGraphEngine } from '../LangGraphEngine';
import { EnvironmentConfig } from '../config/EnvironmentConfig';

export class SystemInitializer {
    /**
     * Initializes and returns a fully configured LangGraphEngine instance.
     * This is the main entry point for creating the agent engine.
     * @param context The VS Code extension context.
     * @returns A promise that resolves to a LangGraphEngine instance.
     */
    public static async initialize(context: vscode.ExtensionContext): Promise<LangGraphEngine> {
        console.log('[SystemInitializer] Initializing LangGraph Engine...');

        const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
        console.log(`[SystemInitializer] Environment detected: ${environment}`);

        // 1. Cargar configuración del motor
        const engineConfig = EnvironmentConfig.getConfig(environment);

        // 2. Obtener dependencias core desde ComponentFactory
        const modelManager = ComponentFactory.getModelManager();
        const toolRegistry = ComponentFactory.getToolRegistry(); // Ya está configurado con caché
        const memoryManager = ComponentFactory.getMemoryManager(context);
        const dispatcher = ComponentFactory.getInternalEventDispatcher();
        const performanceMonitor = ComponentFactory.getPerformanceMonitor();

        // 3. Crear y configurar el motor
        const engine = new LangGraphEngine(
            modelManager,
            toolRegistry,
            memoryManager,
            dispatcher,
            performanceMonitor,
            engineConfig
        );

        // 4. (Opcional) Validar la configuración con una ejecución de prueba
        // await this.validateSetup(engine);

        console.log('[SystemInitializer] LangGraph Engine initialized successfully.');
        return engine;
    }

    private static async validateSetup(engine: LangGraphEngine): Promise<void> {
        try {
            console.log('[SystemInitializer] Running validation test...');
            const testResult = await engine.run('Hello, test', 'test-initialization-chat');
            if (!testResult.isCompleted || testResult.error) {
                throw new Error(`Engine initialization test failed. Final state: ${JSON.stringify(testResult)}`);
            }
            console.log('[SystemInitializer] Engine validation successful.');
        } catch (error) {
            console.error('[SystemInitializer] Engine validation failed:', error);
            // No relanzar el error para no bloquear la extensión, solo advertir.
            vscode.window.showWarningMessage('LangGraph Engine validation failed. Check logs for details.');
        }
    }
}