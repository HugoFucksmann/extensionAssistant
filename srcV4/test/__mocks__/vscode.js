// Mock para el módulo vscode utilizado en las pruebas
const vscode = {
  // Espacio de nombres de workspace
  workspace: {
    workspaceFolders: [],
    getWorkspaceFolder: jest.fn(),
    onDidChangeWorkspaceFolders: jest.fn(),
    createFileSystemWatcher: jest.fn(),
    findFiles: jest.fn(),
    openTextDocument: jest.fn(),
    onDidOpenTextDocument: jest.fn(),
    onDidCloseTextDocument: jest.fn(),
    onDidChangeTextDocument: jest.fn(),
    onWillSaveTextDocument: jest.fn(),
    onDidSaveTextDocument: jest.fn(),
    applyEdit: jest.fn().mockResolvedValue(true),
    getConfiguration: jest.fn().mockReturnValue({
      get: jest.fn(),
      update: jest.fn(),
      has: jest.fn().mockReturnValue(true),
      inspect: jest.fn(),
    }),
  },

  // Espacio de nombres de window
  window: {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showQuickPick: jest.fn(),
    showInputBox: jest.fn(),
    createOutputChannel: jest.fn().mockReturnValue({
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    }),
    withProgress: jest.fn(),
    createStatusBarItem: jest.fn().mockReturnValue({
      text: '',
      tooltip: '',
      command: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    }),
    activeTextEditor: undefined,
    onDidChangeActiveTextEditor: jest.fn(),
    visibleTextEditors: [],
    onDidChangeVisibleTextEditors: jest.fn(),
  },

  // Espacio de nombres de commands
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
    getCommands: jest.fn().mockResolvedValue([]),
  },

  // Espacio de nombres de extensions
  extensions: {
    getExtension: jest.fn(),
    all: [],
    onDidChange: jest.fn(),
  },

  // Espacio de nombres de languages
  languages: {
    registerCompletionItemProvider: jest.fn(),
    registerHoverProvider: jest.fn(),
    registerDefinitionProvider: jest.fn(),
    registerReferenceProvider: jest.fn(),
    registerDocumentSymbolProvider: jest.fn(),
    registerWorkspaceSymbolProvider: jest.fn(),
    registerCodeActionsProvider: jest.fn(),
    registerCodeLensProvider: jest.fn(),
    registerDocumentFormattingEditProvider: jest.fn(),
    registerDocumentRangeFormattingEditProvider: jest.fn(),
    registerOnTypeFormattingEditProvider: jest.fn(),
    registerRenameProvider: jest.fn(),
    registerDocumentHighlightProvider: jest.fn(),
    registerImplementationProvider: jest.fn(),
    registerTypeDefinitionProvider: jest.fn(),
    registerSignatureHelpProvider: jest.fn(),
    setLanguageConfiguration: jest.fn(),
  },

  // Clases básicas
  Uri: {
    file: jest.fn().mockImplementation((path) => ({
      scheme: 'file',
      path,
      fsPath: path,
      with: jest.fn(),
      toString: jest.fn().mockReturnValue(`file://${path}`),
    })),
    parse: jest.fn().mockImplementation((path) => ({
      scheme: 'file',
      path,
      fsPath: path,
      with: jest.fn(),
      toString: jest.fn().mockReturnValue(path),
    })),
  },

  Range: jest.fn().mockImplementation((startLine, startCharacter, endLine, endCharacter) => ({
    start: { line: startLine, character: startCharacter },
    end: { line: endLine, character: endCharacter },
    isEmpty: false,
    isSingleLine: startLine === endLine,
    contains: jest.fn(),
    isEqual: jest.fn(),
    intersection: jest.fn(),
    union: jest.fn(),
    with: jest.fn(),
  })),

  Position: jest.fn().mockImplementation((line, character) => ({
    line,
    character,
    isBefore: jest.fn(),
    isBeforeOrEqual: jest.fn(),
    isAfter: jest.fn(),
    isAfterOrEqual: jest.fn(),
    isEqual: jest.fn(),
    translate: jest.fn(),
    with: jest.fn(),
    compareTo: jest.fn(),
  })),

  Selection: jest.fn().mockImplementation((anchorLine, anchorCharacter, activeLine, activeCharacter) => ({
    anchor: { line: anchorLine, character: anchorCharacter },
    active: { line: activeLine, character: activeCharacter },
    start: { line: Math.min(anchorLine, activeLine), character: 0 },
    end: { line: Math.max(anchorLine, activeLine), character: 0 },
    isEmpty: anchorLine === activeLine && anchorCharacter === activeCharacter,
    isSingleLine: anchorLine === activeLine,
    contains: jest.fn(),
    isEqual: jest.fn(),
    intersection: jest.fn(),
    union: jest.fn(),
    with: jest.fn(),
  })),

  // Enums y constantes
  ViewColumn: {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3,
    Four: 4,
    Five: 5,
    Six: 6,
    Seven: 7,
    Eight: 8,
    Nine: 9,
  },

  // ExtensionContext
  ExtensionContext: jest.fn().mockImplementation(() => ({
    subscriptions: [],
    workspaceState: {
      get: jest.fn(),
      update: jest.fn(),
      keys: jest.fn().mockReturnValue([]),
    },
    globalState: {
      get: jest.fn(),
      update: jest.fn(),
      keys: jest.fn().mockReturnValue([]),
      setKeysForSync: jest.fn(),
    },
    extensionPath: '',
    storagePath: '',
    globalStoragePath: '',
    logPath: '',
    extensionMode: 1, // ExtensionMode.Production
  })),

  // WorkspaceEdit
  WorkspaceEdit: jest.fn().mockImplementation(() => ({
    replace: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    entries: jest.fn(),
    size: 0,
  })),
};

// Configurar getters para propiedades dinámicas
Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => vscode.workspace.workspaceFolders,
});

Object.defineProperty(vscode.window, 'activeTextEditor', {
  get: () => vscode.window.activeTextEditor,
  set: (value) => { vscode.window.activeTextEditor = value; },
});

// Exportar el mock
module.exports = vscode;
