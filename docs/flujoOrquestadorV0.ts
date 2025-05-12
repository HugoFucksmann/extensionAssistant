import * as vscode from 'vscode';
import { executeModelInteraction } from "../models/promptSystem";
import { getProjectInfo } from "../modules/getProjectInfo";
import { ToolRunner } from "../tools/toolRunner";

// Define the supported intents
type Intent = 'conversation' | 'explainCode' | 'fixCode';

// Interface for the analysis result
interface InputAnalysis {
  intent: Intent;
  objective: string;
  extractedEntities: {
    filesMentioned: string[];
    functionsMentioned: string[];
    errorsMentioned: string[];
    customKeywords: string[];
  };
  confidence: number;
}

// Interface for execution plan steps
interface ExecutionStep {
  type: 'tool' | 'prompt';
  name: string;
  params?: Record<string, any>;
  dependsOn?: string[];
  storeAs?: string;
  condition?: (context: Record<string, any>) => boolean;
}

/**
 * Service responsible for orchestrating the workflow between user input,
 * model interactions, and tool executions.
 */
export class OrchestratorService {
  private executionContext: Record<string, any> = {};
  
  constructor() {}

  /**
   * Process the user message and coordinate the appropriate response flow
   */
  public async processUserMessage(chatId: string, text: string, files?: string[]): Promise<string> {
    try {
      // Reset execution context for new conversation turn
      this.executionContext = { 
        chatId, 
        userMessage: text,
        referencedFiles: files || []
      };

      // 1. Get project context information
      const projectInfo = await getProjectInfo();
      this.executionContext.projectInfo = projectInfo;
      
      // 2. Analyze user input
      const analysis = await this.analyzeUserInput(text, files, projectInfo);
      this.executionContext.analysis = analysis;
      
      // 3. Create execution plan based on detected intent
      const plan = await this.createExecutionPlan(analysis);
      
      // 4. Execute the plan with validation steps
      const result = await this.executeWorkflow(plan);
      
      // 5. Generate final response
      return await this.generateResponse(result);
    } catch (error) {
      console.error("[OrchestratorService] Error processing message:", error);
      return `Sorry, I encountered an error while processing your request: ${error.message}`;
    }
  }

  /**
   * Analyze the user input to determine intent and extract entities
   */
  private async analyzeUserInput(text: string, files?: string[], projectInfo?: any): Promise<InputAnalysis> {
    const analysis = await executeModelInteraction<InputAnalysis>('inputAnalyzer', {
      userPrompt: text,
      referencedFiles: files || [],
      projectContext: projectInfo || {}
    });
    
    console.log("[OrchestratorService] Input analysis:", analysis);
    return analysis;
  }

  /**
   * Create an execution plan based on the detected intent
   */
  private async createExecutionPlan(analysis: InputAnalysis): Promise<ExecutionStep[]> {
    const plan: ExecutionStep[] = [];
    
    // Common steps for any intent
    if (analysis.extractedEntities.filesMentioned.length > 0) {
      plan.push({
        type: 'tool',
        name: 'filesystem.getFileContents',
        params: { 
          filePath: analysis.extractedEntities.filesMentioned[0] 
        },
        storeAs: 'primaryFileContent'
      });
    }
    
    // Intent-specific steps
    switch (analysis.intent) {
      case 'conversation':
        plan.push({
          type: 'prompt',
          name: 'conversationEngine',
          params: {
            userQuery: this.executionContext.userMessage,
            projectContext: this.executionContext.projectInfo,
            fileContext: 'primaryFileContent' in this.executionContext ? this.executionContext.primaryFileContent : null
          },
          storeAs: 'conversationResponse'
        });
        break;
        
      case 'explainCode':
        // Ensure we have the file content
        if (!plan.some(p => p.storeAs === 'primaryFileContent')) {
          // If no specific file mentioned, get current active file
          plan.push({
            type: 'tool',
            name: 'filesystem.getActiveEditorContent',
            storeAs: 'primaryFileContent'
          });
        }
        
        plan.push({
          type: 'prompt',
          name: 'codeExplainer',
          params: {
            code: '{{primaryFileContent}}',
            functionsFocus: analysis.extractedEntities.functionsMentioned,
            level: 'detailed'
          },
          storeAs: 'explanation'
        });
        break;
        
      case 'fixCode':
        // Similar to explainCode, ensure we have the file
        if (!plan.some(p => p.storeAs === 'primaryFileContent')) {
          plan.push({
            type: 'tool',
            name: 'filesystem.getActiveEditorContent',
            storeAs: 'primaryFileContent'
          });
        }
        
        plan.push({
          type: 'prompt',
          name: 'codeFixer',
          params: {
            code: '{{primaryFileContent}}',
            errors: analysis.extractedEntities.errorsMentioned,
            objective: analysis.objective
          },
          storeAs: 'fixedCode'
        });
        
        // Validation step for fixed code
        plan.push({
          type: 'prompt',
          name: 'codeValidator',
          params: {
            originalCode: '{{primaryFileContent}}',
            fixedCode: '{{fixedCode}}',
            errors: analysis.extractedEntities.errorsMentioned
          },
          storeAs: 'validationResult'
        });
        break;
    }
    
    // Final evaluation step
    plan.push({
      type: 'prompt',
      name: 'resultEvaluator',
      params: {
        context: '{{analysis}}',
        result: analysis.intent === 'conversation' ? '{{conversationResponse}}' : 
                analysis.intent === 'explainCode' ? '{{explanation}}' : 
                '{{fixedCode}}',
        validation: analysis.intent === 'fixCode' ? '{{validationResult}}' : null
      },
      storeAs: 'finalResult'
    });
    
    return plan;
  }

