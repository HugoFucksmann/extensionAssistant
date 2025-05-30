
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
