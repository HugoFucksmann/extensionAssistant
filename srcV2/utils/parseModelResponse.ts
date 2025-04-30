import { PromptType } from "../core/promptSystem/types";


export function parseModelResponse<T = any>(type: PromptType, response: string): T {
  try {
    return JSON.parse(response) as T;
  } catch (error) {
    throw new Error(`Error parsing model response for prompt "${type}": ${error}`);
  }
}