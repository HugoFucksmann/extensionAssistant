import { applyTextEditTool } from '../../../../modules/tools/editor/applyTextEdit';
import { setupActiveEditorMock, setupVSCodeMock } from '../../testUtils';
import * as vscode from 'vscode';

// Mock de vscode
jest.mock('vscode');

describe('applyTextEditTool', () => {
  const vscodeMock = setupVSCodeMock();
  let mockEditor: any;
  
  beforeEach(() => {
    // Configurar un workspace temporal
    vscodeMock.clearWorkspaceFolders();
    vscodeMock.addWorkspaceFolder('/ruta/workspace');
    
    // Configurar el mock del editor activo
    mockEditor = setupActiveEditorMock('contenido original');
    
    // Limpiar mocks
    jest.clearAllMocks();
  });
  
  it('debe aplicar ediciones de texto al editor activo', async () => {
    // Configurar el mock de applyEdit
    const mockApplyEdit = jest.spyOn(vscode.workspace, 'applyEdit').mockResolvedValue(true);
    
    // Ejecutar la herramienta
    const result = await applyTextEditTool.execute({
      edits: [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 8 }
        },
        text: 'nuevo contenido'
      }]
    });
    
    // Verificar el resultado
    expect(result.success).toBe(true);
    
    // Verificar que se llamó a applyEdit
    expect(mockApplyEdit).toHaveBeenCalledTimes(1);
    
    // Verificar que se llamó a edit en el editor
    expect(mockEditor.editor.edit).toHaveBeenCalledTimes(1);
  });
  
  it('debe manejar errores al aplicar ediciones', async () => {
    // Configurar el mock para simular un error
    const error = new Error('Error al aplicar edición');
    jest.spyOn(vscode.workspace, 'applyEdit').mockRejectedValue(error);
    
    // Ejecutar la herramienta
    const result = await applyTextEditTool.execute({
      edits: [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 8 }
        },
        text: 'nuevo contenido'
      }]
    });
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Error al aplicar los cambios');
    }
  });
  
  it('debe manejar la ausencia de un editor activo', async () => {
    // Configurar para que no haya editor activo
    jest.spyOn(vscode.window, 'activeTextEditor', 'get').mockReturnValue(undefined);
    
    // Ejecutar la herramienta
    const result = await applyTextEditTool.execute({
      documentUri: 'file:///ruta/archivo.txt',
      edits: [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 8 }
        },
        text: 'nuevo contenido'
      }]
    });
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No hay ningún editor de texto activo');
    }
  });
  
  it('debe manejar ediciones vacías', async () => {
    // Ejecutar la herramienta sin ediciones
    const result = await applyTextEditTool.execute({
      edits: []
    });
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No se proporcionaron ediciones para aplicar');
    }
  });
  
  it('debe manejar rangos inválidos', async () => {
    // Ejecutar la herramienta con un rango inválido
    const result = await applyTextEditTool.execute({
      edits: [{
        range: {
          start: { line: -1, character: 0 },
          end: { line: 0, character: 8 }
        },
        text: 'nuevo contenido'
      }]
    });
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Rango de edición inválido');
    }
  });
  
  it('debe manejar múltiples ediciones', async () => {
    // Configurar el mock de applyEdit
    const mockApplyEdit = jest.spyOn(vscode.workspace, 'applyEdit').mockResolvedValue(true);
    
    // Ejecutar la herramienta con múltiples ediciones
    const result = await applyTextEditTool.execute({
      edits: [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 8 }
          },
          text: 'primera edición'
        },
        {
          range: {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 5 }
          },
          text: 'segunda edición'
        }
      ]
    });
    
    // Verificar el resultado
    expect(result.success).toBe(true);
    
    // Verificar que se llamó a applyEdit
    expect(mockApplyEdit).toHaveBeenCalledTimes(1);
    
    // Verificar que se llamó a edit en el editor
    expect(mockEditor.editor.edit).toHaveBeenCalledTimes(1);
  });
});
