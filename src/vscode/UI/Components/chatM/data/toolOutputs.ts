// Definición de todas las herramientas disponibles y sus estructuras de datos
export interface ToolDefinition {
  name: string
  displayName: string
  icon: string
  inputKeys: string[]
  outputKeys: string[]
  description: string
}

export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  search: {
    name: "search",
    displayName: "Búsqueda Web",
    icon: "search",
    inputKeys: ["query", "limit"],
    outputKeys: ["results"],
    description: "Busca información en la web usando el motor de búsqueda",
  },
  file_examine: {
    name: "file_examine",
    displayName: "Examinar Archivo",
    icon: "file",
    inputKeys: ["filePath"],
    outputKeys: ["content", "fileSize", "lineCount", "encoding"],
    description: "Lee y examina el contenido de un archivo",
  },
  file_read: {
    name: "file_read",
    displayName: "Leer Archivo",
    icon: "file",
    inputKeys: ["filePath"],
    outputKeys: ["content", "fileSize", "lineCount", "encoding"],
    description: "Lee el contenido de un archivo específico",
  },
  getFileContents: {
    name: "getFileContents",
    displayName: "Obtener Contenidos",
    icon: "file",
    inputKeys: ["filePath"],
    outputKeys: ["content", "fileSize", "lineCount", "encoding"],
    description: "Obtiene el contenido completo de un archivo",
  },
  file_edit: {
    name: "file_edit",
    displayName: "Editar Archivo",
    icon: "edit",
    inputKeys: ["filePath", "content"],
    outputKeys: ["success", "bytesWritten", "error"],
    description: "Modifica el contenido de un archivo existente",
  },
  file_write: {
    name: "file_write",
    displayName: "Escribir Archivo",
    icon: "edit",
    inputKeys: ["filePath", "content"],
    outputKeys: ["success", "bytesWritten", "error"],
    description: "Escribe contenido en un archivo",
  },
  project_search: {
    name: "project_search",
    displayName: "Búsqueda en Proyecto",
    icon: "folder-search",
    inputKeys: ["query", "fileTypes"],
    outputKeys: ["matches"],
    description: "Busca texto o patrones dentro del proyecto",
  },
  console_command: {
    name: "console_command",
    displayName: "Comando de Consola",
    icon: "terminal",
    inputKeys: ["command", "cwd"],
    outputKeys: ["output", "errorOutput", "exitCode", "executionTime"],
    description: "Ejecuta comandos en la consola del sistema",
  },
  terminal: {
    name: "terminal",
    displayName: "Terminal",
    icon: "terminal",
    inputKeys: ["command", "cwd"],
    outputKeys: ["output", "errorOutput", "exitCode", "executionTime"],
    description: "Ejecuta comandos en el terminal",
  },
  getGitStatus: {
    name: "getGitStatus",
    displayName: "Estado de Git",
    icon: "git-branch",
    inputKeys: [],
    outputKeys: ["currentBranch", "files", "changedFilesCount"],
    description: "Obtiene el estado actual del repositorio Git",
  },
  getProjectSummary: {
    name: "getProjectSummary",
    displayName: "Resumen del Proyecto",
    icon: "project",
    inputKeys: [],
    outputKeys: ["projectName", "rootPath", "topLevelStructure", "detectedPrimaryLanguage"],
    description: "Genera un resumen completo del proyecto actual",
  },
}

// Función para validar que una herramienta tenga las keys correctas
export function validateToolData(
  toolName: string,
  toolInput?: Record<string, any>,
  toolOutput?: any,
): {
  isValid: boolean
  missingInputKeys: string[]
  missingOutputKeys: string[]
  extraKeys: string[]
} {
  const definition = TOOL_DEFINITIONS[toolName]

  if (!definition) {
    return {
      isValid: false,
      missingInputKeys: [],
      missingOutputKeys: [],
      extraKeys: [`Tool '${toolName}' not found in definitions`],
    }
  }

  const missingInputKeys: string[] = []
  const missingOutputKeys: string[] = []
  const extraKeys: string[] = []

  // Validar input keys
  if (toolInput) {
    const inputKeys = Object.keys(toolInput)
    definition.inputKeys.forEach((key) => {
      if (!(key in toolInput)) {
        missingInputKeys.push(key)
      }
    })

    inputKeys.forEach((key) => {
      if (!definition.inputKeys.includes(key)) {
        extraKeys.push(`input.${key}`)
      }
    })
  }

  // Validar output keys
  if (toolOutput) {
    const outputKeys = Object.keys(toolOutput)
    definition.outputKeys.forEach((key) => {
      if (!(key in toolOutput)) {
        missingOutputKeys.push(key)
      }
    })

    outputKeys.forEach((key) => {
      if (!definition.outputKeys.includes(key) && key !== "error" && key !== "success") {
        extraKeys.push(`output.${key}`)
      }
    })
  }

  return {
    isValid: missingInputKeys.length === 0 && missingOutputKeys.length === 0 && extraKeys.length === 0,
    missingInputKeys,
    missingOutputKeys,
    extraKeys,
  }
}

// Función para obtener todas las herramientas disponibles
export function getAllToolNames(): string[] {
  return Object.keys(TOOL_DEFINITIONS)
}

// Función para obtener la definición de una herramienta
export function getToolDefinition(toolName: string): ToolDefinition | undefined {
  return TOOL_DEFINITIONS[toolName]
}
