import { deletePath } from '../../features/tools/definitions/filesystem/deletePath';
import { ToolExecutionContext } from '../../features/tools/types';

describe('deletePath', () => {
  let deletedPath = '';
  const mockContext: ToolExecutionContext = {
    vscodeAPI: {
      workspace: {
        asRelativePath: (uri: any) => uri.fsPath || uri,
        fs: {
          delete: async (targetUri: any, _opts: any) => {
            deletedPath = targetUri.fsPath || targetUri;
          },
          stat: async (_uri: any) => ({}),
        },
      },
    },
  } as any;

  beforeEach(() => {
    deletedPath = '';
  });

  it('elimina el path correctamente', async () => {
    const result = await deletePath.execute({ path: 'src/test/archivo.txt' }, mockContext);
    expect(result.success).toBe(true);
    expect(result.data?.deleted).toBe(true);
    expect(deletedPath).toBe('src/test/archivo.txt');
  });

  it('falla si el path no se puede resolver', async () => {
    const brokenContext = {
      ...mockContext,
      vscodeAPI: {
        ...mockContext.vscodeAPI,
        workspace: {
          ...mockContext.vscodeAPI.workspace,
          asRelativePath: () => '',
        },
      },
    } as any;
    const result = await deletePath.execute({ path: '' }, brokenContext);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
