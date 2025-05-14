https://aistudio.google.com/prompts/1ybNiyaPJ1mM1UVgU_8QKD3CA4NM5oCOl

estoy desarrollando una extensión para vs code. Es un chat entre el usuario y un modelo AI, al estilo de windsurf o copilot. Funciona como un asistente en programación.
Quiero mejorar el flujo desde que el usuario envía el mensaje hasta que lo recibe.
mi idea es mejorar los tres tipos de intenciones: conversación ( para un flujo simple ), explainCode ( para un flujo sin intervención directa en los archivos del proyecto ), y fixCode ( para un flujo completo con intervención en el proyecto ).
CONSIDERACIONES:
creo que podriamos usar persistencia y el storage para generar un mejor flujo. considerar poder usar la bbdd
mejor uso del context para registrar datos importantes a lo largo del flujo.
mejorar prompts entendiendo las limitaciones de los modelos actuales, como por ejemplo:
a. limitaciones en contextos grandes.
b. respuestas estructuradas demasiado complejas
c. pedirle que genere varios objetivos en simultaneo ( mejor en consultas separadas o creando sub objetivos ).
d. otras consideraciones.
utilizar mejor al modelo para generar planes de accion utilizando nuevas tools y promps
FLUJO ESPERADO:
presta atencion a como se desencadena cada mensajea que llega al chat del usuario, continuacion voy a redactar uno de los posibles flujos que se podrian dar frente a la siguiente consulta del usuario:
-usuario: Explain what this problem is and help me fix it: Object literal may only specify known properties, and 'explainCode' does not exist in type 'Partial<Record<PromptType, PromptDefinition<any>>>'. @promptSystem.ts#L11
model: This error occurs because the PromptType enum (likely defined in ../orchestrator) doesn't include the explainCode type yet. Let's fix this by:
First checking the PromptType definition in the orchestrator file
Then adding the explainCode type to the enum
Let me view the orchestrator file to see the PromptType definition.
-system: feedback "Analyzed index.ts (1-30)
-model: Since the PromptType isn't in the orchestrator index file, let's check the types file that's being exported (./execution/types.ts), as that's likely where it's defined.
-system: feedback analyzed types.ts (1-42)
I don't see the PromptType enum in the types file yet. Let me check the imports in promptSystem.ts more carefully - the PromptType might be defined in a different file than I expected.
Looking back at promptSystem.ts, the PromptType is imported from '../orchestrator'. Since we didn't find it in the main orchestrator files, let's check if there's a dedicated file for prompt types.
-system: feedback searched for files in e:\PROYECTOS\srcV3\orchestrator with depth 2 with pattern prompt
-model: Let's check the PromptExecutor.ts file since it might contain the PromptType definition:
-system: feedback analized promptExecutor.ts
-model: Ah, I see the issue now! The PromptType is actually defined in ./execution/types.ts but we need to add explainCode to it. Looking at PromptExecutor.ts, we can see it's already being used ('explainCodePrompt' is in the array), but we need to make sure it's in the PromptType type.
Let me check the types file again to confirm the PromptType definition
....
--- fin ejemplo caso de uso ---
ese fue parte de un ejemplo del fujo esperado, este continua hasta tener el contexto completo para proceder a proponer la solución.
OBJETIVO:
la idea central es que luego de definir la intención del usuario y el objetivo, a partir de un preprompt según el caso, se genere el desencadenamiento de acciones con la posibilidad de utilizar preprompts y tools.
se me ocurren dos ideas para esto, una es un plan de acción que se revalide paso a paso. otra es desglosar el objetivo principal en sub objetivos e ir desarrollando el plan a medida que se ejecuta, se planifica el siguiente paso, luego se valida, y una vez validado o corregido se procede. acepto sugerencias si conoces una implementación mejor o mas profesional.
analiza toda la informacion y proponeme una mejor implemtacion para mi flujo y logica.