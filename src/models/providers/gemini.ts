// GeminiAPI.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ModelAPI } from "../baseAPI";
import { processModelResponse } from "../utils/modelUtils";


interface HuggingFaceEmbeddingResponse extends Array<number> {}

export class GeminiAPI implements ModelAPI {
  protected abortController: AbortController | null = null;
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
  }

  async generateResponse(prompt: string): Promise<string> {
    this.abortRequest();
    this.abortController = new AbortController();
  
    try {
      const result = await this.model.generateContent(prompt, {
        signal: this.abortController.signal,
      });
  
      if (!result.response) {
        throw new Error("Empty response from Gemini.");
      }
  
      const responseText = result.response.candidates[0].content.parts[0].text;
      return processModelResponse(responseText);
    } catch (error) {
      console.error("Error in Gemini API:", error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await fetch("https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer YOUR_HUGGING_FACE_API_KEY",
        },
        body: JSON.stringify({
          inputs: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error in response: ${response.statusText}`);
      }

      const data = (await response.json()) as HuggingFaceEmbeddingResponse;
      return data;
    } catch (error) {
      console.error("Error generating Hugging Face embedding:", error);
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