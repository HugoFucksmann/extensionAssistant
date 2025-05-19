// src/di/ServiceFactory.ts
// MODIFIED: Added CodeUnderstandingService integration.

import * as vscode from 'vscode';
import { EventEmitterService } from '../events';
import { Logger, TraceService } from '../observability';
import { ValidatorService } from '../validation';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { DatabaseManager, ChatRepository, StepRepository, MemoryRepository } from '../store';
import { GlobalContextService, SessionContextService, ConversationService, TurnStateService, ContextResolver } from '../contextServices';
import { ModelManager } from '../models';
import { LangChainToolAdapter } from '../tools/core/LangChainToolAdapter';
import { PromptService } from '../models/PromptService'; // Need specific import for the class
import { OrchestratorService } from '../orchestrator';
// MODIFIED: Import the new service and its interface
import { ConversationManager, ChatInteractor, CodeUnderstandingService, ICodeUnderstandingService } from '../services';
import { UIBridge } from '../ui/uiBridge'; // Need specific import for the class

import { ChatPersistenceService, StepPersistenceService, MemoryPersistenceService } from '../store/services';
import { WebviewProvider } from '../ui/webView/webviewProvider';

// Define a type for the service names that can be accessed via get()
export type ServiceName = 
    'eventEmitterService' | 
    'logger' | 
    'databaseManager' | 
    'validatorService' | 
    'traceService' | 
    'configurationManager' | 
    'chatRepository' | 
    'stepRepository' | 
    'memoryRepository' | 
    'chatPersistenceService' | 
    'stepPersistenceService' | 
    'memoryPersistenceService' | 
    'globalContextService' | 
    'sessionContextService' | 
    'conversationService' | 
    'turnStateService' | 
    'modelManager' | 
    'langChainToolAdapter' | 
    'promptService' | 
    'orchestratorService' | 
    'conversationManager' | 
    'chatInteractor' | 
    'codeUnderstandingService' | 
    'uiBridge' | 
    'webviewProvider';

/**
 * Central factory for creating and managing all service instances.
 * This is the Dependency Injection container.
 */
export class ServiceFactory implements vscode.Disposable {
    // Singletons
    private eventEmitterService: EventEmitterService;
    private logger: Logger;
    private databaseManager: DatabaseManager;
    private validatorService: ValidatorService;
    private traceService: TraceService;

    // Config
    private configurationManager: ConfigurationManager;

    // Repositories (instances depend on DatabaseManager)
    private chatRepository: ChatRepository;
    private stepRepository: StepRepository;
    private memoryRepository: MemoryRepository;

    // Persistence Services (depend on Repositories and EventEmitter)
    private chatPersistenceService: ChatPersistenceService;
    private stepPersistenceService: StepPersistenceService;
    private memoryPersistenceService: MemoryPersistenceService;

    // Context Services (depend on Config, VS Code Context, Persistence Services)
    private globalContextService: GlobalContextService;
    private sessionContextService: SessionContextService;
    private conversationService: ConversationService;
    private turnStateService: TurnStateService;
    // ContextResolver is a static utility, not managed here

    // Model & Tool Infrastructure
    private modelManager: ModelManager;
    private langChainToolAdapter: LangChainToolAdapter;
    private promptService: PromptService;

    // Orchestration
    private orchestratorService: OrchestratorService;

    // Application Services
    private conversationManager: ConversationManager;
    private chatInteractor: ChatInteractor;
    // MODIFIED: Add property for the new service
    private codeUnderstandingService: ICodeUnderstandingService; // Use the interface type


    // UI Layer (Bridge & Provider)
    private uiBridge: UIBridge;
    private webviewProvider: WebviewProvider;


