import { writeToFile } from '../../features/tools/definitions/edit/writeToFile';
import { ToolExecutionContext } from '../../features/tools/types';

describe('writeToFile', () => {
  let writtenContent = '';
  let writtenPath = '';
  const mockContext: ToolExecutionContext = {
    vscodeAPI: {
      workspace: {
        asRelativePath: (uri: any) => uri.fsPath || uri,
        fs: {
          createDirectory: async (_dirUri: any) => {},
          writeFile: async (targetUri: any, content: Uint8Array) => {
            writtenPath = targetUri.fsPath || targetUri;
            writtenContent = new TextDecoder().decode(content);
          },
        },
      },
    },
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
          ...mockContext.vscodeAPI.workspace,
          asRelativePath: () => '',
        },
      },
    } as any;
    const result = await writeToFile.execute({ path: '', content: 'fail' }, brokenContext);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
