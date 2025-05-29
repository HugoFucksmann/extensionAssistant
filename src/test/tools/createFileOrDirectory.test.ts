import { createFileOrDirectory } from '../../features/tools/definitions/filesystem/createFileOrDirectory';
import { ToolExecutionContext } from '../../features/tools/types';

describe('createFileOrDirectory', () => {
  let createdPath = '';
  let createdType = '';
  let createdContent = '';
  const mockContext: ToolExecutionContext = {
    vscodeAPI: {
      workspace: {
        asRelativePath: (uri: any) => uri.fsPath || uri,
        fs: {
          createDirectory: async (_dirUri: any) => {},
          writeFile: async (targetUri: any, content: Uint8Array) => {
            createdPath = targetUri.fsPath || targetUri;
            createdContent = new TextDecoder().decode(content);
          },
          stat: async (_uri: any) => ({}),
        },
      },
    },
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
          ...mockContext.vscodeAPI.workspace,
          asRelativePath: () => '',
        },
      },
    } as any;
    const result = await createFileOrDirectory.execute({ path: '', type: 'file', content: 'fail' }, brokenContext);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
