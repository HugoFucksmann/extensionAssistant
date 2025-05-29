import { getProjectSummary } from '../../features/tools/definitions/workspace/getProjectSummary';
import { ToolExecutionContext } from '../../features/tools/types';

describe('getProjectSummary', () => {
  const mockContext: ToolExecutionContext = {
    vscodeAPI: {
      workspace: {
        workspaceFolders: [
          { 
            name: 'workspace', 
            uri: { 
              fsPath: '/workspace',
              toString: () => 'file:///workspace'
            } 
          }
        ],
        asRelativePath: (uri: any) => uri.fsPath || uri,
        findFiles: async () => [
          { fsPath: '/workspace/index.ts', toString: () => 'file:///workspace/index.ts' },
          { fsPath: '/workspace/package.json', toString: () => 'file:///workspace/package.json' },
          { fsPath: '/workspace/src', toString: () => 'file:///workspace/src' },
          { fsPath: '/workspace/.git', toString: () => 'file:///workspace/.git' }
        ],
        fs: {
          readFile: async (uri: any) => {
            if (uri.fsPath.endsWith('package.json')) {
              return new TextEncoder().encode('{"name":"my-project","version":"1.0.0"}');
            }
            throw new Error('File not found');
          },
          readDirectory: async (uri: any) => [
            ['src', 1], // Directory
            ['index.ts', 2], // File
            ['package.json', 2], // File
            ['.git', 1] // Directory
          ],
          FileType: {
            File: 2,
            Directory: 1,
            SymbolicLink: 4,
            Unknown: 0
          }
        },
      },
    },
  } as any;

  it('devuelve un resumen del proyecto', async () => {
    const result = await getProjectSummary.execute({}, mockContext);
    console.log('Resultado completo:', JSON.stringify(result, null, 2));
    expect(result.success).toBe(true);
    expect(result.data?.projectName).toBeDefined();
    expect(result.data?.rootPath).toBeDefined();
    expect(Array.isArray(result.data?.topLevelStructure)).toBe(true);
  });

  it('devuelve null si no hay workspace', async () => {
    const contextNoWs = {
      vscodeAPI: {
        workspace: {
          workspaceFolders: [],
        },
      },
    } as any;
    const result = await getProjectSummary.execute({}, contextNoWs);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});
