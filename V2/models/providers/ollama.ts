// OllamaAPI.ts

import { ModelAPI } from "../baseAPI";
import { processModelResponse } from "../utils/modelUtils";


interface OllamaEmbeddingResponse {
  embedding: number[];
}

export class OllamaAPI implements ModelAPI {
  protected abortController: AbortController | null = null;
  async generateResponse(prompt: string): Promise<string> {
    this.abortRequest();
    this.abortController = new AbortController();
    
    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen2.5-coder:7b", //gemma3:4b
          prompt,
          stream: false, // Cambiar a false para simplificar
          temperature: 0.2,
        }),
        signal: this.abortController.signal,
      });
  
      if (!response.ok) {
        throw new Error(`Error in response: ${response.statusText}`);
      }
      
      // Parsear la respuesta como JSON para extraer el campo 'response'
      const responseData = await response.json();
      
      // Verificar si la respuesta tiene el formato esperado de Ollama
      if (responseData && typeof responseData.response === 'string') {
        // Procesar la respuesta que ya está en el campo 'response'
        return processModelResponse(responseData.response, true);
      } else {
        // Si no tiene el formato esperado, procesar todo el texto
        return processModelResponse(JSON.stringify(responseData), false);
      }
    } catch (error) {
      console.error("[OllamaAPI] Error:", error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await fetch("http://localhost:11434/api/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nomic-embed-text",
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error in response: ${response.statusText}`);
      }

      const data = await response.json() as OllamaEmbeddingResponse;
      return data.embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  }

  abortRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}