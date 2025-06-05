// src/core/langgraph/nodes/validateNode.ts
import { OptimizedGraphState } from '../LangGraphState';
import { NodeDependencies } from './analyzeNode';
import { EventType, AgentPhaseEventPayload } from '@features/events/eventTypes';
import { AIMessage, SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts'; // Para el prompt de corrección

// Prompt para que el LLM sugiera correcciones
const CORRECTION_PROMPT_TEMPLATE = `
An automated process encountered the following errors:
--- ERRORS ---
{errors}
--- CURRENT PLAN / CONTEXT ---
Current understanding of the task: {current_understanding}
Current plan: {current_plan}
Last attempted tool: {last_tool}
Last attempted parameters: {last_params}
---

Based on these errors and the context, please suggest specific corrections.
If correcting tool parameters, provide the corrected parameters.
If correcting the plan, provide a revised plan (list of strings).
If the errors seem unrecoverable or require user intervention, state that.

Respond ONLY with a JSON object with the following schema:
{{
  "suggested_corrections": [
    {{
      "type": "parameter_correction" | "plan_correction" | "clarification_needed" | "unrecoverable",
      "tool_name": "string (if type is parameter_correction, name of the tool to correct)",
      "corrected_params": "object (if type is parameter_correction)",
      "revised_plan": "string[] (if type is plan_correction)",
      "clarification_prompt": "string (if type is clarification_needed, a question for the user)",
      "summary": "string (a brief summary of the correction or issue)"
    }}
  ]
}}
Ensure the response is ONLY the JSON object.
`;

export async function validateNodeFunc(
    state: OptimizedGraphState,
    dependencies: Pick<NodeDependencies, 'dispatcher' | 'performanceMonitor' | 'modelManager'>
): Promise<Partial<OptimizedGraphState>> {
    const { dispatcher, performanceMonitor, modelManager } = dependencies;
    const startTime = Date.now();
    const phaseName = 'validation';

    dispatcher.dispatch(EventType.AGENT_PHASE_STARTED, {
        phase: phaseName,
        chatId: state.metadata.chatId,
        iteration: state.context.iteration,
        timestamp: Date.now(),
        source: 'LangGraphEngine.validateNode'
    } as AgentPhaseEventPayload);

    const errorsToProcess = state.validation?.errors || [];
    let correctionsMadeStrings: string[] = []; // Para loguear
    let updatedStatePartial: Partial<OptimizedGraphState> = { validation: { errors: [], corrections: [] } }; // Iniciar con errores limpios

    if (errorsToProcess.length > 0) {
        dispatcher.systemInfo(
            `Validation node processing errors: ${errorsToProcess.join('; ')}`,
            { chatId: state.metadata.chatId, errors: errorsToProcess },
            'LangGraphEngine.validateNode'
        );

        try {
            const model = modelManager.getActiveModel();
            const correctionPrompt = ChatPromptTemplate.fromTemplate(CORRECTION_PROMPT_TEMPLATE);

            const chain = correctionPrompt.pipe(model);
            const llmResponse = await chain.invoke({
                errors: errorsToProcess.join('\n- '),
                current_understanding: state.context.working,
                current_plan: state.execution.plan.join(' -> '),
                last_tool: state.execution.current_tool || "N/A",
                last_params: JSON.stringify(state.execution.current_params || {})
            });

            let suggestedCorrectionsResponse = llmResponse.content as string;
            // Limpiar la respuesta del LLM para que sea solo JSON
            const jsonMatch = suggestedCorrectionsResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                suggestedCorrectionsResponse = jsonMatch[0];
            }

            const parsedCorrections = JSON.parse(suggestedCorrectionsResponse);
            const corrections = parsedCorrections.suggested_corrections || [];

            let newPlan = state.execution.plan;
            let newParams = state.execution.current_params;
            let requiresClarification = false;
            let isUnrecoverable = false;

            for (const correction of corrections) {
                correctionsMadeStrings.push(correction.summary || JSON.stringify(correction));
                switch (correction.type) {
                    case "parameter_correction":
                        if (correction.tool_name === state.execution.current_tool && correction.corrected_params) {
                            newParams = correction.corrected_params;
                            updatedStatePartial.execution = { ...state.execution, current_params: newParams };
                            dispatcher.systemInfo(`Applied parameter correction for tool ${correction.tool_name}`, { chatId: state.metadata.chatId, newParams }, 'LangGraphEngine.validateNode');
                        }
                        break;
                    case "plan_correction":
                        if (correction.revised_plan && correction.revised_plan.length > 0) {
                            newPlan = correction.revised_plan;
                            updatedStatePartial.execution = { ...state.execution, plan: newPlan };
                            dispatcher.systemInfo(`Applied plan correction`, { chatId: state.metadata.chatId, newPlan }, 'LangGraphEngine.validateNode');
                        }
                        break;
                    case "clarification_needed":
                        requiresClarification = true;
                        // Este caso es más complejo, podría necesitar un nuevo tipo de nodo o una forma de pedir input al usuario.
                        // Por ahora, lo trataremos como si no se pudiera corregir automáticamente.
                        updatedStatePartial.messages = [...(state.messages || []), new AIMessage(`I need clarification: ${correction.clarification_prompt}`)];
                        updatedStatePartial.metadata = { ...state.metadata, isCompleted: true, finalOutput: `Needs clarification: ${correction.clarification_prompt}` };
                        isUnrecoverable = true; // Forzar fin si necesita clarificación
                        break;
                    case "unrecoverable":
                        isUnrecoverable = true;
                        updatedStatePartial.messages = [...(state.messages || []), new AIMessage(`Encountered an unrecoverable error: ${correction.summary}`)];
                        updatedStatePartial.metadata = { ...state.metadata, isCompleted: true, finalOutput: `Unrecoverable error: ${correction.summary}` };
                        break;
                }
            }

            if (!isUnrecoverable && !requiresClarification && correctionsMadeStrings.length > 0) {
                // Si se hicieron correcciones y no es irrecuperable, limpiamos los errores para reintentar.
                updatedStatePartial.validation = { errors: [], corrections: correctionsMadeStrings };
            } else {
                // Si no hubo correcciones útiles o es irrecuperable, mantenemos los errores originales o añadimos uno nuevo.
                const finalErrors = isUnrecoverable || requiresClarification ? [...errorsToProcess, `Validation determined the issue as ${requiresClarification ? 'needing clarification' : 'unrecoverable'}`] : errorsToProcess;
                updatedStatePartial.validation = { errors: finalErrors, corrections: correctionsMadeStrings };
                if (!updatedStatePartial.metadata?.isCompleted) { // Si no se marcó como completado por clarificación/irrecuperable
                    updatedStatePartial.messages = [...(state.messages || []), new AIMessage(`I tried to validate the issues but couldn't fully resolve them. Errors: ${finalErrors.join('; ')}`)];
                }
            }

        } catch (parseError: any) {
            dispatcher.systemError(
                `Error parsing LLM correction response in validateNode: ${parseError.message}`,
                parseError, { chatId: state.metadata.chatId, rawResponse: (parseError as any).rawResponse || 'N/A' }, 'LangGraphEngine.validateNode'
            );
            // Mantener errores originales si el parseo de correcciones falla
            updatedStatePartial.validation = { errors: errorsToProcess, corrections: ["Failed to parse correction suggestions."] };
            updatedStatePartial.messages = [...(state.messages || []), new AIMessage("I had trouble processing the validation suggestions.")];
        }

    } else {
        // No errors to process, so validation passes.
        updatedStatePartial.validation = { errors: [], corrections: [] };
    }

    dispatcher.dispatch(EventType.AGENT_PHASE_COMPLETED, {
        phase: phaseName,
        chatId: state.metadata.chatId,
        iteration: state.context.iteration,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        source: 'LangGraphEngine.validateNode',
        data: {
            originalErrors: errorsToProcess,
            appliedCorrectionsSummary: correctionsMadeStrings,
            finalErrorCount: updatedStatePartial.validation?.errors?.length
        }
    } as AgentPhaseEventPayload);
    performanceMonitor.trackNodeExecution('validateNode', Date.now() - startTime, updatedStatePartial.validation?.errors?.join('; '));

    return updatedStatePartial;
}