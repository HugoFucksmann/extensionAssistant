"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiAPI = void 0;
// GeminiAPI.ts
const generative_ai_1 = require("@google/generative-ai");
class GeminiAPI {
    constructor(apiKey) {
        this.abortController = null;
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
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
    async generateResponse(prompt) {
        this.abortRequest();
        this.abortController = new AbortController();
        try {
            const result = await this.model.generateContent(prompt, {
                signal: this.abortController.signal,
            });
            if (!result.response) {
                throw new Error("Empty response from Gemini.");
            }
            return result.response.candidates[0].content.parts[0].text;
        }
        catch (error) {
            console.error("Error in Gemini API:", error);
            throw error;
        }
        finally {
            this.abortController = null;
        }
    }
    async generateEmbedding(text) {
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
            const data = (await response.json());
            return data;
        }
        catch (error) {
            console.error("Error generating Hugging Face embedding:", error);
            throw error;
        }
    }
    abortRequest() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
}
exports.GeminiAPI = GeminiAPI;
//# sourceMappingURL=gemini.js.map