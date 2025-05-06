// gemini.ts
// Implementation of the Gemini model API

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ModelAPI } from "../ModelManager";

export class GeminiAPI implements ModelAPI {
  private abortController: AbortController | null = null;
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    });
    
    console.log("[GeminiAPI] Initialized");
  }

  async generateResponse(prompt: string): Promise<string> {
    this.abortRequest();
    this.abortController = new AbortController();
  
    try {
      console.log("[GeminiAPI] Sending request to Gemini");
      
      const result = await this.model.generateContent(prompt, {
        signal: this.abortController.signal,
      });
  
      if (!result.response) {
        throw new Error("Empty response from Gemini.");
      }
  
      const responseText = result.response.candidates[0].content.parts[0].text;
      console.log("[GeminiAPI] Response received");
      
      return responseText;
    } catch (error) {
      console.error("[GeminiAPI] Error:", error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  abortRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      console.log("[GeminiAPI] Request aborted");
    }
  }
}