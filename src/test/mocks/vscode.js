// Mock básico de la API de VS Code para pruebas
const vscode = {
  Uri: {
    file: (path) => ({ 
      fsPath: path,
      scheme: 'file',
      path: path,
      toString: () => `file://${path}`
    }),
    joinPath: (base, ...pathSegments) => {
      const joinedPath = [base.path, ...pathSegments].join('/').replace(/\/+/g, '/');
      return { 
        fsPath: joinedPath,
        scheme: 'file',
        path: joinedPath,
        toString: () => `file://${joinedPath}`
      };
    }
  },
  workspace: {
    workspaceFolders: [
      { 
        uri: { 
          fsPath: '/workspace', 
          scheme: 'file',
          path: '/workspace',
          toString: () => 'file:///workspace'
        },
        name: 'workspace',
        index: 0
      }
    ],
    asRelativePath: (uri, includeWorkspaceFolder) => {
      if (typeof uri === 'string') return uri;
      const path = uri.path || uri.fsPath;
      if (path.startsWith('/workspace/')) {
        return path.substring('/workspace/'.length);
      }
      return path;
    },
    fs: {
      readFile: jest.fn().mockImplementation(async (uri) => {
        // Simular lectura de archivo
        const mockFiles = {
          '/workspace/test.txt': 'Test file content',
          '/workspace/src/index.js': 'console.log("Hello world");',
          '/workspace/src/utils/helper.js': 'function helper() { return true; }',
        };
        
        const path = uri.path || uri.fsPath;
        if (mockFiles[path]) {
          return Buffer.from(mockFiles[path]);
        }
        throw new Error(`File not found: ${path}`);
      }),
      stat: jest.fn().mockImplementation(async (uri) => {
        const mockFiles = {
          '/workspace/test.txt': true,
          '/workspace/src/index.js': true,
          '/workspace/src/utils/helper.js': true,
        };
        
        const path = uri.path || uri.fsPath;
        if (mockFiles[path]) {
          return { type: 1, size: 100 }; // 1 = archivo
        }
        throw new Error(`File not found: ${path}`);
      }),
      writeFile: jest.fn().mockResolvedValue(undefined)
    },
    findFiles: jest.fn().mockImplementation(async (include, exclude, maxResults) => {
      // Simular búsqueda de archivos
      const mockResults = {
        '**/*.js': [
          { path: '/workspace/src/index.js', fsPath: '/workspace/src/index.js', scheme: 'file' },
          { path: '/workspace/src/utils/helper.js', fsPath: '/workspace/src/utils/helper.js', scheme: 'file' }
        ],
        '**/test.txt': [
          { path: '/workspace/test.txt', fsPath: '/workspace/test.txt', scheme: 'file' }
        ],
        '**/*': [
          { path: '/workspace/test.txt', fsPath: '/workspace/test.txt', scheme: 'file' },
          { path: '/workspace/src/index.js', fsPath: '/workspace/src/index.js', scheme: 'file' },
          { path: '/workspace/src/utils/helper.js', fsPath: '/workspace/src/utils/helper.js', scheme: 'file' }
        ]
      };
      
      // Buscar coincidencias basadas en el patrón
      for (const [pattern, results] of Object.entries(mockResults)) {
        if (pattern === include || include.includes(pattern)) {
          return results.map(r => ({
            ...r,
            toString: () => `file://${r.path}`
          }));
        }
      }
      
      return [];
    })
  },
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    createOutputChannel: jest.fn().mockReturnValue({
      appendLine: jest.fn(),
      append: jest.fn(),
      show: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn()
    }),
    activeTextEditor: {
      document: {
        uri: { 
          fsPath: '/workspace/src/index.js',
          path: '/workspace/src/index.js',
          scheme: 'file',
          toString: () => 'file:///workspace/src/index.js'
        },
        fileName: 'index.js',
        isUntitled: false,
        getText: () => 'console.log("Hello world");'
      }
    }
  },
  languages: {
    getDiagnostics: jest.fn().mockReturnValue([])
  },
  commands: {
    executeCommand: jest.fn()
  },
  EventEmitter: class {
    constructor() {
      this.listeners = {};
    }
    
    event(listener) {
      const key = Math.random().toString();
      this.listeners[key] = listener;
      return {
        dispose: () => {
          delete this.listeners[key];
        }
      };
    }
    
    fire(data) {
      Object.values(this.listeners).forEach(listener => listener(data));
    }
  }
};

module.exports = vscode;
