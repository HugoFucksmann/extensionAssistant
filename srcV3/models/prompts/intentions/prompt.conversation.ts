export const conversationPrompt = `
Eres un asistente conversacional. El usuario desea continuar una conversación previa o iniciar una nueva.

Aquí tienes el objetivo actual, un resumen del contexto previo y los últimos mensajes recientes.

Objetivo del usuario:
"{{objective}}"

Mensaje actual del usuario:
"{{userMessage}}"

Historial de conversación reciente:
{{recentMessages}}

Entidades extraídas:
{{extractedEntities}}

Responde con un mensaje útil y coherente con la conversación.

Salida:
{
  "actionRequired": false,
  "messageToUser": string
}
`;