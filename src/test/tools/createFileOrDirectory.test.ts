import { createFileOrDirectory } from '../../features/tools/definitions/filesystem/createFileOrDirectory';
import { ToolExecutionContext } from '../../features/tools/types';

describe('createFileOrDirectory', () => {
  let createdPath = '';
  let createdType = '';
  let createdContent = '';
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
          createDirectory: async (_dirUri: any) => {
            if (_dirUri.fsPath && _dirUri.fsPath.includes('/dir')) {
              createdPath = _dirUri.fsPath.replace('/workspace/', '');
              createdType = 'directory';
            }
          },
          writeFile: async (targetUri: any, content: Uint8Array) => {
            const path = targetUri.fsPath || targetUri;
            createdPath = path.replace('/workspace/', '');
            createdContent = new TextDecoder().decode(content);
            createdType = 'file';
          },
          stat: async (uri: any) => {
            // Simular que el archivo/directorio no existe lanzando error
            throw new Error('File not found');
          },
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
    createdPath = '';
    createdType = '';
    createdContent = '';
  });

  it('crea un archivo con contenido', async () => {
    const result = await createFileOrDirectory.execute({ path: 'src/test/archivo.txt', type: 'file', content: 'contenido' }, mockContext);
    expect(result.success).toBe(true);
    expect(result.data?.path).toBe('src/test/archivo.txt');
    expect(result.data?.type).toBe('file');
    expect(createdContent).toBe('contenido');
  });

  it('crea un directorio', async () => {
    const result = await createFileOrDirectory.execute({ path: 'src/test/dir', type: 'directory' }, mockContext);
    expect(result.success).toBe(true);
    expect(result.data?.type).toBe('directory');
  });

  it('falla si el path es inválido', async () => {
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
    const result = await createFileOrDirectory.execute({ path: '', type: 'file', content: 'fail' }, brokenContext);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
