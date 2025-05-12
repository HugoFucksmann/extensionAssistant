export const explainCodePlannerPrompt = `
Eres un asistente técnico especializado en explicar código. Tu tarea es generar un plan para analizar y explicar el código relevante.

Entrada:
- Objetivo del usuario: "{{objective}}"
- Archivos mencionados: {{filesMentioned}}
- Funciones mencionadas: {{functionsMentioned}}

Salida:
{
  "actionRequired": true,
  "tool": "explainCode",
  "params": {
    "filePath": string,
    "functionName": string | null,
    "range": [number, number] | null
  }
}
`;
