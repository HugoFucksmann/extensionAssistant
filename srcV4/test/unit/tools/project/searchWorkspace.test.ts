import { searchWorkspaceTool } from '../../../../features/tools/project/searchWorkspace';
import { setupVSCodeMock } from '../../testUtils';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Mock de vscode
jest.mock('vscode');

// Importar tipos de Node.js
import { Dirent, Stats, PathLike } from 'fs';

// Mock de fs para simular el sistema de archivos
const mockFs = {
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
  },
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readdirSync: jest.fn(),
};

jest.mock('fs', () => mockFs);

// Clase para simular Dirent de Node.js con tipo genérico
class MockDirent<T extends string | Buffer> extends Dirent<T> {
  constructor(
    public readonly name: T,
    private readonly _isDir: boolean
  ) {
    // @ts-ignore - Llamar al constructor de la clase base
    super();
  }

  isDirectory(): boolean {
    return this._isDir;
  }

  isFile(): boolean {
    return !this._isDir;
  }

  // Implementaciones requeridas
  isBlockDevice(): boolean { return false; }
  isCharacterDevice(): boolean { return false; }
  isSymbolicLink(): boolean { return false; }
  isFIFO(): boolean { return false; }
  isSocket(): boolean { return false; }
}

// Función auxiliar para crear un objeto de estadísticas de archivo simulado
function createMockStats(isDir: boolean): Stats {
  return {
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    dev: 0,
    ino: 0,
    mode: 0,
    nlink: 0,
    uid: 0,
    gid: 0,
    rdev: 0,
    size: 1024,
    blksize: 0,
    blocks: 0,
    atimeMs: 0,
    mtimeMs: 0,
    ctimeMs: 0,
    birthtimeMs: 0,
    atime: new Date(),
    mtime: new Date(),
    ctime: new Date(),
    birthtime: new Date(),
  } as Stats;
}

// Mock de path para pruebas consistentes
jest.mock('path', () => ({
  join: (...args: string[]) => args.join('/'),
  basename: (p: string) => p.split('/').pop() || '',
  dirname: (p: string) => p.split('/').slice(0, -1).join('/') || '.',
  extname: (p: string) => {
    const parts = p.split('/').pop()?.split('.');
    return parts && parts.length > 1 ? `.${parts.pop()}` : '';
  },
  relative: (from: string, to: string) => to.replace(`${from}/`, ''),
  sep: '/',
}));

