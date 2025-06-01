// src/features/ai/lcel/chainConfigs.ts
import {
    analysisPromptLC,
    analysisOutputSchema,
    AnalysisOutput
  } from "../prompts/optimized/analysisPrompt";
  import {
    reasoningPromptLC,
    reasoningOutputParser,
    ReasoningOutput
  } from "../prompts/optimized/reasoningPrompt";
  import {
    actionPromptLC,
    actionOutputParser,
    ActionOutput
  } from "../prompts/optimized/actionPrompt";
  import {
    responsePromptLC,
    responseOutputParser,
    ResponseOutput
  } from "../prompts/optimized/responsePrompt";
  
  import { extractStructuredResponse, cleanResponseString } from "../util/responseCleaner";
  import { formatForPrompt } from "../prompts/promptUtils";
  import { ChainConfiguration } from './types';
  import { JsonOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
  import { BaseChatModel } from "@langchain/core/language_models/chat_models";
  import { RunnableSequence } from "@langchain/core/runnables";
  import {
    normalizeAnalysisOutput,
    normalizeReasoningOutput,
    normalizeActionOutput,
    normalizeResponseOutput
  } from './outputNormalizers';
  
  // --- Analysis Chain Configuration ---
  
  // El parser para Analysis es un poco más complejo debido a la necesidad de extraer JSON
  // de respuestas que pueden no ser JSON puro.
  class RobustJsonOutputParser extends JsonOutputParser {
    async parse(text: string): Promise<any> {
      const cleanedText = cleanResponseString(text); // Limpieza inicial de markdown y prefijos
      try {
        // Intenta parsear directamente después de la limpieza básica
        return await super.parse(cleanedText);
      } catch (e) {
        // Si falla, intenta la lógica de extractStructuredResponse que es más permisiva
        // extractStructuredResponse ya maneja el parseo interno y la normalización de 'action' a 'nextAction'
        console.warn('[RobustJsonOutputParser] Fallback to extractStructuredResponse for:', cleanedText);
        const structured = extractStructuredResponse(cleanedText);
        if (typeof structured === 'object' && structured !== null) {
          return structured;
        }
        // Si extractStructuredResponse devuelve el string original o algo no parseable, relanzar error
        console.error('[RobustJsonOutputParser] Could not parse after fallback:', structured);
        throw new Error(`Failed to parse JSON output after multiple attempts. Original text: ${text}`);
      }
    }
  }
  const analysisCustomParser = new RobustJsonOutputParser();
  
  // La función normalizeAnalysisOutput ahora está importada desde outputNormalizers.ts
  
  export const analysisChainConfig: ChainConfiguration<
    { userQuery: string; availableTools: string[]; codeContext?: string; memoryContext?: string; }, // TInput
    any, // TModelOutput (del parser)
    AnalysisOutput // TFinalOutput
  > = {
    name: 'optimizedAnalysis',
    description: 'Analyzes the user query to understand intent, required tools, and context.',
    prompt: analysisPromptLC,
    parser: analysisCustomParser,
    inputFormatter: (rawInput) => ({
      userQuery: rawInput.userQuery,
      availableTools: rawInput.availableTools || [],
      codeContext: rawInput.codeContext || 'No code context provided.',
      memoryContext: rawInput.memoryContext || 'No relevant memory.'
    }),
    outputNormalizer: normalizeAnalysisOutput,
  };
  
  // --- Reasoning Chain Configuration ---
  export const reasoningChainConfig: ChainConfiguration<
    { userQuery: string; analysisResult: any; toolsDescription: string; previousToolResults?: any[]; memoryContext?: string },
    any,
    ReasoningOutput
  > = {
    name: 'optimizedReasoning',
    description: 'Reasons about the next step, whether to use a tool or respond.',
    prompt: reasoningPromptLC,
    parser: reasoningOutputParser,
    inputFormatter: (rawInput) => ({
      userQuery: rawInput.userQuery,
      analysisResult: formatForPrompt(rawInput.analysisResult),
      toolsDescription: rawInput.toolsDescription || 'No tools available.',
      previousToolResults: rawInput.previousToolResults || [],
      memoryContext: rawInput.memoryContext || 'No relevant memory.'
    }),
    outputNormalizer: normalizeReasoningOutput
  };
  
  // --- Action Chain Configuration ---
  export const actionChainConfig: ChainConfiguration<
    { userQuery:string; lastToolName:string; lastToolResult:any; previousActions?:Array<{tool:string;result:any}>; memoryContext?:string;},
    any,
    ActionOutput
  > = {
    name: 'optimizedAction',
    description: 'Decides the next step after a tool has been executed.',
    prompt: actionPromptLC,
    parser: actionOutputParser, // Similar a reasoning, asumimos que el parser es robusto.
    inputFormatter: (rawInput) => ({
      userQuery: rawInput.userQuery,
      lastToolName: rawInput.lastToolName,
      lastToolResult: formatForPrompt(rawInput.lastToolResult),
      previousActions: formatForPrompt(rawInput.previousActions || []),
      memoryContext: rawInput.memoryContext || 'No relevant memory.'
    }),
    outputNormalizer: normalizeActionOutput
  };
  
  // --- Response Chain Configuration ---
  export const responseChainConfig: ChainConfiguration<
    { userQuery: string; toolResults: Array<{ tool: string; result: any }>; analysisResult: any; memoryContext?: string; },
    any, // responseOutputParser puede devolver string o {response: string}
    ResponseOutput // Queremos asegurar que siempre sea {response: string}
  > = {
    name: 'optimizedResponse',
    description: 'Generates the final response to the user.',
    prompt: responsePromptLC,
    // El responseOutputParser original podría ser un StringOutputParser o un JsonOutputParser
    // dependiendo de si el modelo siempre devuelve JSON o a veces texto plano.
    // Si el prompt pide JSON con una clave "response", JsonOutputParser es mejor.
    // Si el prompt solo pide la respuesta como texto, StringOutputParser.
    // responseOutputParser en el código original no está definido, así que asumimos uno genérico.
    // Para mayor robustez, podríamos usar un StringOutputParser y luego normalizar.
    parser: new StringOutputParser(), // O responseOutputParser si ya existe y es adecuado
    inputFormatter: (rawInput) => ({
      userQuery: rawInput.userQuery,
      toolResults: formatForPrompt(rawInput.toolResults || []),
      analysisResult: formatForPrompt(rawInput.analysisResult),
      memoryContext: rawInput.memoryContext || 'No relevant memory.'
    }),
    outputNormalizer: normalizeResponseOutput,
  };
  
  // Array de todas las configuraciones para facilitar el registro
  export const allChainConfigs: ChainConfiguration<any, any, any>[] = [
    analysisChainConfig,
    reasoningChainConfig,
    actionChainConfig,
    responseChainConfig,
  ];
