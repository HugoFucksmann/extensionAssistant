"use client"

import type { ChatMessage } from "../components/chat/types"
import { validateToolData, getAllToolNames } from "./toolOutputs"

export const createMockToolMessages = (): ChatMessage[] => {
  const baseTimestamp = Date.now()
  const messages: ChatMessage[] = []

  // Validar que todas las herramientas estén incluidas
  const allTools = getAllToolNames()
  console.log("🔍 Herramientas disponibles:", allTools)

  // Búsqueda Web - Éxito
  const searchData = {
    toolName: "search",
    toolInput: { query: "React hooks tutorial", limit: 5 },
    toolOutput: {
      results: [
        {
          title: "React Hooks - Documentación Oficial",
          url: "https://reactjs.org/docs/hooks-intro.html",
          snippet:
            "Los Hooks son una nueva característica en React 16.8 que te permite usar estado y otras características de React sin escribir una clase.",
        },
        {
          title: "Tutorial completo de React Hooks",
          url: "https://example.com/react-hooks-tutorial",
          snippet: "Aprende a usar useState, useEffect y otros hooks de React con ejemplos prácticos.",
        },
        {
          title: "Hooks personalizados en React",
          url: "https://example.com/custom-hooks",
          snippet: "Cómo crear tus propios hooks personalizados para reutilizar lógica entre componentes.",
        },
      ],
    },
  }

  const searchValidation = validateToolData(searchData.toolName, searchData.toolInput, searchData.toolOutput)
  console.log("✅ Validación search:", searchValidation)

  messages.push({
    id: "tool-search-success",
    content: "Búsqueda web completada",
    sender: "system",
    timestamp: baseTimestamp + 1000,
    operationId: "op-search-1",
    metadata: {
      status: "success",
      toolName: searchData.toolName,
      success: true,
      toolInput: searchData.toolInput,
      toolOutput: searchData.toolOutput,
    },
  })

  // Examinar Archivo - Éxito
  const fileExamineData = {
    toolName: "file_examine",
    toolInput: { filePath: "/src/components/App.tsx" },
    toolOutput: {
      content: `import React, { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <h1>Contador: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Incrementar
      </button>
    </div>
  );
}

export default App;`,
      fileSize: 342,
      lineCount: 16,
      encoding: "utf-8",
    },
  }

  const fileExamineValidation = validateToolData(
    fileExamineData.toolName,
    fileExamineData.toolInput,
    fileExamineData.toolOutput,
  )
  console.log("✅ Validación file_examine:", fileExamineValidation)

  messages.push({
    id: "tool-file-examine-success",
    content: "Archivo examinado correctamente",
    sender: "system",
    timestamp: baseTimestamp + 2000,
    operationId: "op-file-1",
    metadata: {
      status: "success",
      toolName: fileExamineData.toolName,
      success: true,
      toolInput: fileExamineData.toolInput,
      toolOutput: fileExamineData.toolOutput,
    },
  })

  // Editar Archivo - Error
  const fileEditData = {
    toolName: "file_edit",
    toolInput: { filePath: "/src/components/ReadOnlyFile.tsx", content: "// Nuevo contenido del archivo" },
    toolOutput: { success: false, error: "Permisos insuficientes: El archivo es de solo lectura" },
  }

  const fileEditValidation = validateToolData(fileEditData.toolName, fileEditData.toolInput, fileEditData.toolOutput)
  console.log("✅ Validación file_edit:", fileEditValidation)

  messages.push({
    id: "tool-file-edit-error",
    content: "Error al editar archivo",
    sender: "system",
    timestamp: baseTimestamp + 3000,
    operationId: "op-file-edit-1",
    metadata: {
      status: "error",
      toolName: fileEditData.toolName,
      success: false,
      toolInput: fileEditData.toolInput,
      toolOutput: fileEditData.toolOutput,
    },
  })

  // Búsqueda en Proyecto - Éxito
  const projectSearchData = {
    toolName: "project_search",
    toolInput: { query: "useState", fileTypes: [".tsx", ".ts"] },
    toolOutput: {
      matches: [
        { file: "/src/components/Counter.tsx", line: 3, content: "const [count, setCount] = useState(0);" },
        {
          file: "/src/hooks/useLocalStorage.ts",
          line: 8,
          content: "const [storedValue, setStoredValue] = useState(() => {",
        },
        { file: "/src/components/Form.tsx", line: 12, content: "const [formData, setFormData] = useState({});" },
      ],
    },
  }

  const projectSearchValidation = validateToolData(
    projectSearchData.toolName,
    projectSearchData.toolInput,
    projectSearchData.toolOutput,
  )
  console.log("✅ Validación project_search:", projectSearchValidation)

  messages.push({
    id: "tool-project-search-success",
    content: "Búsqueda en proyecto completada",
    sender: "system",
    timestamp: baseTimestamp + 4000,
    operationId: "op-project-search-1",
    metadata: {
      status: "success",
      toolName: projectSearchData.toolName,
      success: true,
      toolInput: projectSearchData.toolInput,
      toolOutput: projectSearchData.toolOutput,
    },
  })

  // Comando de Consola - Éxito
  const consoleCommandData = {
    toolName: "console_command",
    toolInput: { command: "npm test", cwd: "/workspace/my-project" },
    toolOutput: {
      output: `> my-project@1.0.0 test
> jest

 PASS  src/components/App.test.tsx
 PASS  src/utils/helpers.test.ts

Test Suites: 2 passed, 2 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        2.341 s
Ran all test suites.`,
      errorOutput: "",
      exitCode: 0,
      executionTime: 2341,
    },
  }

  const consoleCommandValidation = validateToolData(
    consoleCommandData.toolName,
    consoleCommandData.toolInput,
    consoleCommandData.toolOutput,
  )
  console.log("✅ Validación console_command:", consoleCommandValidation)

  messages.push({
    id: "tool-console-success",
    content: "Comando ejecutado exitosamente",
    sender: "system",
    timestamp: baseTimestamp + 5000,
    operationId: "op-console-1",
    metadata: {
      status: "success",
      toolName: consoleCommandData.toolName,
      success: true,
      toolInput: consoleCommandData.toolInput,
      toolOutput: consoleCommandData.toolOutput,
    },
  })

  // Terminal - Error
  const terminalData = {
    toolName: "terminal",
    toolInput: { command: "npm run build:production", cwd: "/workspace/my-project" },
    toolOutput: {
      output: "",
      errorOutput: `npm ERR! Missing script: "build:production"
npm ERR! 
npm ERR! To see a list of scripts, run:
npm ERR!   npm run
npm ERR! 
npm ERR! A complete log of this run can be found in:
npm ERR!     /Users/user/.npm/_logs/2023-12-07T10_30_45_123Z-debug.log`,
      exitCode: 1,
      executionTime: 156,
    },
  }

  const terminalValidation = validateToolData(terminalData.toolName, terminalData.toolInput, terminalData.toolOutput)
  console.log("✅ Validación terminal:", terminalValidation)

  messages.push({
    id: "tool-terminal-error",
    content: "Error en comando de terminal",
    sender: "system",
    timestamp: baseTimestamp + 6000,
    operationId: "op-terminal-1",
    metadata: {
      status: "error",
      toolName: terminalData.toolName,
      success: false,
      toolInput: terminalData.toolInput,
      toolOutput: terminalData.toolOutput,
    },
  })

  // Estado de Git - Éxito
  const gitStatusData = {
    toolName: "getGitStatus",
    toolInput: {},
    toolOutput: {
      currentBranch: "feature/chat-improvements",
      changedFilesCount: 4,
      files: [
        { path: "src/components/Chat.tsx", status: "M", description: "Modificado" },
        { path: "src/styles/chat.css", status: "M", description: "Modificado" },
        { path: "src/types/messages.ts", status: "A", description: "Agregado" },
        { path: "README.md", status: "??", description: "Sin seguimiento" },
      ],
    },
  }

  const gitStatusValidation = validateToolData(
    gitStatusData.toolName,
    gitStatusData.toolInput,
    gitStatusData.toolOutput,
  )
  console.log("✅ Validación getGitStatus:", gitStatusValidation)

  messages.push({
    id: "tool-git-status-success",
    content: "Estado de Git obtenido",
    sender: "system",
    timestamp: baseTimestamp + 7000,
    operationId: "op-git-1",
    metadata: {
      status: "success",
      toolName: gitStatusData.toolName,
      success: true,
      toolInput: gitStatusData.toolInput,
      toolOutput: gitStatusData.toolOutput,
    },
  })

  // Resumen del Proyecto - Éxito
  const projectSummaryData = {
    toolName: "getProjectSummary",
    toolInput: {},
    toolOutput: {
      projectName: "vscode-chat-extension",
      rootPath: "/workspace/vscode-chat-extension",
      detectedPrimaryLanguage: "TypeScript",
      topLevelStructure: [
        { name: "src", type: "directory" },
        { name: "public", type: "directory" },
        { name: "package.json", type: "file" },
        { name: "tsconfig.json", type: "file" },
        { name: "README.md", type: "file" },
        { name: ".gitignore", type: "file" },
        { name: "node_modules", type: "directory" },
      ],
    },
  }

  const projectSummaryValidation = validateToolData(
    projectSummaryData.toolName,
    projectSummaryData.toolInput,
    projectSummaryData.toolOutput,
  )
  console.log("✅ Validación getProjectSummary:", projectSummaryValidation)

  messages.push({
    id: "tool-project-summary-success",
    content: "Resumen del proyecto generado",
    sender: "system",
    timestamp: baseTimestamp + 8000,
    operationId: "op-project-summary-1",
    metadata: {
      status: "success",
      toolName: projectSummaryData.toolName,
      success: true,
      toolInput: projectSummaryData.toolInput,
      toolOutput: projectSummaryData.toolOutput,
    },
  })

  // Agregar herramientas adicionales para completar la validación
  // file_read (alias de file_examine)
  messages.push({
    id: "tool-file-read-success",
    content: "Archivo leído correctamente",
    sender: "system",
    timestamp: baseTimestamp + 9000,
    operationId: "op-file-read-1",
    metadata: {
      status: "success",
      toolName: "file_read",
      success: true,
      toolInput: { filePath: "/src/utils/helpers.ts" },
      toolOutput: {
        content: "export const formatDate = (date: Date) => date.toISOString();",
        fileSize: 58,
        lineCount: 1,
        encoding: "utf-8",
      },
    },
  })

  // getFileContents (alias de file_examine)
  messages.push({
    id: "tool-get-file-contents-success",
    content: "Contenidos obtenidos",
    sender: "system",
    timestamp: baseTimestamp + 10000,
    operationId: "op-get-file-contents-1",
    metadata: {
      status: "success",
      toolName: "getFileContents",
      success: true,
      toolInput: { filePath: "/package.json" },
      toolOutput: {
        content: '{\n  "name": "vscode-chat-extension",\n  "version": "1.0.0"\n}',
        fileSize: 65,
        lineCount: 4,
        encoding: "utf-8",
      },
    },
  })

  // file_write (alias de file_edit)
  messages.push({
    id: "tool-file-write-success",
    content: "Archivo escrito exitosamente",
    sender: "system",
    timestamp: baseTimestamp + 11000,
    operationId: "op-file-write-1",
    metadata: {
      status: "success",
      toolName: "file_write",
      success: true,
      toolInput: { filePath: "/src/temp.txt", content: "Contenido temporal" },
      toolOutput: { success: true, bytesWritten: 18 },
    },
  })

  // Herramienta no soportada - Error
  messages.push({
    id: "tool-unsupported-error",
    content: "Herramienta no reconocida",
    sender: "system",
    timestamp: baseTimestamp + 12000,
    operationId: "op-unsupported-1",
    metadata: {
      status: "error",
      toolName: "unknown_tool",
      success: false,
      toolInput: { someParam: "value" },
      toolOutput: { error: "La herramienta 'unknown_tool' no está implementada en el sistema" },
    },
  })

  console.log(`📊 Total de herramientas mockeadas: ${messages.length}`)
  console.log(`📋 Herramientas cubiertas: ${[...new Set(messages.map((m) => m.metadata?.toolName))].join(", ")}`)

  return messages
}

export const createUserMessage = (content: string): ChatMessage => ({
  id: `user-${Date.now()}`,
  content,
  sender: "user",
  timestamp: Date.now(),
})

export const createAssistantMessage = (content: string): ChatMessage => ({
  id: `assistant-${Date.now()}`,
  content,
  sender: "assistant",
  timestamp: Date.now(),
})
