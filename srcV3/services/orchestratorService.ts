import { executeModelInteraction } from "../models/promptSystem";
import { getProjectInfo } from "../modules/getProjectInfo";

export class OrchestratorService {
  constructor() {}

  public async processUserMessage(chatId: string, text: string, files?: string[]): Promise<string> {

    const projectInfo = await getProjectInfo();
   console.log("Project Info: ", projectInfo);
   
    // 1. Analizar input del usuario
  const analysis = await executeModelInteraction('inputAnalyzer', {
    userPrompt: text,
    referencedFiles: files || [],
    projectContext: projectInfo || {}
  });


  

    // Generar respuesta simulada
    return `Respuesta Modelo: ${JSON.stringify(analysis)}` 
  }
}
