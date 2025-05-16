import { ModelAPI } from "../config/ModelManager";

export class OllamaAPI implements ModelAPI {
  private abortController: AbortController | null = null;
  
  constructor() {
    console.log("[OllamaAPI] Initialized");
  }
  
  async generateResponse(prompt: string): Promise<string> {
    this.abortRequest();
    this.abortController = new AbortController();
    
    try {
      console.log("[OllamaAPI] Sending request to Ollama");
      
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemma3:4b", //gemma3:4b
          prompt,
          stream: false,
          temperature: 0.3,
        }),
        signal: this.abortController.signal,
      });
  
      if (!response.ok) {
        throw new Error(`Error in response: ${response.statusText}`);
      }
      
      // Parse response as JSON to extract 'response' field
      const responseData = await response.json();
      
      console.log("[OllamaAPI] Response received");
      
      // Check if response has expected Ollama format
      if (responseData && typeof responseData.response === 'string') {
        return responseData.response;
      } else {
        // If not in expected format, return stringified data
        return JSON.stringify(responseData);
      }
    } catch (error) {
      console.error("[OllamaAPI] Error:", error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  abortRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      console.log("[OllamaAPI] Request aborted");
    }
  }
}