  /**
   * Execute a workflow plan with validation checks
   */
  private async executeWorkflow(plan: ExecutionStep[]): Promise<Record<string, any>> {
    const context = { ...this.executionContext };
    
    for (const step of plan) {
      try {
        // Resolve parameter placeholders
        const params = await this.resolveParameters(step.params || {}, context);
        
        // Check if step should be executed based on condition
        if (step.condition && !step.condition(context)) {
          console.log(`[OrchestratorService] Skipping step ${step.name} due to condition`);
          continue;
        }
        
        let result;
        if (step.type === 'tool') {
          console.log(`[OrchestratorService] Executing tool: ${step.name}`);
          result = await ToolRunner.runTool(step.name, params);
        } else {
          console.log(`[OrchestratorService] Executing prompt: ${step.name}`);
          result = await executeModelInteraction(step.name as any, params);
        }
        
        // Store result in context if storeAs is specified
        if (step.storeAs) {
          context[step.storeAs] = result;
        }
        
        // Validate intermediate results if needed
        await this.validateStepResult(step, result, context);
        
      } catch (error) {
        console.error(`[OrchestratorService] Error executing step ${step.name}:`, error);
        
        // Handle error with fallback strategy instead of breaking execution
        if (step.type === 'prompt') {
          // Try with a simpler version of the prompt
          context[step.storeAs || 'fallbackResult'] = await this.executeFallbackStrategy(step, context);
        } else {
          // For tool errors, continue with partial results if possible
          console.log(`[OrchestratorService] Continuing with partial results`);
        }
      }
    }
    
    return context;
  }

  /**
   * Resolve parameter placeholders with values from the context
   */
  private async resolveParameters(params: Record<string, any>, context: Record<string, any>): Promise<Record<string, any>> {
    const resolvedParams: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const contextKey = value.substring(2, value.length - 2);
        resolvedParams[key] = context[contextKey] || null;
      } else {
        resolvedParams[key] = value;
      }
    }
    
    return resolvedParams;
  }

  /**
   * Validate a step result and potentially modify the execution plan
   */
  private async validateStepResult(
    step: ExecutionStep, 
    result: any, 
    context: Record<string, any>
  ): Promise<void> {
    // Example validation logic
    if (step.storeAs === 'validationResult' && result && !result.isValid) {
      console.log(`[OrchestratorService] Validation failed, trying alternative approach`);
      
      // If code fix validation failed, try alternative approach
      const alternativeResult = await executeModelInteraction('alternativeCodeFixer', {
        code: context.primaryFileContent,
        previousAttempt: context.fixedCode,
        errors: context.analysis.extractedEntities.errorsMentioned
      });
      
      context.fixedCode = alternativeResult;
    }
  }

  /**
   * Execute a fallback strategy when a step fails
   */
  private async executeFallbackStrategy(
    failedStep: ExecutionStep, 
    context: Record<string, any>
  ): Promise<any> {
    console.log(`[OrchestratorService] Executing fallback for ${failedStep.name}`);
    
    // Generic fallback that can handle any failed prompt step
    const fallbackPrompt = 'planningEngine'; // Use a generic planning prompt as fallback
    const fallbackParams = {
      userMessage: context.userMessage,
      intent: context.analysis?.intent || 'conversation',
      context: JSON.stringify(context)
    };
    
    return executeModelInteraction(fallbackPrompt as any, fallbackParams);
  }

  /**
   * Generate the final response to be sent back to the user
   */
  private async generateResponse(executionResult: Record<string, any>): Promise<string> {
    // Use the appropriate result based on the original intent
    const intent = executionResult.analysis?.intent || 'conversation';
    
    switch (intent) {
      case 'conversation':
        return executionResult.conversationResponse || executionResult.finalResult || 
               "I processed your request but couldn't generate a specific response.";
      
      case 'explainCode':
        return executionResult.explanation || executionResult.finalResult ||
               "I analyzed your code but couldn't generate an explanation.";
      
      case 'fixCode':
        // Check if validation passed
        const validationPassed = 
          executionResult.validationResult?.isValid !== false;
        
        const prefix = validationPassed ? 
          "Here's the fixed code:" : 
          "I attempted to fix your code, but there might still be issues:";
        
        return `${prefix}\n\n${executionResult.fixedCode || executionResult.finalResult || 
               "I couldn't generate a fix for your code."}`;
      
      default:
        return executionResult.finalResult || 
               "I processed your request but couldn't determine how to respond.";
    }
  }
}