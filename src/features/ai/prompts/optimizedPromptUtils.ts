/**
 * Utilidades para prompts optimizados
 * Diseñado para reducir tokens y proporcionar estructura clara para el modelo
 */

import { z } from 'zod';

/**
 * Escapa todas las llaves { y } para su uso seguro en plantillas de LangChain.
 * - Reemplaza { por {{ y } por }} excepto si ya están escapadas.
 * - Soporta casos donde hay bloques de código o ejemplos JSON multilinea.
 * - No duplica escapes existentes.
 *
 * Ejemplo:
 *   'Responde con: { "clave": "valor" }' => 'Responde con: {{ "clave": "valor" }}'
 */
export function escapePromptTemplateBraces(str: string): string {
  // Escapa sólo las llaves que no están ya escapadas (no reemplaza {{ ni }})
  // Primero, escapamos las llaves de apertura que no están seguidas de otra {
  // Luego, las de cierre que no están precedidas de otra }
  // Usamos lookahead/lookbehind para no duplicar escapes
  return str
    .replace(/(?<!\{)\{(?!\{)/g, '{{')
    .replace(/(?<!\})\}(?!\})/g, '}}');
}

// --- Pruebas rápidas de edge cases (comentadas, para referencia de desarrollo) ---
// console.log(escapePromptTemplateBraces('{a: 1, b: {c: 2}}')); // {{a: 1, b: {{c: 2}}}}
// console.log(escapePromptTemplateBraces('Ya escapado: {{ "foo": "bar" }}')); // Ya escapado: {{ "foo": "bar" }}
// console.log(escapePromptTemplateBraces('Texto sin llaves')); // Texto sin llaves
// console.log(escapePromptTemplateBraces('Bloque: \n```json\n{ "a": 1 }\n```')); // Bloque: \n```json\n{{ "a": 1 }}\n```
/**
 * Estructura base para todos los prompts optimizados
 * Proporciona un formato consistente para todas las interacciones con el modelo
 */
export function createStructuredPrompt(
  systemInstruction: string,
  context: string,
  task: string,
  format: string,
  examples?: string
): string {
  let prompt = `${systemInstruction}\n\n`;
  
  if (context) {
    prompt += `### CONTEXTO\n${context}\n\n`;
  }
  
  prompt += `### TAREA\n${task}\n\n`;
  
  prompt += `### FORMATO DE RESPUESTA\n${format}\n\n`;
  
  if (examples) {
    prompt += `### EJEMPLOS\n${examples}\n\n`;
  }
  
  prompt += `### RESPUESTA\n`;
  
  return prompt;
}

/**
 * Extrae una respuesta estructurada de la salida del modelo
 * Maneja diferentes formatos de respuesta (JSON, texto plano, etc.)
 */
export function extractStructuredResponse<T>(
  modelOutput: string, 
  schema: z.ZodSchema<T>,
  defaultValue?: T
): T {
  try {
    // Intentar extraer JSON si existe
    const jsonMatch = modelOutput.match(/```json\n([\s\S]*?)\n```/) || 
                      modelOutput.match(/```\n([\s\S]*?)\n```/) ||
                      modelOutput.match(/{[\s\S]*?}/);
    
    let parsedData: any = null;
    
    if (jsonMatch) {
      try {
        // Limpiar el JSON extraído
        const jsonStr = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
        parsedData = JSON.parse(jsonStr);
      } catch (jsonError) {
        console.warn('Error al parsear JSON extraído, intentando con regex más agresivo:', jsonError);
        // Intentar con una extracción más agresiva
        const aggressiveMatch = modelOutput.match(/{[\s\S]*}/);
        if (aggressiveMatch) {
          try {
            parsedData = JSON.parse(aggressiveMatch[0]);
          } catch (e) {
            console.warn('Error en extracción agresiva de JSON:', e);
          }
        }
      }
    }
    
    // Si no se pudo extraer JSON, intentar buscar un objeto en el texto
    if (!parsedData) {
      console.warn('No se pudo extraer JSON, intentando reconstruir objeto desde el texto');
      parsedData = reconstructObjectFromText(modelOutput);
    }
    
    // Validar con el esquema
    if (parsedData) {
      try {
        return schema.parse(parsedData);
      } catch (schemaError) {
        console.warn('Error de validación de esquema, intentando reparar objeto:', schemaError);
        // Intentar reparar el objeto para que cumpla con el esquema
        const repairedData = repairObjectToMatchSchema(parsedData, schema);
        return schema.parse(repairedData);
      }
    }
    
    // Si llegamos aquí, no pudimos extraer datos válidos
    if (defaultValue) {
      return defaultValue;
    }
    
    throw new Error('No se pudo extraer una respuesta estructurada válida');
  } catch (error) {
    console.error('Error extrayendo respuesta estructurada:', error);
    
    if (defaultValue) {
      return defaultValue;
    }
    
    throw new Error(`Error al extraer respuesta estructurada: ${error}`);
  }
}