describe('searchWorkspaceTool', () => {
  const vscodeMock = setupVSCodeMock();
  const mockFsPromises = fs.promises as jest.Mocked<typeof fs.promises>;
  const mockFs = fs as jest.Mocked<typeof fs>;
  
  // Configuración común para las pruebas
  const workspacePath = '/ruta/workspace';
  const mockFiles = [
    'archivo1.txt',
    'archivo2.js',
    'carpeta1/archivo3.ts',
    'carpeta1/archivo4.js',
    'carpeta2/archivo5.json',
    'carpeta2/subcarpeta/archivo6.ts',
  ];
  
  // Función para configurar el mock de existsSync
  const setupExistsSyncMock = (exists: boolean = true) => {
    mockFs.existsSync.mockImplementation((path: PathLike) => {
      // Si se está simulando que no existe, devolver false para todo
      if (!exists) return false;
      
      const pathStr = path.toString();
      if (pathStr === workspacePath) return true;
      
      // Verificar si es un directorio simulado
      const relativePath = pathStr.replace(`${workspacePath}/`, '');
      const directoryPaths = [
        'carpeta1', 
        'carpeta2', 
        'carpeta2/subcarpeta',
        'carpeta2/subcarpeta2'
      ];
      
      // Verificar si es un archivo simulado
      const filePaths = [
        'archivo1.txt', 'archivo2.js', 'archivo3.ts', 
        'archivo4.js', 'archivo5.json', 'archivo6.ts'
      ];
      
      return directoryPaths.includes(relativePath) || 
             filePaths.some(file => relativePath.endsWith(file));
    });
  };

  beforeEach(() => {
    // Limpiar mocks antes de cada prueba
    jest.clearAllMocks();
    
    // Configurar el workspace de prueba
    vscodeMock.clearWorkspaceFolders();
    vscodeMock.addWorkspaceFolder(workspacePath);
    
    // Configurar el mock de existsSync para simular que el directorio existe
    setupExistsSyncMock(true);
    
    // Mock para readdir con tipos correctos
    // @ts-ignore - Necesitamos hacer un cast para que TypeScript acepte nuestra implementación
    mockFsPromises.readdir = jest.fn().mockImplementation(async (
      dirPath: PathLike, 
      options: { withFileTypes?: boolean; encoding?: BufferEncoding | null } = {}
    ) => {
      // Convertir PathLike a string para el procesamiento
      const dirPathStr = dirPath.toString();
      const relativePath = dirPathStr.replace(`${workspacePath}/`, '');
      
      // Función auxiliar para crear entradas Dirent
      const createEntries = (names: {name: string, isDir: boolean}[]) => {
        return names.map(({name, isDir}) => new MockDirent(Buffer.from(name), isDir));
      };
      
      // Mapeo de rutas a sus respectivos contenidos
      const directoryContents: Record<string, ReturnType<typeof createEntries>> = {
        [workspacePath]: createEntries([
          {name: 'archivo1.txt', isDir: false},
          {name: 'archivo2.js', isDir: false},
          {name: 'carpeta1', isDir: true},
          {name: 'carpeta2', isDir: true},
        ]),
        [path.join(workspacePath, 'carpeta1')]: createEntries([
          {name: 'archivo3.ts', isDir: false},
          {name: 'archivo4.js', isDir: false},
        ]),
        [path.join(workspacePath, 'carpeta2')]: createEntries([
          {name: 'archivo5.json', isDir: false},
          {name: 'subcarpeta', isDir: true},
        ]),
        [path.join(workspacePath, 'carpeta2', 'subcarpeta')]: createEntries([
          {name: 'archivo6.ts', isDir: false},
        ]),
      };
      
      const entries = directoryContents[dirPathStr] || [];
      
      if (options?.withFileTypes) {
        return entries as unknown as Dirent<Buffer>[];
      }
      
      // Si no es withFileTypes, devolver los nombres como Buffer[]
      return entries.map(e => e.name) as unknown as Buffer[];
    });
    
    // Mock para stat con tipos correctos
    // @ts-ignore - Necesitamos hacer un cast para que TypeScript acepte nuestra implementación
    mockFsPromises.stat = jest.fn().mockImplementation(async (filePath: PathLike) => {
      // Convertir PathLike a string para el procesamiento
      const filePathStr = filePath.toString();
      const relativePath = filePathStr.replace(`${workspacePath}/`, '');
      
      // Mapeo de rutas a si son directorios o no
      const directoryPaths = [
        'carpeta1', 
        'carpeta2', 
        'carpeta2/subcarpeta',
        'carpeta2/subcarpeta2'
      ];
      
      const filePaths = [
        'archivo1.txt', 'archivo2.js', 'archivo3.ts', 
        'archivo4.js', 'archivo5.json', 'archivo6.ts'
      ];
      
      const isDir = directoryPaths.some(dir => relativePath === dir || relativePath.startsWith(`${dir}/`));
      const isFile = filePaths.some(file => relativePath.endsWith(file));
      
      if (!isDir && !isFile) {
        const error = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      }
      
      return createMockStats(isDir);
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('debe buscar archivos en el workspace con un patrón simple', async () => {
    // Configurar el mock para devolver archivos .txt
    mockFsPromises.readdir.mockImplementation(async (dirPath: fs.PathLike, options: { withFileTypes: true }) => {
      const pathStr = dirPath.toString();
      const relativePath = path.relative(workspacePath, pathStr);
      
      if (relativePath === '') {
        return Promise.resolve([
          new MockDirent('archivo1.txt', false),
          new MockDirent('archivo2.txt', false),
          new MockDirent('carpeta1', true)
        ] as unknown as Dirent<Buffer>[]);
      }
      
      return Promise.resolve([]);
    });
    
    // Ejecutar la herramienta
    const result = await searchWorkspaceTool.execute({ 
      pattern: '*.txt',
      caseSensitive: false 
    });
    
    // Verificar el resultado
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    if (!result.data) {
      throw new Error('Expected data to be defined');
    }
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(2);
    expect(result.data.some(f => f.fileName === 'archivo1.txt')).toBe(true);
    expect(result.data.some(f => f.fileName === 'archivo2.txt')).toBe(true);
  });
  
  it('debe limitar los resultados según maxResults', async () => {
    // Configurar el mock para devolver múltiples archivos
    mockFsPromises.readdir.mockImplementation(async (dirPath: PathLike) => {
      const pathStr = dirPath.toString();
      const relativePath = path.relative(workspacePath, pathStr);
      
      if (relativePath === '') {
        return Promise.resolve(Array(10).fill(0).map((_, i) => 
          new MockDirent(`archivo${i}.txt`, false)
        ) as unknown as Dirent<Buffer>[]);
      }
      
      return Promise.resolve([]);
    });
    
    // Ejecutar la herramienta con un límite bajo
    const result = await searchWorkspaceTool.execute({ 
      pattern: '*.txt',
      maxResults: 3
    });
    
    // Verificar que solo se devolvieron 3 resultados
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    if (!result.data) {
      throw new Error('Expected data to be defined');
    }
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(3);
  });
  
  it('debe buscar en subdirectorios cuando se especifica', async () => {
    // Configurar el mock para devolver archivos en diferentes niveles
    mockFsPromises.readdir.mockImplementation(async (dirPath: PathLike, options: { withFileTypes: true }) => {
      const pathStr = dirPath.toString();
      const relativePath = path.relative(workspacePath, pathStr);
      
      if (relativePath === '') {
        return Promise.resolve([
          new MockDirent('archivo1.txt', false),
          new MockDirent('carpeta1', true)
        ] as unknown as Dirent<Buffer>[]);
      } else if (relativePath === 'carpeta1') {
        return Promise.resolve([
          new MockDirent('archivo2.txt', false)
        ] as unknown as Dirent<Buffer>[]);
      }
      
      return Promise.resolve([]);
    });
    
    // Ejecutar la herramienta buscando en subdirectorios
    const result = await searchWorkspaceTool.execute({
      pattern: '*.txt',
      maxResults: 10,
    });
    
    // Verificar que encontró archivos en todos los niveles
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    if (!result.data) {
      throw new Error('Expected data to be defined');
    }
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(2);
    expect(result.data.some(f => f.fileName === 'archivo1.txt')).toBe(true);
    expect(result.data.some(f => f.fileName === 'archivo2.txt')).toBe(true);
  });
  
  it('debe manejar patrones de exclusión', async () => {
    // Configurar el mock para devolver archivos en diferentes niveles
    mockFsPromises.readdir.mockImplementation(async (dirPath: PathLike, options: { withFileTypes: true }) => {
      const pathStr = dirPath.toString();
      const relativePath = path.relative(workspacePath, pathStr);
      
      if (relativePath === '') {
        return Promise.resolve([
          new MockDirent('incluir.txt', false),
          new MockDirent('excluir.txt', false),
          new MockDirent('carpeta1', true)
        ] as unknown as Dirent<Buffer>[]);
      } else if (relativePath === 'carpeta1') {
        return Promise.resolve([
          new MockDirent('otro_archivo.txt', false)
        ] as unknown as Dirent<Buffer>[]);
      }
      
      return Promise.resolve([]);
    });
    
    // Ejecutar la herramienta con patrón de exclusión
    const result = await searchWorkspaceTool.execute({
      pattern: '*.txt',
      exclude: '*excluir*',
      maxResults: 10,
    });
    
    // Verificar que se aplicó el patrón de exclusión
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    if (!result.data) {
      throw new Error('Expected data to be defined');
    }
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.some(f => f.fileName === 'incluir.txt')).toBe(true);
    expect(result.data.some(f => f.fileName === 'excluir.txt')).toBe(false);
  });
  
  it('debe manejar la ausencia de un workspace abierto', async () => {
    // Configurar para que no haya workspace
    vscodeMock.clearWorkspaceFolders();
    
    // Ejecutar la herramienta
    const result = await searchWorkspaceTool.execute({
      pattern: '*',
      maxResults: 10,
    });
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No hay ningún workspace abierto');
    }
  });
  
  });
  
  it('debe manejar directorios que no existen', async () => {
    // Configurar el mock para simular que el directorio no existe
    mockFs.existsSync.mockReturnValue(false);
    
    // Ejecutar la herramienta
    const result = await searchWorkspaceTool.execute({
      pattern: '*',
      maxResults: 10,
    });
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('no existe');
    }
  });
  
  it('debe manejar errores de lectura de directorio', async () => {
    // Configurar el mock para simular un error al leer el directorio
    const mockFsPromises = fs.promises as jest.Mocked<typeof fs.promises>;
    mockFsPromises.readdir.mockRejectedValue(new Error('Error de lectura'));
    
    // Ejecutar la herramienta
    const result = await searchWorkspaceTool.execute({
      pattern: '*',
      maxResults: 10,
    });
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Error al buscar archivos');
    }
  });

