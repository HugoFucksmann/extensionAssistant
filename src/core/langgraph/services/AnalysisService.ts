// src/core/langgraph/services/AnalysisService.ts
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { analysisOutputSchema } from "../../../features/ai/prompts/optimized/analysisPrompt";
import type { AnalysisOutput } from "../../../features/ai/prompts/optimized/analysisPrompt";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { IAnalysisService, IModelManager, IPromptProvider, StructuredMemoryContext } from "./interfaces/DependencyInterfaces";

export class AnalysisService implements IAnalysisService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider
    ) { }

    async analyzeQuery(query: string, context: StructuredMemoryContext, availableTools: string[]): Promise<AnalysisOutput> {
        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getAnalysisPrompt();

        const parseStep = createAutoCorrectStep(analysisOutputSchema, model, {
            maxAttempts: 2,
            verbose: process.env.NODE_ENV === 'development',
        });

        const chain = prompt.pipe(model).pipe(new StringOutputParser()).pipe(parseStep);

        const analysisResult = await chain.invoke({
            userQuery: query,
            availableTools: availableTools.join(', '),
            codeContext: "", // Placeholder
            memoryContext: `${context.workingMemorySnapshot}\n${context.retrievedKnowledgeChunks.join('\n')}`.trim()
        });

        return analysisResult;
    }
}