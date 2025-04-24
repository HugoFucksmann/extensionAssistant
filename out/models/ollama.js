"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaAPI = void 0;
class OllamaAPI {
    constructor() {
        this.abortController = null;
    }
    async generateResponse(prompt) {
        this.abortRequest();
        this.abortController = new AbortController();
        let buffer = "";
        try {
            const response = await fetch("http://localhost:11434/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "qwen2.5-coder:7b",
                    prompt,
                    stream: true,
                    temperature: 0.2,
                }),
                signal: this.abortController.signal,
            });
            if (!response.ok || !response.body) {
                throw new Error(`Error in response: ${response.statusText}`);
            }
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split("\n").filter((line) => line.trim());
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        buffer += data.response;
                    }
                    catch (error) {
                        console.error("Error parsing JSON:", error);
                    }
                }
            }
            return buffer;
        }
        catch (error) {
            console.error("Error in OllamaAPI:", error);
            throw error;
        }
        finally {
            this.abortController = null;
        }
    }
    async generateEmbedding(text) {
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
            const data = await response.json();
            return data.embedding;
        }
        catch (error) {
            console.error("Error generating embedding:", error);
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
exports.OllamaAPI = OllamaAPI;
//# sourceMappingURL=ollama.js.map