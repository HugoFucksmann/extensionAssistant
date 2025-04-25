/**
 * Prompts utilizados por los diferentes agentes
 */

export const PROMPTS = {
  // Prompt para analizar la consulta del usuario
  PROMPT_ANALYSIS: `
  Eres un asistente de análisis de consultas de programación.
  
  CONSULTA DEL USUARIO:
  {userQuery}
  
  TAREA:
  Analiza la consulta y extrae:
  1. Objetivo principal.
  2. Palabras clave importantes (nombres específicos de archivos, funciones, variables, conceptos).
  3. Tipo de problema (error, mejora, pregunta conceptual, etc.).
  4. Un plan de acción simple.

  Responde en formato JSON con la siguiente estructura:
  {
    "objective": "string",
    "keywords": ["string"],
    "problemType": "string",
    "actionPlan": { // Plan sugerido: buscar_archivos, examinar_codigo, generar_respuesta
      "steps": [
        { "id": number, "description": "string", "actionType": "string" } 
      ]
    }
  }
`,

  // Prompt para seleccionar archivos relevantes
  FILE_SELECTION: `
  Eres un asistente de selección de archivos para código.
  
  ANÁLISIS PREVIO (Objetivo y Keywords):
  {analysis} 
  
  ARCHIVOS DISPONIBLES EN EL PROYECTO:
  {availableFiles} 
  
  TAREA:
  Selecciona los archivos más relevantes del listado basándote en el ANÁLISIS PREVIO.
  Para cada archivo, indica ruta, relevancia y por qué es relevante.
  Si ningún archivo parece relevante, devuelve una lista vacía.

  Responde en formato JSON:
  {
    "relevantFiles": [
      {
        "path": "string",
        "relevance": "string (alta, media, baja)", 
        "reason": "string"
      }
    ]
  }
`,

  // Prompt para examinar un archivo individual
  SINGLE_FILE_EXAMINATION: `
  Eres un asistente de análisis de código.
  
  OBJETIVO DEL USUARIO (del análisis previo):
  {analysis.objective} // Pasamos solo el objetivo aquí para enfocar
  
  ARCHIVO A EXAMINAR: {filePath}
  CONTENIDO:
  {fileContent}
  
  TAREA:
  1. Determina si el archivo es relevante para el OBJETIVO.
  2. Si es relevante:
      - Extrae fragmentos de código *directamente* relacionados.
      - Identifica posibles problemas en el código.
      - Sugiere archivos adicionales *solo si* son dependencias cruciales no presentes aquí.
  
  Responde en formato JSON válido. Asegúrate de escapar barras invertidas correctamente (ej: "C:\\\\path").
  {
    "isRelevant": boolean,
    "relevanceScore": number, // 0-100
    "reason": "string", // Explicación de relevancia/irrelevancia
    "codeExtracts": [ // Solo si isRelevant = true
      { "code": "string", "startLine": number, "endLine": number, "explanation": "string" }
    ],
    "possibleIssues": [ // Solo si isRelevant = true
      { "description": "string", "confidence": number, "location": "string (ej: 'Línea 42')" }
    ],
    "additionalFilesToExamine": [ // Solo si es necesario
      { "suggestedPath": "string", "reason": "string", "priority": number }
    ]
  }
`,
  
  // Prompt para consolidar análisis de múltiples archivos
  CODE_EXAMINATION_CONSOLIDATION: `
  Eres un asistente de síntesis de análisis de código.
  
  OBJETIVO DEL USUARIO:
  {analysis.objective} // De nuevo, solo el objetivo para enfocar
  
  RESULTADOS DE ANÁLISIS DE ARCHIVOS INDIVIDUALES:
  {fileAnalysisResults} // Lista de JSONs del paso anterior
  
  TAREA:
  1. Consolida los "codeExtracts" y "possibleIssues" de los análisis individuales relevantes.
  2. Identifica la causa raíz más probable del problema basándote en los resultados consolidados.
  3. Determina si aún se necesita examinar más archivos (dependencias no cubiertas).
  
  Responde en formato JSON válido. Escapa barras invertidas correctamente.
  {
    "consolidatedCodeExtracts": [
      { "filePath": "string", "code": "string", "startLine": number, "endLine": number, "relevance": "string", "explanation": "string" }
    ],
    "possibleIssues": [
      { "description": "string", "confidence": number, "location": "string", "explanation": "string" }
    ],
    "needsAdditionalFiles": boolean,
    "additionalFilesToExamine": [ // Solo si needsAdditionalFiles = true
      { "suggestedPath": "string", "reason": "string", "priority": number }
    ],
    "rootCauseAnalysis": "string" // Resumen conciso de los problemas principales
  }
`,

  // Prompt para generar respuesta final
  RESPONSE_GENERATION: `
    Eres un asistente de programación amigable y útil.
    
    CONTEXTO:
    - Consulta original: {userQuery}
    - Objetivo: {analysis.objective}
    - Archivos examinados relevantes: {relevantFilePaths} // Pasa una lista de rutas en lugar de la estructura JSON completa
    - Fragmentos clave: {consolidatedCodeExtracts} // Pasa los extractos consolidados
    - Posibles problemas identificados: {consolidatedPossibleIssues} // Pasa los problemas consolidados
    - Análisis causa raíz: {rootCauseAnalysis} // Pasa el análisis de causa raíz

    TAREA:
    Genera una respuesta clara y concisa para el usuario:
    1. Responde directamente a su consulta original.
    2. Explica el propósito del código relevante (si aplica).
    3. Señala los problemas clave identificados (si los hay) y por qué ocurren.
    4. Proporciona soluciones específicas o sugerencias, incluyendo código si ayuda.
    5. Si hay incertidumbre, menciónala.
    
    Formato libre (markdown recomendado). Sé directo y útil.
  `
};
