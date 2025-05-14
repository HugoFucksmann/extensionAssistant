Implementation Plan by Stages:
Stage 1: Context Persistence & Initial Plan Execution
Goal: Enable saving and loading the full InteractionContext state. Modify handlers to define an initial plan instead of executing steps directly. The Orchestrator will receive the context, perform analysis, get the initial plan from the handler, execute that specific plan synchronously, and then save the updated context. This lays the groundwork for the loop, even if the loop itself isn't dynamic yet.
Key Changes:
entities.ts: Add contextState field to Chat.
IChatRepository.ts: Add saveContextState and loadContextState methods.
DatabaseManager.ts: Add schema migration logic for the new column.
ChatRepository.ts: Implement persistence methods, update CRUD operations.
interactionContext.ts: Add keys for workflow state (processingStatus, currentPlan, etc.).
PlannerService.ts: Create as a placeholder class (no logic yet).
BaseHandler.ts: Change handle() to initializePlan(), returning ExecutionStep[]. Move multi-step execution helpers (runStepsSequence, runStepsParallel) to Orchestrator.
Concrete Handlers (ExplainCodeHandler, FixCodeHandler, ConversationHandler): Implement initializePlan to return the steps previously executed in their handle method. Remove step execution logic.
Orchestrator.ts: Inject PlannerService. Refactor processUserMessage to: load context (via ChatService), add user message, run analysis, select handler, call handler.initializePlan(), execute the returned plan using internal helpers, generate final message, save context (via ChatService).
ChatService.ts: Manage loading/saving the context state around the Orchestrator call. Pass the InteractionContext instance.
extension.ts: Instantiate PlannerService.
Stage 2: Basic Iterative Execution Loop
Goal: Implement the core while loop in the Orchestrator. Introduce basic logic in PlannerService to process steps sequentially from the currentPlan and mark the process complete when the plan is exhausted. The Planner still won't add new steps dynamically based on results in this stage.
Key Changes:
Orchestrator.ts: Implement the while loop structure using the state keys (processingStatus, currentPlan, currentStepIndex). Call plannerService.planNextStep (which will initially just return the next step from the static plan or null). Call stepExecutor.runStep. Call plannerService.evaluateStepResult (which will initially just update the index/status based on sequential execution).
PlannerService.ts: Implement basic planNextStep (get next step from context.currentPlan based on currentStepIndex, increment index, set status to 'executing' or 'complete') and evaluateStepResult (just ensures status is 'planning' for the next loop iteration).
Stage 3: Dynamic Planning & Evaluation
Goal: Implement intelligent logic in PlannerService to evaluate step results and modify the plan dynamically (e.g., add new steps, change status based on success/failure, decide if user input is needed).
Key Changes:
PlannerService.ts: Flesh out evaluateStepResult to read lastStepResult and update the context/plan/status based on the meaning of the result (e.g., if file content is empty, if validation failed, if proposed changes are empty). Implement planNextStep to add new steps to the plan based on the evaluation flags set by evaluateStepResult.
Stage 4: UI Integration and Refinement
Goal: Update the UI to reflect the multi-step nature, show progress, and render interactive elements like proposed changes.
Key Changes:
WebviewProvider.ts: Modify message handling to potentially show intermediate status messages. Add logic to read the proposedChanges key from the context (exposed via ChatService) and render a diff view or apply button when available.