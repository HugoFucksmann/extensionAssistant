import { readFileTool } from '../../../../features/tools/filesystem/readFile';
import { createTempFile, cleanupTempFile, setupVSCodeMock } from '../../testUtils';

// Mock de vscode
jest.mock('vscode');

// Mock de fs/promises
jest.mock('fs/promises', () => ({
  access: jest.fn(),
  readFile: jest.fn(),
  constants: {
    R_OK: 0
  }
}));

const mockFs = require('fs/promises');

describe('readFileTool', () => {
  let tempFilePath: string;
  const vscodeMock = setupVSCodeMock();
  
  beforeEach(async () => {
    // Configurar un workspace temporal
    const tempDir = process.cwd();
    vscodeMock.clearWorkspaceFolders();
    vscodeMock.addWorkspaceFolder(tempDir);
    
    // Crear un archivo temporal
    tempFilePath = await createTempFile('test content');
    
    // Configurar mocks
    mockFs.access.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('test content');
  });
  
  afterEach(async () => {
    // Limpiar archivos temporales
    await cleanupTempFile(tempFilePath);
    jest.clearAllMocks();
  });
  
  it('debe leer el contenido de un archivo', async () => {
    // Ejecutar la herramienta
    const result = await readFileTool.execute({
      path: tempFilePath,
      relativeTo: 'absolute'
    });
    
    // Verificar el resultado
    expect(result.success).toBe(true);
    if (result.success && result.data !== undefined) {
      expect(result.data).toBe('test content');
    } else {
      fail('Se esperaba que result.data esté definido');
    }
    
    // Verificar que se llamó a las funciones de fs
    expect(mockFs.access).toHaveBeenCalledWith(tempFilePath, 0);
    expect(mockFs.readFile).toHaveBeenCalledWith(tempFilePath, { encoding: 'utf-8' });
  });
  
  it('debe manejar errores al leer un archivo que no existe', async () => {
    // Configurar el mock para que falle el acceso al archivo
    const error = new Error('Archivo no encontrado');
    mockFs.access.mockRejectedValue(error);
    
    // Ejecutar la herramienta
    const result = await readFileTool.execute({
      path: '/ruta/inexistente.txt',
      relativeTo: 'absolute'
    });
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No se pudo acceder al archivo');
    }
  });
  
  it('debe usar el directorio del workspace cuando relativeTo es workspace', async () => {
    const fileName = 'test-file.txt';
    const workspacePath = process.cwd();
    const fullPath = `${workspacePath}/${fileName}`;
    
    // Ejecutar la herramienta con ruta relativa
    await readFileTool.execute({
      path: fileName,
      relativeTo: 'workspace'
    });
    
    // Verificar que se usó la ruta completa
    expect(mockFs.access).toHaveBeenCalledWith(fullPath, 0);
  });
  
  it('debe manejar rutas relativas correctamente', async () => {
    const relativePath = './test-file.txt';
    const expectedPath = require('path').resolve(process.cwd(), relativePath);
    
    // Ejecutar la herramienta con ruta relativa
    await readFileTool.execute({
      path: relativePath,
      relativeTo: 'workspace'
    });
    
    // Verificar que se resolvió la ruta correctamente
    expect(mockFs.access).toHaveBeenCalledWith(expectedPath, 0);
  });
  
  it('debe manejar diferentes codificaciones', async () => {
    const encoding = 'base64';
    
    // Ejecutar la herramienta con codificación personalizada
    await readFileTool.execute({
      path: tempFilePath,
      relativeTo: 'absolute',
      encoding
    });
    
    // Verificar que se usó la codificación correcta
    expect(mockFs.readFile).toHaveBeenCalledWith(tempFilePath, { encoding });
  });
});