    constructor(private context: vscode.ExtensionContext) {
        console.log('[ServiceFactory] Initializing all services...');

        // 1. Initialize fundamental Singletons
        this.eventEmitterService = EventEmitterService.getInstance();
        this.logger = Logger.getInstance();
        this.databaseManager = DatabaseManager.getInstance(context); // Depends on context

        // 2. Initialize Core Transversal Services (depend on basic Singletons)
        this.validatorService = ValidatorService.getInstance(this.eventEmitterService); // Depends on EventEmitter
        this.traceService = TraceService.getInstance(this.logger, this.eventEmitterService); // Depends on Logger, EventEmitter

        // 3. Initialize Configuration
        this.configurationManager = new ConfigurationManager(context); // Depends on context

        // 4. Initialize Repositories (depend on DatabaseManager)
        // Ensure DB is open before getting instance
         try {
             const dbInstance = this.databaseManager.getDatabase();
             this.chatRepository = new ChatRepository(dbInstance); // Depends on DB instance
             this.stepRepository = new StepRepository(dbInstance); // Depends on DB instance
             this.memoryRepository = new MemoryRepository(dbInstance); // Depends on DB instance
         } catch (error) {
             console.error('[ServiceFactory] Failed to get database instance:', error);
             // Handle critical startup error - extension might not be usable
             throw error;
         }


        // 5. Initialize Persistence Services (depend on Repositories and EventEmitter)
        this.chatPersistenceService = new ChatPersistenceService(this.chatRepository, this.eventEmitterService);
        this.stepPersistenceService = new StepPersistenceService(this.stepRepository, this.eventEmitterService);
        this.memoryPersistenceService = new MemoryPersistenceService(this.memoryRepository, this.eventEmitterService);

        // 6. Initialize Context Services (depend on Config, VS Code Context, Persistence Services)
        this.globalContextService = new GlobalContextService(this.configurationManager); // Depends on Config
        this.sessionContextService = new SessionContextService(context, this.globalContextService); // Depends on context, GlobalContextService
        this.conversationService = new ConversationService(this.chatPersistenceService, this.eventEmitterService); // Depends on ChatPersistenceService, EventEmitter
        // TurnStateService depends on multiple Context Services and Step Persistence
        this.turnStateService = new TurnStateService(
             this.globalContextService,
             this.sessionContextService,
             this.conversationService,
             this.stepPersistenceService // Depends on Step Persistence Service
        );
        // ContextResolver is a static utility

        // 7. Initialize Model & Tool Infrastructure (depend on Config, Validation, Events, Trace)
        this.modelManager = new ModelManager(this.configurationManager); // Depends on Config
        this.langChainToolAdapter = new LangChainToolAdapter(this.validatorService, this.eventEmitterService, this.traceService); // Depends on Validation, Events, Trace
        // PromptService depends on ModelManager, Validation, Events, Trace
         this.promptService = new PromptService(
             this.modelManager,
             this.validatorService,
             this.eventEmitterService,
             this.traceService
         );


        // 8. Initialize Orchestration (depends on infrastructure and context services)
        // OrchestratorService depends on PromptService, ToolAdapter, TurnStateService, ValidatorService, Events, Trace, ModelManager
         this.orchestratorService = new OrchestratorService(
             this.promptService,
             this.langChainToolAdapter,
             this.turnStateService,
             this.validatorService, // Passed to graph dependencies
             this.traceService, // Passed to graph dependencies
             this.eventEmitterService, // Passed to graph dependencies
             this.modelManager // Passed to graph dependencies (for abort controller)
         );


        // 9. Initialize Application Services (depend on Persistence, Context, Orchestration)
        this.conversationManager = new ConversationManager(
             this.chatPersistenceService, // Depends on Chat Persistence
             this.conversationService, // Depends on Conversation Service
             this.orchestratorService // Depends on Orchestrator
        );
         this.chatInteractor = new ChatInteractor(
             this.conversationManager, // Depends on Conversation Manager
             this.chatPersistenceService // Depends on Chat Persistence (for listing)
         );
        // MODIFIED: Instantiate the new service
        // Inject dependencies into CodeUnderstandingService if it had any (e.g., EventEmitterService)
         this.codeUnderstandingService = new CodeUnderstandingService(/* dependencies here */);


        // 10. Initialize UI Layer (depend on App Services, Config, Validation, Events, Tools)
        // UIBridge depends on ChatInteractor, Config, Validation, Events, ToolAdapter
         this.uiBridge = new UIBridge(
             this.chatInteractor,
             this.configurationManager,
             this.validatorService,
             this.eventEmitterService,
             this.langChainToolAdapter // Depends on ToolAdapter for direct UI tool calls
         );
         // WebviewProvider depends on VS Code Context, Config, UIBridge, Events
         this.webviewProvider = new WebviewProvider(
             context, // Depends on context
             this.configurationManager, // Depends on Config
             this.uiBridge, // Depends on UIBridge
             this.eventEmitterService // Depends on Events (for ui:postMessage listener)
         );


        console.log('[ServiceFactory] All services initialized and wired.');
    }

