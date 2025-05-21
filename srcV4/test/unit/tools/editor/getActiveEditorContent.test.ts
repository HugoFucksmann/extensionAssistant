import { getActiveEditorContentTool } from '../../../../features/tools/editor/getActiveEditorContent';
import { setupActiveEditorMock, setupVSCodeMock } from '../../testUtils';

// Mock de vscode
jest.mock('vscode');

describe('getActiveEditorContentTool', () => {
  const vscodeMock = setupVSCodeMock();
  
  beforeEach(() => {
    // Configurar un workspace temporal
    vscodeMock.clearWorkspaceFolders();
    vscodeMock.addWorkspaceFolder('/ruta/workspace');
    
    // Limpiar mocks
    jest.clearAllMocks();
  });
  
  it('debe obtener el contenido del editor activo', async () => {
    // Configurar el mock del editor activo
    const mockContent = 'contenido de prueba';
    const mockLanguage = 'typescript';
    const mockFilePath = '/ruta/workspace/archivo.ts';
    
    setupActiveEditorMock(mockContent, mockLanguage);
    
    // Ejecutar la herramienta
    const result = await getActiveEditorContentTool.execute();
    
    // Verificar el resultado
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.content).toBe(mockContent);
      expect(result.data.languageId).toBe(mockLanguage);
      expect(result.data.filePath).toBe(mockFilePath);
      expect(result.data.isDirty).toBe(false);
    } else {
      fail('Se esperaba que result.data esté definido');
    }
  });
  
  it('debe manejar la ausencia de un editor activo', async () => {
    // Configurar para que no haya editor activo
    jest.spyOn(require('vscode').window, 'activeTextEditor', 'get').mockReturnValue(undefined);
    
    // Ejecutar la herramienta
    const result = await getActiveEditorContentTool.execute();
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No hay ningún editor de texto activo');
    }
  });
  
  it('debe manejar contenido nulo o indefinido en el editor', async () => {
    // Configurar el mock del editor con contenido nulo
    const editorMock = {
      document: {
        getText: () => null as any,
        languageId: 'plaintext',
        uri: { fsPath: '/ruta/archivo.txt' },
        isDirty: false
      },
      selection: {}
    };
    
    jest.spyOn(require('vscode').window, 'activeTextEditor', 'get').mockReturnValue(editorMock);
    
    // Ejecutar la herramienta
    const result = await getActiveEditorContentTool.execute();
    
    // Verificar el resultado
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.content).toBe('');
    } else {
      fail('Se esperaba que result.data esté definido');
    }
  });
  
  it('debe manejar correctamente el estado de edición (dirty)', async () => {
    // Configurar el mock del editor con isDirty = true
    const editorMock = {
      document: {
        getText: () => 'contenido modificado',
        languageId: 'typescript',
        uri: { fsPath: '/ruta/archivo.ts' },
        isDirty: true
      },
      selection: {}
    };
    
    jest.spyOn(require('vscode').window, 'activeTextEditor', 'get').mockReturnValue(editorMock);
    
    // Ejecutar la herramienta
    const result = await getActiveEditorContentTool.execute();
    
    // Verificar el resultado
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.isDirty).toBe(true);
    } else {
      fail('Se esperaba que result.data esté definido');
    }
  });
});
