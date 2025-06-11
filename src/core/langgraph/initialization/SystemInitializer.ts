// src/core/langgraph/initialization/SystemInitializer.ts
import * as vscode from 'vscode';
import { ComponentFactory } from '../../ComponentFactory';
import { LangGraphEngine } from '../LangGraphEngine';
import { EnvironmentConfig } from '../config/EnvironmentConfig';

export class SystemInitializer {

    public static async initialize(context: vscode.ExtensionContext): Promise<LangGraphEngine> {
        console.log('[SystemInitializer] Initializing LangGraph Engine...');

        const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
        console.log(`[SystemInitializer] Environment detected: ${environment}`);


        const engineConfig = EnvironmentConfig.getConfig(environment);


        const modelManager = ComponentFactory.getModelManager();
        const toolRegistry = ComponentFactory.getToolRegistry();
        const memoryManager = ComponentFactory.getMemoryManager(context);
        const dispatcher = ComponentFactory.getInternalEventDispatcher();
        const performanceMonitor = ComponentFactory.getPerformanceMonitor();
        const cacheManager = ComponentFactory.getCacheManager();
        const parallelExecutionService = ComponentFactory.getParallelExecutionService();


        const engine = new LangGraphEngine(
            modelManager,
            toolRegistry,
            memoryManager,
            dispatcher,
            performanceMonitor,
            cacheManager,
            parallelExecutionService,
            engineConfig
        );



        console.log('[SystemInitializer] LangGraph Engine initialized successfully.');
        return engine;
    }


}