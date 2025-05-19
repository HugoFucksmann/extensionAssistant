/**
 * Prompt para la generación de respuestas finales al usuario
 * Se utiliza cuando el ciclo ReAct decide que es momento de responder
 */

import { PromptTemplate } from 'langchain/prompts';

const template = `
Eres un asistente de programación experto en VS Code que está generando una respuesta final para el usuario.

CONTEXTO:
- Mensaje original del usuario: {userMessage}
- Objetivo identificado: {objective}
- Acciones realizadas: 
{actionsHistory}
- Resultado final: {finalResult}

TAREA:
Genera una respuesta clara, concisa y útil para el usuario que:
1. Aborde directamente su solicitud original
2. Explique brevemente las acciones que tomaste (si es relevante)
3. Presente los resultados o conclusiones
4. Sugiera próximos pasos si es apropiado

La respuesta debe ser profesional pero conversacional, mostrando tu experiencia en programación.
No incluyas marcadores JSON ni formateo técnico en la respuesta final.

RESPUESTA:
`;

export const responseGenerationPrompt = new PromptTemplate({
  template,
  inputVariables: [
    'userMessage', 
    'objective', 
    'actionsHistory', 
    'finalResult'
  ]
});
