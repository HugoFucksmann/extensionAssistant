// src/features/ai/lcel/GenericLCELChainExecutor.ts
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChainRegistry } from './ChainRegistry';
import { ModelManager } from '../ModelManager';
import { invokeModelWithLogging } from './ModelInvokeLogger';
import { ChainConfiguration } from './types';
import { RunnableSequence, RunnableLike, RunnableLambda, Runnable } from "@langchain/core/runnables"; // Añadir RunnableLambda y Runnable

export class GenericLCELChainExecutor {
  constructor(
    private chainRegistry: ChainRegistry,
    private modelManager: ModelManager
  ) {
    if (!chainRegistry) {
      throw new Error("[GenericLCELChainExecutor] ChainRegistry instance is required.");
    }
    if (!modelManager) {
      throw new Error("[GenericLCELChainExecutor] ModelManager instance is required.");
    }
  }

  public async execute<TInput = any, TFinalOutput = any>(
    chainName: string,
    rawInput: TInput,
    options?: {
      model?: BaseChatModel;
      logContext?: Record<string, any>;
    }
  ): Promise<TFinalOutput> {
    const config = this.chainRegistry.getChainConfiguration(chainName) as ChainConfiguration<TInput, any, TFinalOutput> | undefined;
    if (!config) {
      throw new Error(`[GenericLCELChainExecutor] Chain "${chainName}" not found in registry.`);
    }

    const modelToUse = options?.model || this.modelManager.getActiveModel();
    if (!modelToUse) {
      throw new Error(`[GenericLCELChainExecutor] No model available for chain "${chainName}". Ensure ModelManager is properly configured and has an active model.`);
    }

    const effectiveLogContext = {
      caller: `GenericLCELChainExecutor[${chainName}]`,
      chainName: chainName,
      ...(options?.logContext || {}),
    };

    try {
      const formattedInput = config.inputFormatter
        ? config.inputFormatter(rawInput)
        : rawInput as Record<string, any>;

      let lcelChain: Runnable<any, any>; // Cambiado de RunnableLike a Runnable<any,any> para asegurar el método invoke

      if (config.customChainBuilder) {
        const customBuilt = config.customChainBuilder(modelToUse, config.prompt, config.parser);
        // Asegurarse de que customBuilt es un Runnable con método invoke
        if (typeof customBuilt === 'function') {
          // Si customChainBuilder devuelve una función, la envolvemos en RunnableLambda
          lcelChain = RunnableLambda.from(customBuilt as (input: any) => any);
        } else if (typeof customBuilt.invoke === 'function') {
          // Si ya es un objeto con invoke (como un RunnableSequence, RunnableMap, etc.)
          lcelChain = customBuilt as Runnable<any, any>;
        } else {
          // Si es un Record<string, RunnableLike>, LangChain lo convierte en un RunnableParallel/RunnableMap
          // Esto debería ser manejado por LangChain si se usa .pipe() después, pero aquí invocamos directamente.
          // Para ser seguros, si es un objeto sin 'invoke', podríamos necesitar envolverlo o lanzar un error.
          // Sin embargo, la mayoría de los casos de uso de `Record<string, RunnableLike>` se resuelven en un Runnable con `invoke`.
          // Por ahora, asumimos que si no es una función, es un Runnable válido.
          // Una comprobación más estricta sería `if (customBuilt instanceof Runnable)`
          lcelChain = customBuilt as Runnable<any, any>;
        }
      } else {
        // Secuencia estándar: prompt -> modelo -> parser
        lcelChain = RunnableSequence.from([config.prompt, modelToUse, config.parser]);
      }

      const modelOutput = await invokeModelWithLogging(
        lcelChain, // Ahora lcelChain es de tipo Runnable<any, any>
        formattedInput,
        effectiveLogContext
      );

      if (config.outputNormalizer) {
        const normalizedOutput = config.outputNormalizer(modelOutput, rawInput);
        if (normalizedOutput === null) {
          if (config.defaultOutput !== undefined) {
            console.warn(`[GenericLCELChainExecutor.${config.name}] Output normalization/validation failed. Using default output.`);
            return config.defaultOutput;
          }
          throw new Error(`[GenericLCELChainExecutor.${config.name}] Output normalization/validation failed and no default output provided.`);
        }
        return normalizedOutput;
      }
      
      return modelOutput as TFinalOutput;

    } catch (error: any) {
      // Log detallado del error
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        input: rawInput,
        logContext: effectiveLogContext,
        // Agregar información adicional del error si está disponible
        ...(error.response?.data && { responseData: error.response.data }),
        ...(error.response?.status && { statusCode: error.response.status }),
        ...(error.response?.headers && { responseHeaders: error.response.headers })
      };

      console.error(`[GenericLCELChainExecutor.${config.name}] Error during chain execution:`, errorDetails);
      
      if (config.defaultOutput !== undefined) {
        console.warn(`[GenericLCELChainExecutor.${config.name}] Chain execution failed. Using default output.`);
        return config.defaultOutput;
      }
      
      // Mejorar el mensaje de error con más contexto
      const enhancedError = new Error(
        `[${config.name}] Error en la ejecución del chain: ${error.message}\n` +
        `Input: ${JSON.stringify(rawInput, null, 2)}\n` +
        `Stack: ${error.stack}`
      );
      enhancedError.name = error.name || 'ChainExecutionError';
      enhancedError.stack = error.stack;
      
      throw enhancedError;
    }
  }
}