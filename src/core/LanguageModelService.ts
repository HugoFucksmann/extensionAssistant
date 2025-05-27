// src/core/LanguageModelService.ts
import { ModelManager } from '../features/ai/ModelManager';
import { PromptManager, PromptType } from '../features/ai/promptManager';
import { responseParser } from '../features/ai/prompts/responseGenerationPrompt';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { WindsurfState } from '../shared/types';
import { EventType } from '../features/events/eventTypes';
import { 
    BaseEventPayload, 
    LlmRequestStartedPayload, 
    LlmRequestCompletedPayload 
} from '../features/events/eventTypes'; // Assuming these are exported from eventTypes.ts

export class LanguageModelService {
  constructor(
    private modelManager: ModelManager,
    private promptManager: PromptManager,
    private dispatcher: InternalEventDispatcher
  ) {
    this.dispatcher.systemInfo('LanguageModelService initialized.', { source: 'LanguageModelService' }, 'LanguageModelService');
  }

  private parseLlmReasoningResponse(rawResponse: string, chatId?: string): { thought: string; toolName?: string; toolInput?: any; error?: string } {
    try {
      // Attempt to find JSON block if response is not pure JSON
      // Common patterns: ```json ... ``` or just the JSON object
      const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/s);
      let parsableJson = "";

      if (jsonMatch) {
        parsableJson = jsonMatch[1] || jsonMatch[2]; // Prefer the content of ```json ... ```
      } else {
        // If no clear JSON block, assume the whole response might be JSON (less robust)
        // Or, if the LLM is very reliable, this might not be needed.
        // For now, let's try to parse the whole thing if no block is found.
        // This part might need adjustment based on LLM behavior.
        // A simple heuristic: if it starts with { and ends with }, assume it's JSON.
        const trimmedResponse = rawResponse.trim();
        if (trimmedResponse.startsWith('{') && trimmedResponse.endsWith('}')) {
            parsableJson = trimmedResponse;
        } else {
            this.dispatcher.systemWarning(
                'LLM reasoning response does not appear to be well-formed JSON or a JSON block.',
                { chatId, rawResponsePreview: rawResponse.substring(0, 200), source: 'LanguageModelService' }
            );
            return { thought: `LLM Response (not valid JSON or JSON block): ${rawResponse}`, error: "LLM response was not in the expected JSON format." };
        }
      }
      
      if (!parsableJson) {
        this.dispatcher.systemWarning(
            'Could not extract a parsable JSON string from LLM reasoning response.',
            { chatId, rawResponsePreview: rawResponse.substring(0, 200), source: 'LanguageModelService' }
        );
        return { thought: `LLM Response (no JSON content found): ${rawResponse}`, error: "Could not extract JSON from LLM response." };
      }

      const parsed = JSON.parse(parsableJson);

      if (!parsed || typeof parsed.thought !== 'string') {
        this.dispatcher.systemWarning(
            'Parsed LLM reasoning response is missing or has invalid "thought" field.',
            { chatId, parsedContent: parsed, source: 'LanguageModelService' }
        );
        return { thought: `LLM Response (missing or invalid 'thought'): ${rawResponse}`, error: "LLM response missing or has invalid 'thought' field." };
      }

      const thought = parsed.thought;
      let toolName: string | undefined = undefined;
      let toolInput: any = undefined;

      if (parsed.action) {
        if (typeof parsed.action.toolName === 'string' && parsed.action.toolName.trim() !== "") {
          toolName = parsed.action.toolName.trim();
        } else if (parsed.action.toolName !== null && parsed.action.toolName !== undefined && parsed.action.toolName.trim() === "") {
            // Explicitly empty toolName might mean "no tool" but let's log it
             this.dispatcher.systemInfo(
                'LLM reasoning response provided an empty string for toolName in action.',
                { chatId, parsedAction: parsed.action, source: 'LanguageModelService' }
            );
        }


        // toolInput should be an object, but can be null/undefined if no tool or tool takes no params
        if (parsed.action.toolInput !== undefined) {
            // Ensure toolInput is an object if toolName is present.
            // If toolName is not present, toolInput is irrelevant or should be null.
            if (toolName && typeof parsed.action.toolInput !== 'object' && parsed.action.toolInput !== null) {
                 this.dispatcher.systemWarning(
                    'LLM reasoning response provided non-object toolInput for a specified tool.',
                    { chatId, toolName, toolInput: parsed.action.toolInput, source: 'LanguageModelService' }
                );
                // Depending on strictness, you might error here or proceed with caution.
                // For now, let's allow it and let ToolRegistry validation catch it.
                toolInput = parsed.action.toolInput;
            } else {
                 toolInput = parsed.action.toolInput; // Can be null or an object
            }
        } else if (toolName) {
            // If a tool is specified, toolInput should ideally be present (even if {} or null)
            // For robustness, default to {} if toolName is present and toolInput is undefined
            toolInput = {};
             this.dispatcher.systemInfo(
                'LLM reasoning response: toolName present but toolInput undefined. Defaulting toolInput to {}.',
                { chatId, toolName, source: 'LanguageModelService' }
            );
        }
      } else {
         this.dispatcher.systemInfo(
            'LLM reasoning response did not include an "action" object. Assuming no tool.',
            { chatId, parsedContent: parsed, source: 'LanguageModelService' }
        );
      }

      return { thought, toolName, toolInput };

    } catch (e: any) {
      this.dispatcher.systemError(
        'Failed to parse JSON from LLM reasoning response.', e,
        { chatId, rawResponsePreview: rawResponse.substring(0, 200), source: 'LanguageModelService' }
      );
      return { thought: `Error parsing LLM Response: ${rawResponse}`, error: `JSON parsing error: ${e.message}` };
    }
  }

  public async generateReasoning(
    currentState: WindsurfState,
    availableToolsDescription: string,
  ): Promise<{ thought: string; toolName?: string; toolInput?: any; error?: string }> {
    const llmRequestType = 'reasoning';
    const dispatchPayload: LlmRequestStartedPayload = { 
        llmRequestType, 
        chatId: currentState.chatId, 
        source: 'LanguageModelService',
        modelProvider: this.modelManager.getActiveProvider(), // Add model info
        modelName: (this.modelManager.getActiveProvider() as any)?.modelName || // A bit hacky to get modelName
                   (this.modelManager.getActiveProvider() as any)?.model || 
                   'unknown' 
    };
    let startTime = Date.now();

    try {
      const promptTemplate = this.promptManager.getPrompt('reasoning');
      // Summarize history to keep prompt length manageable
      const historySummary = currentState.history
        .slice(-5) // Take last 5 entries, adjust as needed
        .map(h => `Phase: ${h.phase}\nContent: ${typeof h.content === 'string' ? h.content.substring(0, 250) + (h.content.length > 250 ? "..." : "") : JSON.stringify(h.content).substring(0, 250) + "..."}`)
        .join('\n---\n');
      
      const formattedPrompt = await promptTemplate.format({
        userQuery: currentState.userMessage, // Añadir userQuery usando el userMessage del estado
        history: historySummary,
        objective: currentState.objective,
        tools: availableToolsDescription,
        // scratchpad: currentState.scratchpad || '', // If you implement a scratchpad
        // current_error: currentState.error || '', // To let LLM know about previous errors
      });

      dispatchPayload.promptLength = formattedPrompt.length;
      this.dispatcher.dispatch(EventType.LLM_REQUEST_STARTED, dispatchPayload);
      startTime = Date.now(); // Reset start time just before the call

      const rawResponse = await this.modelManager.generateText(formattedPrompt);
      const duration = Date.now() - startTime;

      const parsedResult = this.parseLlmReasoningResponse(rawResponse, currentState.chatId);

      this.dispatcher.dispatch(EventType.LLM_REQUEST_COMPLETED, { 
        ...dispatchPayload, 
        responseLength: rawResponse.length, 
        duration, 
        success: !parsedResult.error,
        error: parsedResult.error,
        rawResponse: (process.env.NODE_ENV === 'development') ? rawResponse : undefined // Only include raw in dev
      } as LlmRequestCompletedPayload);

      return parsedResult;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.dispatcher.dispatch(EventType.LLM_REQUEST_COMPLETED, { 
        ...dispatchPayload, 
        duration, 
        success: false, 
        error: error.message 
      } as LlmRequestCompletedPayload);
      this.dispatcher.systemError('Critical error in generateReasoning LLM call.', error, { chatId: currentState.chatId, source: 'LanguageModelService' });
      return { thought: `Error during reasoning: ${error.message}`, error: error.message };
    }
  }

  public async generateFinalResponse(
    currentState: WindsurfState,
  ): Promise<string> {
    const llmRequestType = 'responseGeneration';
    const dispatchPayload: LlmRequestStartedPayload = { 
        llmRequestType, 
        chatId: currentState.chatId, 
        source: 'LanguageModelService',
        modelProvider: this.modelManager.getActiveProvider(),
        modelName: (this.modelManager.getActiveProvider() as any)?.modelName || 
                   (this.modelManager.getActiveProvider() as any)?.model || 
                   'unknown'
    };
    let startTime = Date.now();

    try {
      const promptTemplate = this.promptManager.getPrompt('responseGeneration');
      const historySummary = currentState.history
        .slice(-7) // More history might be relevant for final response
        .map(h => `Phase: ${h.phase}\nContent: ${typeof h.content === 'string' ? h.content.substring(0, 300) + (h.content.length > 300 ? "..." : "") : JSON.stringify(h.content).substring(0, 300) + "..."}`)
        .join('\n---\n');

      const formattedPrompt = await promptTemplate.format({
        objective: currentState.objective,
        history: historySummary,
        format_instructions: responseParser.getFormatInstructions()
      });

      dispatchPayload.promptLength = formattedPrompt.length;
      this.dispatcher.dispatch(EventType.LLM_REQUEST_STARTED, dispatchPayload);
      startTime = Date.now(); // Reset start time

      const rawResponse = await this.modelManager.generateText(formattedPrompt);
      const duration = Date.now() - startTime;

      this.dispatcher.dispatch(EventType.LLM_REQUEST_COMPLETED, { 
        ...dispatchPayload, 
        responseLength: rawResponse.length, 
        duration, 
        success: true,
        rawResponse: (process.env.NODE_ENV === 'development') ? rawResponse : undefined 
      } as LlmRequestCompletedPayload);
      
      return rawResponse; // Assuming LLM directly returns the user-facing message

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.dispatcher.dispatch(EventType.LLM_REQUEST_COMPLETED, { 
        ...dispatchPayload, 
        duration, 
        success: false, 
        error: error.message 
      } as LlmRequestCompletedPayload);
      this.dispatcher.systemError('Critical error in generateFinalResponse LLM call.', error, { chatId: currentState.chatId, source: 'LanguageModelService' });
      return `Sorry, I encountered an error while generating the final response: ${error.message}`;
    }
  }
}