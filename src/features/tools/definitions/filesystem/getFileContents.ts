// src/features/tools/definitions/filesystem/getFileContents.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { z } from 'zod';
import { ToolDefinition, ToolResult,  } from '../../types';
import { 
  resolveFilePath, 
  findFilesByName, 
  getWorkspaceFilesList, 
} from '../../../../shared/utils/pathUtils';

// Esquema Zod para los parámetros
export const getFileContentsParamsSchema = z.object({
  path: z.string().min(1, { message: "File path cannot be empty." }),
  
  searchByName: z.boolean().optional().describe("If true, search for the file by name instead of path"),
 
  fuzzyMatch: z.boolean().optional().describe("If true, use fuzzy matching when searching by name")
}).strict(); 

export const getFileContents: ToolDefinition<typeof getFileContentsParamsSchema, { filePath: string; content: string; availableFiles?: string[] }> = {
  uiFeedback: true,
  name: 'getFileContents',
  description: 'Gets the content of a specified file. The path can be absolute or relative to the workspace root. If the file is not found, the tool will attempt to search for it in the workspace. You can also search by filename using the searchByName parameter.',
  parametersSchema: getFileContentsParamsSchema,
  async execute(
    params, 
    context 
  ): Promise<ToolResult<{ filePath: string; content: string; availableFiles?: string[] }>> {
    const { path: requestedPath, searchByName = false, fuzzyMatch = false } = params;
    let fileUri: vscode.Uri | undefined;

    try {
      
      const availableFiles = await getWorkspaceFilesList(context.vscodeAPI, 30);
      
    
      if (searchByName) {
    
        const fileName = path.basename(requestedPath);
        const searchResults = await findFilesByName(context.vscodeAPI, fileName, fuzzyMatch);
        
        if (searchResults.length === 0) {
        
          return { 
            success: false, 
            error: `File not found in workspace: ${fileName}`, 
            data: { 
              filePath: requestedPath, 
              content: '', 
              availableFiles: availableFiles.slice(0, 10)
            }
          };
        } else if (searchResults.length === 1) {
      
          fileUri = searchResults[0].uri;
        } else {
        
          const matchingFiles = searchResults.map(r => r.relativePath);
          
          return { 
            success: false, 
            error: `Multiple files found with name "${fileName}". Please specify a more precise path.`, 
            data: { 
              filePath: requestedPath, 
              content: '', 
              availableFiles: matchingFiles 
            }
          };
        }
      } else {
       
        fileUri = await resolveFilePath(context.vscodeAPI, requestedPath);
        
        if (!fileUri) {
         
          const fileName = path.basename(requestedPath);
          const searchResults = await findFilesByName(context.vscodeAPI, fileName, false);
          
          if (searchResults.length === 0) {
           
            return { 
              success: false, 
              error: `File not found: ${requestedPath}`, 
              data: { 
                filePath: requestedPath, 
                content: '', 
                availableFiles: availableFiles.slice(0, 10) 
              }
            };
          } else if (searchResults.length === 1) {
            fileUri = searchResults[0].uri;
          } else {
            const matchingFiles = searchResults.map(r => r.relativePath);
            
            return { 
              success: false, 
              error: `Multiple files found that match "${fileName}". Please specify a more precise path.`, 
              data: { 
                filePath: requestedPath, 
                content: '', 
                availableFiles: matchingFiles 
              }
            };
          }
        }
      }

     
      const fileContentUint8Array = await context.vscodeAPI.workspace.fs.readFile(fileUri);
      const content = new TextDecoder().decode(fileContentUint8Array);
      
   
      const relativePath = context.vscodeAPI.workspace.asRelativePath(fileUri, false);
      return { 
        success: true, 
        data: { 
          filePath: relativePath, 
          content,
       
          availableFiles: await getSimilarFiles(context.vscodeAPI, fileUri)
        } 
      };
    } catch (error: any) {
   
      const availableFiles = await getWorkspaceFilesList(context.vscodeAPI, 15);
      
     
      return { 
        success: false, 
        error: `Failed to get file contents for "${requestedPath}": ${error.message}`,
        data: {
          filePath: requestedPath,
          content: '',
          availableFiles
        }
      };
    }
  }
};

/**
 * Obtiene archivos similares o relacionados al archivo actual
 * @param vscodeAPI API de VS Code
 * @param fileUri URI del archivo actual
 * @returns Lista de rutas relativas de archivos similares
 */
async function getSimilarFiles(vscodeAPI: typeof vscode, fileUri: vscode.Uri): Promise<string[]> {
  try {
   
    const relativePath = vscodeAPI.workspace.asRelativePath(fileUri, false);
    const dirName = path.dirname(relativePath);
    
  
    const pattern = `${dirName}/**`;
    const filesInSameDir = await vscodeAPI.workspace.findFiles(pattern, '**/node_modules/**', 10);
    
   
    return filesInSameDir
      .map(uri => vscodeAPI.workspace.asRelativePath(uri, false))
      .filter(path => path !== relativePath);
  } catch (error) {
    console.error('Error getting similar files:', error);
    return [];
  }
}
