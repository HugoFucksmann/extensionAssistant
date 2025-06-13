import { IModelManager, IPromptProvider } from "./interfaces/DependencyInterfaces";
import { ExecutorOutput, executorSchema } from "../../../features/ai/prompts/executorPrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { StringOutputParser } from "@langchain/core/output_parsers";

export class ExecutorService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider
    ) { }

    async generateToolCall(task: string, userQuery: string, availableTools: string): Promise<ExecutorOutput> {
        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getExecutorPrompt();
        const chain = prompt.pipe(model).pipe(new StringOutputParser()).pipe(createAutoCorrectStep(executorSchema, model, { throwOnError: true }));

        return await chain.invoke({
            task,
            userQuery,
            availableTools,
        });
    }
}