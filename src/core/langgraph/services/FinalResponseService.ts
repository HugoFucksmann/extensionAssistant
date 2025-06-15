// src/core/langgraph/services/FinalResponseService.ts
import { IModelManager, IPromptProvider } from "./interfaces/DependencyInterfaces"; // <-- MODIFICAR: Importar ResponderContext
import { FinalResponse, finalResponseSchema } from "../../../features/ai/prompts/finalResponsePrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ResponderContext } from "./ContextBuilderService";

export class FinalResponseService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider
    ) { }

    // MODIFICAR: La firma del método ahora usa ResponderContext.
    async generateResponse(context: ResponderContext): Promise<FinalResponse> {
        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getFinalResponsePrompt();
        const chain = prompt
            .pipe(model)
            .pipe(new StringOutputParser())
            .pipe(createAutoCorrectStep(finalResponseSchema, model, { throwOnError: true }));

        // MODIFICAR: Usamos las propiedades del objeto de contexto.
        return await chain.invoke({
            userQuery: context.userQuery,
            chatHistory: context.chatHistory,
        });
    }
}