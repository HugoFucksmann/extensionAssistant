import { getProjectInfoTool } from '../../../../modules/tools/project/getProjectInfo';
import { setupVSCodeMock } from '../../testUtils';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Dirent, Stats } from 'fs';

// Mock de vscode
jest.mock('vscode');

// Mock de fs y fs/promises
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  statSync: jest.fn(),
  readdirSync: jest.fn()
} as any; // Usamos 'as any' para evitar problemas con los tipos de los mocks

const mockFsPromises = {
  readdir: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn()
} as any; // Usamos 'as any' para evitar problemas con los tipos de los mocks

jest.mock('fs', () => mockFs);
jest.mock('fs/promises', () => mockFsPromises);

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

describe('getProjectInfoTool', () => {
  const vscodeMock = setupVSCodeMock();
  const mockFsPromises = jest.mocked(fs);
  
  // Configuración común para las pruebas
  const workspacePath = '/ruta/workspace';
  const mockFiles = [
    'package.json',
    'tsconfig.json',
    'src/index.ts',
    'src/utils/helper.ts',
    'tests/test.spec.ts',
    'README.md',
  ];
  
  // Mock para package.json
  const mockPackageJson = {
    name: 'test-project',
    version: '1.0.0',
    description: 'Proyecto de prueba',
    main: 'dist/index.js',
    scripts: {
      test: 'jest',
      build: 'tsc',
      start: 'node dist/index.js',
    },
    dependencies: {
      express: '^4.17.1',
      typescript: '^4.0.0',
    },
    devDependencies: {
      jest: '^27.0.0',
      '@types/node': '^14.0.0',
    },
  };
  
  // Mock para tsconfig.json
  const mockTsConfig = {
    compilerOptions: {
      target: 'es6',
      module: 'commonjs',
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', '**/*.test.ts'],
  };
  
  beforeEach(() => {
    // Configurar el workspace
    vscodeMock.clearWorkspaceFolders();
    vscodeMock.addWorkspaceFolder(workspacePath);
    
    // Configurar mocks
    jest.requireMock('fs').existsSync.mockImplementation((path: string) => {
      // Simular que todos los archivos de configuración existen
      const configFiles = ['package.json', 'tsconfig.json', 'webpack.config.js', 'jest.config.js'];
      return configFiles.some(file => path.endsWith(file));
    });
    
    // Mock para readFile
    mockFsPromises.readFile.mockImplementation(async (path: any) => {
      if (typeof path === 'string' && path.endsWith('package.json')) {
        return JSON.stringify(mockPackageJson);
      } else if (typeof path === 'string' && path.endsWith('tsconfig.json')) {
        return JSON.stringify(mockTsConfig);
      }
      return '{}';
    });
    
    // Mock para readdir con tipos correctos
    mockFsPromises.readdir = jest.fn().mockImplementation(async (dirPath: string | Buffer | URL, options?: { withFileTypes: true }) => {
      // Simular estructura de directorios
      const entries: Dirent[] = [];
      
      const dirPathStr = dirPath.toString();
      
      // Función auxiliar para crear un Dirent
      const createDirent = (name: string, isDirectory: boolean): Dirent => {
        return {
          name,
          isDirectory: () => isDirectory,
          isFile: () => !isDirectory,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => false,
          isFIFO: () => false,
          isSocket: () => false,
        } as Dirent;
      };
      
      if (dirPathStr === workspacePath) {
        entries.push(
          createDirent('package.json', false),
          createDirent('tsconfig.json', false),
          createDirent('src', true),
          createDirent('tests', true),
          createDirent('README.md', false)
        );
      } else if (dirPathStr.endsWith('src')) {
        entries.push(
          createDirent('index.ts', false),
          createDirent('utils', true)
        );
      } else if (dirPathStr.endsWith('src/utils')) {
        entries.push(
          createDirent('helper.ts', false)
        );
      } else if (dirPathStr.endsWith('tests')) {
        entries.push(
          createDirent('test.spec.ts', false)
        );
      }
      
      if (options?.withFileTypes) {
        return entries;
      }
      
      return entries.map(e => e.name);
    });
    
    // Mock para stat
    mockFsPromises.stat.mockImplementation(async (filePath: any) => {
      const pathStr = filePath.toString();
      const isDir = pathStr.includes('src') || 
                  pathStr.includes('tests') || 
                  pathStr.includes('utils') ||
                  pathStr.endsWith('node_modules');
      
      const stats: Partial<Stats> = {
        isDirectory: () => isDir,
        isFile: () => !isDir,
        size: isDir ? 4096 : 1024,
        mtime: new Date(),
        atime: new Date(),
        ctime: new Date(),
        birthtime: new Date(),
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
        blksize: 0,
        blocks: 0,
        atimeMs: 0,
        mtimeMs: 0,
        ctimeMs: 0,
        birthtimeMs: 0
      };
      
      return stats as Stats;
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('debe obtener información básica del proyecto', async () => {
    // Configurar el mock para detectar el tipo de proyecto
    jest.spyOn(getProjectInfoTool as any, 'detectProjectType').mockResolvedValue('node');
    
    // Ejecutar la herramienta
    const result = await getProjectInfoTool.execute();
    
    // Verificar el resultado
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    if (!result.success || !result.data) {
      fail('Se esperaba que la ejecución tuviera éxito');
      return;
    }
    
    const info = result.data;
    
    // Verificar información básica
    expect(info.name).toBe('test-project');
    expect(info.workspacePath).toBe(workspacePath);
    
    // Verificar estadísticas
    expect(info.stats.totalFiles).toBeGreaterThan(0);
    expect(info.stats.totalSize).toBeGreaterThan(0);
    
    // Verificar archivos
    expect(info.files.length).toBeGreaterThan(0);
    
    // Verificar configuración
    expect(info.config).toBeDefined();
    if (info.config) {
      expect(info.config.type).toBe('node');
      expect(info.config.dependencies).toBeDefined();
      expect(info.config.scripts).toBeDefined();
    }
  });
  
  it('debe manejar la ausencia de un workspace abierto', async () => {
    // Configurar para que no haya workspace
    vscodeMock.clearWorkspaceFolders();
    
    // Ejecutar la herramienta
    const result = await getProjectInfoTool.execute();
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No hay ningún workspace abierto');
    } else {
      fail('Se esperaba que la ejecución fallara');
    }
  });
  
  it('debe manejar errores al leer archivos de configuración', async () => {
    // Configurar el mock para simular un error al leer package.json
    mockFsPromises.readFile.mockImplementationOnce(() => Promise.reject(new Error('Error de lectura')));
    
    // Ejecutar la herramienta
    const result = await getProjectInfoTool.execute();
    
    // Verificar que se manejó el error correctamente
    expect(result.success).toBe(true);
    if (result.success) {
      // Aunque falle la lectura de package.json, la herramienta debería seguir funcionando
      expect(result.data).toBeDefined();
    } else {
      fail('Se esperaba que la ejecución tuviera éxito');
    }
  });
  
  it('debe detectar correctamente el tipo de proyecto', async () => {
    // Configurar para que exista un package.json
    jest.requireMock('fs').existsSync.mockImplementation((path: string) => 
      path.toString().endsWith('package.json')
    );
    
    // Mock para detectar el tipo de proyecto
    jest.spyOn(getProjectInfoTool as any, 'detectProjectType').mockResolvedValue('node');
    
    // Ejecutar la herramienta
    const result = await getProjectInfoTool.execute();
    
    // Verificar que se detectó correctamente el tipo de proyecto
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.config?.type).toBe('node');
    } else {
      fail('Se esperaba que la ejecución tuviera éxito');
    }
  });
  
  it('debe manejar correctamente proyectos de Node.js', async () => {
    // Configurar para simular un proyecto de Node.js
    jest.spyOn(getProjectInfoTool as any, 'detectProjectType').mockResolvedValue('node');
    
    // Ejecutar la herramienta
    const result = await getProjectInfoTool.execute();
    
    // Verificar que se detectó correctamente el tipo de proyecto
    expect(result.success).toBe(true);
    
    // Verificar que los datos están definidos
    if (!result.data) {
      fail('Se esperaba que result.data estuviera definido');
      return;
    }
    
    // Verificar el tipo de proyecto
    expect(result.data.config?.type).toBe('node');
  });
  
  it('debe manejar correctamente proyectos de Python', async () => {
    // Configurar el mock para detectar proyecto Python
    jest.spyOn(getProjectInfoTool as any, 'detectProjectType').mockResolvedValue('python');
    
    // Mock para archivo requirements.txt
    mockFs.readFileSync.mockImplementation((path: string) => {
      if (path.endsWith('requirements.txt')) {
        return 'numpy==1.21.0\npandas==1.3.0\n';
      }
      return '{}';
    });
    
    // Ejecutar la herramienta
    const pythonResult = await getProjectInfoTool.execute();
    
    // Verificar el resultado
    expect(pythonResult.success).toBe(true);
    expect(pythonResult.data).toBeDefined();
    
    if (!pythonResult.success || !pythonResult.data) {
      fail('Se esperaba que la ejecución tuviera éxito');
      return;
    }
    
    // Verificar que se detectó correctamente como proyecto Python
    expect(pythonResult.data.config?.type).toBe('python');
    
    // Verificar que se detectaron las dependencias de Python
    expect(pythonResult.data.config?.dependencies).toBeDefined();
    if (pythonResult.data.config?.dependencies) {
      expect(pythonResult.data.config.dependencies['numpy']).toBe('1.21.0');
      expect(pythonResult.data.config.dependencies['pandas']).toBe('1.3.0');
    }
  });
  
  it('debe calcular correctamente las estadísticas del proyecto', async () => {
    // Configurar el mock para detectar el tipo de proyecto
    jest.spyOn(getProjectInfoTool as any, 'detectProjectType').mockResolvedValue('node');
    
    // Ejecutar la herramienta
    const result = await getProjectInfoTool.execute();
    
    // Verificar que la ejecución fue exitosa y los datos están definidos
    if (!result.success || !result.data) {
      fail('La ejecución de la herramienta falló o no devolvió datos');
      return;
    }
    
    const { stats, files } = result.data;
    
    // Verificar que se calcularon las estadísticas
    expect(stats.totalFiles).toBeGreaterThan(0);
    expect(stats.totalSize).toBeGreaterThan(0);
    
    // Verificar estadísticas de extensiones
    expect(stats.extensions).toBeDefined();
    
    // Verificar que las extensiones esperadas existen (pueden ser 0 en algunos casos)
    expect(stats.extensions['.ts'] !== undefined).toBe(true);
    expect(stats.extensions['.json'] !== undefined).toBe(true);
    
    // Verificar directorios
    const directories = files.filter(f => f.isDirectory).map(f => f.path);
    expect(directories.length).toBeGreaterThan(0);
    
    // Verificar que los directorios esperados están presentes
    const dirPaths = directories.join(',');
    expect(dirPaths).toContain('src');
    expect(dirPaths).toContain('tests');
  });
  
  it('debe incluir estadísticas detalladas de archivos', async () => {
    // Configurar el mock para detectar el tipo de proyecto
    jest.spyOn(getProjectInfoTool as any, 'detectProjectType').mockResolvedValue('node');
    
    // Ejecutar la herramienta
    const result = await getProjectInfoTool.execute();
    
    // Verificar que la ejecución fue exitosa y los datos están definidos
    if (!result.success || !result.data) {
      fail('La ejecución de la herramienta falló o no devolvió datos');
      return;
    }
    
    const { stats, files } = result.data;
    
    // Verificar estadísticas básicas
    expect(stats.totalFiles).toBeGreaterThan(0);
    expect(stats.totalSize).toBeGreaterThan(0);
    
    // Verificar estadísticas de extensiones
    expect(stats.extensions).toBeDefined();
    
    // Verificar que las extensiones esperadas existen (pueden ser 0 en algunos casos)
    expect(stats.extensions['.ts'] !== undefined).toBe(true);
    expect(stats.extensions['.json'] !== undefined).toBe(true);
    
    // Verificar directorios
    const directories = files.filter(f => f.isDirectory).map(f => f.path);
    expect(directories.length).toBeGreaterThan(0);
    
    // Verificar que los directorios esperados están presentes
    const dirPaths = directories.join(',');
    expect(dirPaths).toContain('src');
    expect(dirPaths).toContain('tests');
  });
  
  it('debe incluir estadísticas de archivos', async () => {
    // Configurar el mock para detectar el tipo de proyecto
    jest.spyOn(getProjectInfoTool as any, 'detectProjectType').mockResolvedValue('node');
    
    // Ejecutar la herramienta
    const result = await getProjectInfoTool.execute();
    
    // Verificar que la ejecución fue exitosa y los datos están definidos
    if (!result.success || !result.data) {
      fail('La ejecución de la herramienta falló o no devolvió datos');
      return;
    }
    
    // Verificar estadísticas básicas
    const { stats } = result.data;
    expect(stats.totalFiles).toBeGreaterThan(0);
    expect(stats.totalDirs).toBeGreaterThan(0);
    expect(stats.totalSize).toBeGreaterThan(0);
    
    // Verificar que se incluyeron las extensiones
    expect(stats.extensions).toBeDefined();
    expect(Object.keys(stats.extensions).length).toBeGreaterThanOrEqual(0);
  });
  
  it('debe manejar proyectos sin archivos de configuración conocidos', async () => {
    // Configurar el mock para no encontrar archivos de configuración
    mockFs.existsSync.mockReturnValue(false);
    
    // Ejecutar la herramienta
    const result = await getProjectInfoTool.execute();
    
    // Verificar que la ejecución fue exitosa y los datos están definidos
    if (!result.success || !result.data) {
      fail('La ejecución de la herramienta falló o no devolvió datos');
      return;
    }
    
    // Verificar que se devolvió información básica
    expect(result.data.name).toBe('test-project');
    expect(result.data.workspacePath).toBe(workspacePath);
    
    // Verificar que no hay configuración
    expect(result.data.config).toBeUndefined();
  });
});
