export class OrchestratorService {
  constructor() {}

  public async processUserMessage(chatId: string, text: string, files?: string[]): Promise<string> {
    // Simular tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 500));





    // Generar respuesta simulada
    return `Respuesta simulada: "${text}"` + 
      (files?.length ? `\nArchivos: ${files.join(', ')}` : '');
  }
}
