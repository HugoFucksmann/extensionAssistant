// src/core/langgraph/services/ExecutorService.ts
import { IModelManager, IPromptProvider, } from "./interfaces/DependencyInterfaces"; // <-- MODIFICAR: Importar ExecutorContext
import { ExecutorOutput, executorSchema } from "../../../features/ai/prompts/executorPrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ExecutorContext } from "./ContextBuilderService";

export class ExecutorService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider
    ) { }

    // MODIFICAR: La firma del método ahora usa ExecutorContext.
    async generateToolCall(context: ExecutorContext): Promise<ExecutorOutput> {
        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getExecutorPrompt();
        const chain = prompt
            .pipe(model)
            .pipe(new StringOutputParser())
            .pipe(createAutoCorrectStep(executorSchema, model, { throwOnError: true }));

        // MODIFICAR: Usamos las propiedades del objeto de contexto.
        return await chain.invoke({
            task: context.task,
            userQuery: context.userQuery,
            availableTools: context.availableTools,
        });
    }
}