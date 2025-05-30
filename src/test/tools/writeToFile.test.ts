import { writeToFile } from '../../features/tools/definitions/edit/writeToFile';
import { ToolExecutionContext } from '../../features/tools/types';

describe('writeToFile', () => {
  let writtenContent = '';
  let writtenPath = '';
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
          createDirectory: async (_dirUri: any) => {},
          writeFile: async (targetUri: any, content: Uint8Array) => {
            const path = targetUri.fsPath || targetUri;
            writtenPath = path.replace('/workspace/', '');
            writtenContent = new TextDecoder().decode(content);
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
    writtenContent = '';
    writtenPath = '';
  });

  it('escribe el contenido correctamente', async () => {
    const result = await writeToFile.execute({ path: 'src/test/example.txt', content: 'Hola mundo' }, mockContext);
    expect(result.success).toBe(true);
    expect(writtenPath).toBe('src/test/example.txt');
    expect(writtenContent).toBe('Hola mundo');
  });

  it('falla si no puede resolver el path', async () => {
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
    const result = await writeToFile.execute({ path: '', content: 'fail' }, brokenContext);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
