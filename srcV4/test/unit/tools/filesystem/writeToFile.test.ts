import { writeToFileTool } from '../../../../features/tools/filesystem/writeToFile';
import { createTempFile, cleanupTempFile, setupVSCodeMock } from '../../testUtils';

// Mock de vscode
jest.mock('vscode');

// Mock de fs/promises
jest.mock('fs/promises', () => ({
  access: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  stat: jest.fn(),
  constants: {
    R_OK: 0
  }
}));

const mockFs = require('fs/promises');

describe('writeToFileTool', () => {
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
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ isDirectory: () => true });
  });
  
  afterEach(async () => {
    // Limpiar archivos temporales
    await cleanupTempFile(tempFilePath);
    jest.clearAllMocks();
  });
  
  it('debe escribir contenido en un archivo existente', async () => {
    // Configurar el mock para simular que el archivo existe
    mockFs.access.mockResolvedValue(undefined);
    
    // Ejecutar la herramienta
    const content = 'nuevo contenido';
    const result = await writeToFileTool.execute({
      path: tempFilePath,
      content,
      relativeTo: 'absolute'
    });
    
    // Verificar el resultado
    expect(result.success).toBe(true);
    
    // Verificar que se llamó a writeFile con el contenido correcto
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      tempFilePath,
      content,
      { encoding: 'utf-8' }
    );
  });
  
  it('debe crear directorios intermedios si no existen', async () => {
    const newDir = '/nuevo/directorio';
    const newFilePath = `${newDir}/archivo.txt`;
    
    // Configurar el mock para simular que el directorio no existe
    mockFs.access.mockRejectedValue(new Error('No existe'));
    
    // Ejecutar la herramienta
    const result = await writeToFileTool.execute({
      path: newFilePath,
      content: 'contenido',
      relativeTo: 'absolute',
      createIfNotExists: true
    });
    
    // Verificar el resultado
    expect(result.success).toBe(true);
    
    // Verificar que se creó el directorio
    expect(mockFs.mkdir).toHaveBeenCalledWith(
      newDir,
      { recursive: true }
    );
  });
  
  it('debe manejar errores al escribir en el archivo', async () => {
    // Configurar el mock para simular un error al escribir
    const error = new Error('Error de escritura');
    mockFs.writeFile.mockRejectedValue(error);
    
    // Ejecutar la herramienta
    const result = await writeToFileTool.execute({
      path: tempFilePath,
      content: 'contenido',
      relativeTo: 'absolute'
    });
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Error desconocido al escribir en el archivo');
    }
  });
  
  it('no debe sobrescribir archivos si createIfNotExists es falso', async () => {
    // Configurar el mock para simular que el archivo no existe
    mockFs.access.mockRejectedValue(new Error('No existe'));
    
    // Ejecutar la herramienta
    const result = await writeToFileTool.execute({
      path: tempFilePath,
      content: 'contenido',
      relativeTo: 'absolute',
      createIfNotExists: false
    });
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('no existe');
    }
    
    // Verificar que no se intentó escribir el archivo
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });
  
  it('debe manejar diferentes codificaciones', async () => {
    const encoding = 'base64';
    const content = Buffer.from('contenido').toString('base64');
    
    // Ejecutar la herramienta
    await writeToFileTool.execute({
      path: tempFilePath,
      content,
      relativeTo: 'absolute',
      encoding
    });
    
    // Verificar que se usó la codificación correcta
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      tempFilePath,
      content,
      { encoding }
    );
  });
});
