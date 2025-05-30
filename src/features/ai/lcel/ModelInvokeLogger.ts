// Wrapper centralizado para invocación de modelos con logging de respuesta cruda
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

/**
 * Invoca una cadena/modelo y registra la respuesta cruda para auditoría y debugging.
 * @param chain Cadena (prompt.pipe(model)[.pipe(parser)])
 * @param inputArgs Argumentos de entrada para la invocación
 * @param logContext Contexto adicional para el log (opcional)
 * @returns Respuesta cruda del modelo
 */
export async function invokeModelWithLogging<T = any>(
  chain: { invoke: (args: any) => Promise<T> },
  inputArgs: Record<string, any>,
  logContext?: Record<string, any>
): Promise<T> {
  try {
    const response = await chain.invoke(inputArgs);
    // Logging estructurado
    console.log('[ModelInvokeLogger] Invocación de modelo:', {
      inputArgs,
      logContext,
      rawResponse: response
    });
    return response;
  } catch (error) {
    console.error('[ModelInvokeLogger] Error en invocación de modelo:', {
      inputArgs,
      logContext,
      error
    });
    throw error;
  }
}
