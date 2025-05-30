import { deletePath } from '../../features/tools/definitions/filesystem/deletePath';
import { ToolExecutionContext } from '../../features/tools/types';

describe('deletePath', () => {
  let deletedPath = '';
  const mockContext: ToolExecutionContext = {
    vscodeAPI: {
      workspace: {
        workspaceFolders: [{ 
          name: 'workspace', 
          uri: { 
            fsPath: '/workspace',
            toString: () => 'file:///workspace' 
          } 
        }],
        asRelativePath: (uri: any) => {
          const path = uri.fsPath || uri;
          return path.replace('/workspace/', '');
        },
        fs: {
          delete: async (targetUri: any, _opts: any) => {
            const path = targetUri.fsPath || targetUri;
            deletedPath = path.replace('/workspace/', '');
          },
          stat: async (_uri: any) => ({
            type: 2, // FileType.File
            ctime: Date.now(),
            mtime: Date.now(),
            size: 100
          }),
        },
      },
      FileType: {
        File: 2,
        Directory: 1,
        SymbolicLink: 4,
        Unknown: 0
      }
    }
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
          workspaceFolders: [], // Sin workspace para forzar error
          asRelativePath: () => '',
        },
        FileType: {
          File: 2,
          Directory: 1,
          SymbolicLink: 4,
          Unknown: 0
        }
      }
    } as any;
    const result = await deletePath.execute({ path: '' }, brokenContext);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