    /**
     * Gets a service instance by type (using property access).
     * This provides controlled access from extension.ts.
     */
     get<T extends ServiceName>(serviceName: T): any {
        return this[serviceName as keyof ServiceFactory];
     }

    /**
     * Gets the WebviewProvider instance for registration with VS Code.
     */
    getWebviewProvider(): WebviewProvider {
        return this.webviewProvider;
    }

    /**
     * Registers disposables with the VS Code context.
     * Called by extension.ts.
     */
    registerDisposables(subscriptions: vscode.Disposable[]): void {
        // Register services that need explicit disposal
        // Order matters for some (e.g., close DB last)
        subscriptions.push(this); // ServiceFactory itself is Disposable

        // Services that might have active listeners or state to save
        subscriptions.push(this.webviewProvider); // Disposes webview listeners
        // subscriptions.push(this.globalContextService); // Save state logic should be called explicitly in deactivate
        // subscriptions.push(this.sessionContextService); // VS Code listeners handled by context.subscriptions
        // subscriptions.push(this.conversationService); // Disposes active conv states (if they had resources)
        // subscriptions.push(this.turnStateService); // Cleans up turn state
        subscriptions.push(this.modelManager); // Aborts active model requests
        // MODIFIED: Register the new service for disposal
        subscriptions.push(this.codeUnderstandingService);


        // Lower level services (Logger, Trace, Validator, Events) are disposed when factory is disposed
        // Repositories/Persistence Services don't typically need dispose methods, they use the DB connection

         console.log('[ServiceFactory] Registered disposables with VS Code subscriptions.');
    }

    /**
     * Disposes all services managed by the factory.
     * Called by extension.ts.deactivate().
     */
    dispose(): void {
        console.log('[ServiceFactory] Disposing all services...');

        // Dispose services in reverse order of dependency where necessary
        // Or at least dispose those with active resources (listeners, connections) first

        // Dispose UI Bridge first as it listens to many events
        this.uiBridge.dispose();

        // Dispose application services
        this.chatInteractor.dispose();
        this.conversationManager.dispose();
        // MODIFIED: Dispose the new service
        this.codeUnderstandingService.dispose();


        // Dispose orchestration service (might abort graph execution)
        this.orchestratorService.dispose();

        // Dispose model/tool infrastructure (abort model requests)
        this.promptService.dispose(); // Disposes nothing specific, ModelManager handles abort
        this.langChainToolAdapter.dispose(); // Disposes nothing specific
        this.modelManager.dispose(); // Aborts model requests

        // Dispose context services (save global state, clean up memory states)
        // GlobalContextService saveState needs to be awaited in deactivate.
        // this.globalContextService.dispose(); // Handled explicitly in deactivate
        this.sessionContextService.dispose(); // Disposes nothing specific, VS Code listeners auto-handled
        this.conversationService.dispose(); // Disposes in-memory states
        this.turnStateService.dispose(); // Cleans up turn state

        // Persistence services don't typically need dispose

        // Dispose core transversal services
        this.traceService.dispose(); // Cleans up trace state
        this.validatorService.dispose(); // Cleans up schemas

        // Dispose database last
        this.databaseManager.close(); // Closes DB connection

        // Dispose EventEmitterService last as others might emit during dispose
        this.eventEmitterService.dispose(); // Removes all listeners

        console.log('[ServiceFactory] All services disposed.');
    }
}