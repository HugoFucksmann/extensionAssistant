import { runInTerminal } from '../../features/tools/definitions/terminal/runInTerminal';
import { ToolExecutionContext } from '../../features/tools/types';

describe('runInTerminal', () => {
  let sentCommand = '';
  let shown = false;
  let usedTerminalName = '';
  const fakeTerminal = {
    name: 'AI Assistant Task',
    exitStatus: undefined,
    sendText: (cmd: string) => { sentCommand = cmd; },
    show: (_preserveFocus: boolean) => { shown = true; },
  };
  const mockContext: ToolExecutionContext = {
  vscodeAPI: {
    window: {
      terminals: [fakeTerminal],
      createTerminal: (opts: any) => {
        usedTerminalName = opts.name;
        // Crea un terminal con el nombre solicitado
        return {
          ...fakeTerminal,
          name: opts.name
        };
      },
      showTextDocument: () => {},
      showNotebookDocument: () => {},
      createTextEditorDecorationType: () => ({}),
      showInformationMessage: () => {},
      showWarningMessage: () => {},
      showErrorMessage: () => {},
    },
    workspace: {
      workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
    },
  },
  dispatcher: { systemInfo: () => {} },
} as any;

  beforeEach(() => {
    sentCommand = '';
    shown = false;
    usedTerminalName = '';
  });

  it('envía el comando y muestra el terminal', async () => {
    const result = await runInTerminal.execute({ command: 'echo test', terminalName: 'AI Assistant Task', focus: true }, mockContext);
    expect(result.success).toBe(true);
    expect(sentCommand).toBe('echo test');
    expect(shown).toBe(true);
    if (result.success) {
      const data = result.data as { terminalName: string };
      expect(data.terminalName).toBe('AI Assistant Task');
    }
  });

  it('crea un terminal si no existe', async () => {
    const context = {
      ...mockContext,
      vscodeAPI: {
        ...mockContext.vscodeAPI,
        window: {
          ...mockContext.vscodeAPI.window,
          terminals: [],
        },
      },
    } as any;
    const result = await runInTerminal.execute({ command: 'ls', terminalName: 'Nuevo Terminal', focus: false }, context);
    expect(result.success).toBe(true);
    expect(sentCommand).toBe('ls');
    expect(usedTerminalName).toBe('Nuevo Terminal');
  });

  it('retorna error si ocurre una excepción', async () => {
    const brokenContext = {
      vscodeAPI: {
        window: {
          terminals: [], // Sin terminales existentes
          createTerminal: () => { 
            throw new Error('Terminal creation failed'); 
          },
          showErrorMessage: () => {},
          showInformationMessage: () => {},
          showWarningMessage: () => {},
        },
        workspace: {
          workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
        },
      },
    } as any;
    const result = await runInTerminal.execute({ command: 'fail', terminalName: 'AI Assistant Task', focus: true }, brokenContext);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to run command');
  });
});
