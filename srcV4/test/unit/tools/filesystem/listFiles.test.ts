import { listFilesTool } from '../../../../features/tools/filesystem/listFiles';
import { createTempDir, cleanupTempDir, createTempFile, setupVSCodeMock } from '../../testUtils';

// Mock de vscode
jest.mock('vscode');

// Mock de fs/promises
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
  access: jest.fn()
}));

const mockFs = require('fs/promises');

describe('listFilesTool', () => {
  let tempDir: string;
  const vscodeMock = setupVSCodeMock();
  
  beforeEach(async () => {
    // Configurar un workspace temporal
    tempDir = await createTempDir();
    vscodeMock.clearWorkspaceFolders();
    vscodeMock.addWorkspaceFolder(tempDir);
    
    // Configurar mocks por defecto
    mockFs.access.mockResolvedValue(undefined);
    mockFs.stat.mockImplementation((path: string) => ({
      isDirectory: () => !path.endsWith('.txt'),
      size: 1024,
      mtime: new Date()
    }));
  });
  
  afterEach(async () => {
    // Limpiar directorios temporales
    await cleanupTempDir(tempDir);
    jest.clearAllMocks();
  });
  
  it('debe listar archivos en un directorio', async () => {
    // Configurar el mock para devolver una lista de archivos
    mockFs.readdir.mockResolvedValue([
      { name: 'file1.txt', isDirectory: () => false },
      { name: 'file2.txt', isDirectory: () => false },
      { name: 'subdir', isDirectory: () => true }
    ]);
    
    // Ejecutar la herramienta
    const result = await listFilesTool.execute({
      path: tempDir,
      relativeTo: 'absolute'
    });
    
    // Verificar el resultado
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.files).toContain('file1.txt');
      expect(result.data.files).toContain('file2.txt');
      expect(result.data.directories).toContain('subdir');
      expect(result.data.path).toBe(tempDir);
    } else {
      fail('Se esperaba que result.data esté definido');
    }
  });
  
  it('debe manejar errores al listar un directorio que no existe', async () => {
    // Configurar el mock para simular un error
    const error = new Error('Directorio no encontrado');
    mockFs.access.mockRejectedValue(error);
    
    // Ejecutar la herramienta
    const result = await listFilesTool.execute({
      path: '/ruta/inexistente',
      relativeTo: 'absolute'
    });
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No se pudo acceder al directorio');
    }
  });
  
  it('debe usar el directorio del workspace cuando relativeTo es workspace', async () => {
    const fileName = 'test-dir';
    const workspacePath = process.cwd();
    const fullPath = `${workspacePath}/${fileName}`;
    
    // Configurar el mock para simular un directorio vacío
    mockFs.readdir.mockResolvedValue([]);
    
    // Ejecutar la herramienta con ruta relativa
    await listFilesTool.execute({
      path: fileName,
      relativeTo: 'workspace'
    });
    
    // Verificar que se usó la ruta completa
    expect(mockFs.access).toHaveBeenCalledWith(fullPath, undefined);
  });
  
  it('debe manejar directorios vacíos', async () => {
    // Configurar el mock para devolver un directorio vacío
    mockFs.readdir.mockResolvedValue([]);
    
    // Ejecutar la herramienta
    const result = await listFilesTool.execute({
      path: tempDir,
      relativeTo: 'absolute'
    });
    
    // Verificar el resultado
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.files).toHaveLength(0);
      expect(result.data.directories).toHaveLength(0);
    } else {
      fail('Se esperaba que result.data esté definido');
    }
  });
  
  it('debe manejar errores al acceder a archivos dentro del directorio', async () => {
    // Configurar el mock para fallar en el acceso a un archivo
    mockFs.readdir.mockResolvedValue([
      { name: 'file1.txt', isDirectory: () => false },
      { name: 'inaccessible.txt', isDirectory: () => false }
    ]);
    
    // Hacer que el acceso falle para un archivo específico
    mockFs.stat.mockImplementation((path: string) => {
      if (path.includes('inaccessible.txt')) {
        throw new Error('Permiso denegado');
      }
      return {
        isDirectory: () => false,
        size: 1024,
        mtime: new Date()
      };
    });
    
    // Ejecutar la herramienta
    const result = await listFilesTool.execute({
      path: tempDir,
      relativeTo: 'absolute'
    });
    
    // Verificar que aún así se devuelven los archivos accesibles
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.files).toContain('file1.txt');
      expect(result.data.files).not.toContain('inaccessible.txt');
    } else {
      fail('Se esperaba que result.data esté definido');
    }
  });
});
