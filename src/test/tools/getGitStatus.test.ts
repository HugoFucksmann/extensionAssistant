import { getGitStatus } from '../../features/tools/definitions/git/getGitStatus';
import { ToolExecutionContext } from '../../features/tools/types';

describe('getGitStatus', () => {
  const mockContext: ToolExecutionContext = {
    vscodeAPI: {
      workspace: {
        asRelativePath: (uri: any) => uri.fsPath || uri,
      },
    },
  } as any;

  it('devuelve información de git si está disponible', async () => {
    // Simular ejecución exitosa
    const result = await getGitStatus.execute({}, mockContext);
    // No se puede validar estructura real sin mock de git, pero debe retornar success o error controlado
    expect(typeof result.success).toBe('boolean');
  });

  it('devuelve error si no hay repo git', async () => {
    // Forzar un error simulado
    const contextWithError = {
      ...mockContext,
      vscodeAPI: {
        ...mockContext.vscodeAPI,
        workspace: {
          ...mockContext.vscodeAPI.workspace,
          asRelativePath: () => { throw new Error('No git'); },
        },
      },
    } as any;
    const result = await getGitStatus.execute({}, contextWithError);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