/**
 * Intenta reconstruir un objeto desde texto plano
 * Útil cuando el modelo no devuelve JSON válido
 */
function reconstructObjectFromText(text: string): any {
  const result: Record<string, any> = {};
  
  // Buscar pares clave-valor en el texto
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Buscar patrones como "clave: valor" o ""clave": valor"
    const match = line.match(/["']?([\w]+)["']?\s*[:=]\s*["']?([^,"'\n]+)["']?/);
    if (match && match.length >= 3) {
      const [, key, value] = match;
      if (key && value) {
        result[key.trim()] = value.trim();
      }
    }
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Intenta reparar un objeto para que cumpla con el esquema
 * Añade valores por defecto para campos requeridos que faltan
 */
function repairObjectToMatchSchema<T>(obj: any, schema: z.ZodSchema<T>): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  // Intentar obtener la definición del esquema
  let schemaShape: Record<string, any> = {};
  
  try {
    // Acceder a la estructura interna de Zod de manera segura
    const anySchema = schema as any;
    if (anySchema._def && typeof anySchema._def === 'object') {
      // Para ZodObject, la forma está en _def.shape
      if (anySchema._def.shape) {
        schemaShape = anySchema._def.shape;
      }
      // Para otros tipos de esquemas, intentar extraer información relevante
      else if (anySchema._def.typeName) {
        // No podemos obtener la forma, pero al menos sabemos el tipo
        console.info(`Esquema de tipo: ${anySchema._def.typeName}`);
      }
    }
  } catch (e) {
    console.warn('No se pudo acceder a la definición del esquema:', e);
  }
  
  // Valores por defecto comunes para tipos básicos
  const defaultValues: Record<string, any> = {
    string: '',
    number: 0,
    boolean: false,
    array: [],
    object: {}
  };
  
  // Copiar el objeto original
  const result = { ...obj };
  
  // Recorrer el esquema y añadir valores por defecto para campos que faltan
  for (const [key, fieldSchema] of Object.entries(schemaShape)) {
    if (result[key] === undefined || result[key] === null) {
      // Determinar el tipo del campo
      let fieldType = 'string';
      try {
        // Acceder a la estructura interna de manera segura
        const anyFieldSchema = fieldSchema as any;
        if (anyFieldSchema._def && anyFieldSchema._def.typeName) {
          const typeName = anyFieldSchema._def.typeName;
          fieldType = typeName.toLowerCase();
        }
      } catch (e) {
        // Si no podemos determinar el tipo, asumimos string
      }
      
      // Asignar un valor por defecto según el tipo
      result[key] = defaultValues[fieldType] || '';
    }
  }
  
  return result;
}

/**
 * Trunca un texto para que no exceda un número máximo de tokens
 * Útil para evitar exceder los límites del modelo
 */
export function truncateText(text: string, maxTokens: number = 2000): string {
  // Aproximación: 1 token ≈ 4 caracteres en promedio
  const approxChars = maxTokens * 4;
  
  if (text.length <= approxChars) {
    return text;
  }
  
  return text.substring(0, approxChars) + `\n...[Texto truncado para ahorrar tokens. Longitud original: ${text.length} caracteres]`;
}

/**
 * Formatea un objeto para incluirlo en un prompt
 * Elimina información innecesaria y formatea de manera legible
 */
export function formatObjectForPrompt(obj: any, maxDepth: number = 2): string {
  if (!obj) return 'null';
  
  if (typeof obj !== 'object') {
    return String(obj);
  }
  
  // Función recursiva para formatear objetos con límite de profundidad
  function formatWithDepth(o: any, depth: number): any {
    if (depth > maxDepth) {
      return '[Objeto anidado]';
    }
    
    if (Array.isArray(o)) {
      return o.map(item => formatWithDepth(item, depth + 1));
    }
    
    if (o && typeof o === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(o)) {
        // Excluir propiedades internas o muy largas
        if (key.startsWith('_') || key === 'rawContent' || key === 'fullContent') {
          continue;
        }
        result[key] = formatWithDepth(value, depth + 1);
      }
      return result;
    }
    
    return o;
  }
  
  try {
    const formatted = formatWithDepth(obj, 0);
    return JSON.stringify(formatted, null, 2);
  } catch (error) {
    return `[Error al formatear objeto: ${error}]`;
  }
}

/**
 * Crea un esquema Zod para validar respuestas estructuradas
 */
export function createResponseSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape);
}

/**
 * Formatea los resultados de herramientas para incluirlos en un prompt
 * Proporciona un formato consistente y conciso
 */
export function formatToolResults(toolResults: Array<{name: string, result: any}>): string {
  return toolResults.map(({name, result}) => {
    const formattedResult = formatObjectForPrompt(result);
    return `## Herramienta: ${name}\n\`\`\`\n${formattedResult}\n\`\`\``;
  }).join('\n\n');
}

/**
 * Formatea el historial de conversación para incluirlo en un prompt
 * Reduce tokens eliminando información innecesaria
 */
/**
 * Formatea el historial de conversación para prompts y UI, distinguiendo fases,
 * e incluyendo detalles de herramientas cuando existan.
 * Permite alternar entre formato compacto y extendido.
 *
 * @param history - Historial de conversación (HistoryEntry[] o compatible)
 * @param options - Opciones de formateo:
 *    - maxEntries: número máximo de entradas a mostrar
 *    - extended: si true, incluye detalles de herramientas y metadatos
 *    - phases: fases a incluir (por defecto principales)
 *    - showErrors: si true, incluye entradas con error
 */
export function formatConversationHistory(
  history: Array<any>,
  options?: {
    maxEntries?: number;
    extended?: boolean;
    phases?: string[];
    showErrors?: boolean;
  }
): string {
  const {
    maxEntries = 6,
    extended = false,
    phases = [
      'user_input',
      'reasoning',
      'action_planning',
      'action',
      'reflection',
      'correction',
      'responseGeneration',
      'system_message',
    ],
    showErrors = true,
  } = options || {};

  // Filtrar por fases relevantes
  let filtered = history.filter(entry => phases.includes(entry.phase));

  // Si no se deben mostrar errores, filtrarlos
  if (!showErrors) {
    filtered = filtered.filter(entry => !entry.metadata?.error_message && entry.metadata?.status !== 'error');
  }

  // Tomar solo las entradas más recientes
  const recentHistory = filtered.slice(-maxEntries);

  // Utilidades locales para formateo
  function formatToolExecution(exec: any): string {
    let out = `Herramienta: ${exec.name}`;
    if (exec.status) out += `\n  Estado: ${exec.status}`;
    if (exec.parameters) out += `\n  Parámetros: ${formatObjectForPrompt(exec.parameters, 1)}`;
    if ('result' in exec) out += `\n  Resultado: ${formatObjectForPrompt(exec.result, 1)}`;
    if (exec.error) out += `\n  Error: ${exec.error}`;
    if (exec.duration) out += `\n  Duración: ${exec.duration} ms`;
    return out;
  }

  function formatEntry(entry: any): string {
    // Rol/fase legible
    const phaseMap: Record<string, string> = {
      user_input: 'Usuario',
      reasoning: 'Razonamiento',
      action_planning: 'Planificación',
      action: 'Acción',
      reflection: 'Reflexión',
      correction: 'Corrección',
      responseGeneration: 'Respuesta',
      system_message: 'Sistema',
    };
    const label = phaseMap[entry.phase] || entry.phase;
    let base = `${label}: ${entry.content}`;

    // Si extendido y hay herramientas ejecutadas, incluir detalles
    if (extended && entry.metadata?.tool_executions?.length) {
      const toolDetails = entry.metadata.tool_executions
        .map(formatToolExecution)
        .join('\n\n');
      base += `\n${toolDetails}`;
    }
    // Si extendido y hay error, mostrarlo
    if (extended && entry.metadata?.error_message) {
      base += `\n[Error]: ${entry.metadata.error_message}`;
    }
    // Si extendido y hay métricas relevantes
    if (extended && entry.metadata?.llm_metrics) {
      base += `\n[Métricas LLM]: ${JSON.stringify(entry.metadata.llm_metrics)}`;
    }
    return base;
  }

  return recentHistory.map(formatEntry).join('\n\n');
}


