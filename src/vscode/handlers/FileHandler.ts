import { WebviewMessage } from 'src/ui/types/WebviewTypes';
import * as vscode from 'vscode';
import { EventBus } from '../../features/events/EventBus';

export class FileHandler {
    private eventBus: EventBus;
    private disposed: boolean = false;

    constructor(
        private postMessage: (type: string, payload: any) => void
    ) {
        this.eventBus = EventBus.getInstance();
    }

    public async handleGetFileContents(message: WebviewMessage): Promise<void> {
        if (this.disposed) return;

        const { payload } = message;
        const filePath = payload.filePath as string;

        try {
            const uri = vscode.Uri.file(filePath);
            const content = await vscode.workspace.fs.readFile(uri);
            const text = new TextDecoder().decode(content);
            this.postMessage('extension:fileContentsLoaded', { filePath, content: text });
        } catch (error: any) {
            this.eventBus.error('Failed to read file', error, { filePath }, 'FileHandler');
            this.postMessage('extension:systemError', { 
                message: `Failed to read file: ${filePath}. ${error.message}`, 
                source: 'FileHandler' 
            });
        }
    }

    public async handleGetProjectFiles(): Promise<void> {
        if (this.disposed) return;

        try {
            const files: string[] = [];
            if (vscode.workspace.workspaceFolders) {
                for (const folder of vscode.workspace.workspaceFolders) {
                    const pattern = new vscode.RelativePattern(folder, '**/*');
                    const uris = await vscode.workspace.findFiles(
                        pattern,
                        '{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.vscode-test/**}'
                    );
                    files.push(...uris.map(uri => uri.fsPath));
                }
            }
            this.postMessage('extension:projectFilesLoaded', { files });
        } catch (error: any) {
            this.eventBus.error('Failed to get project files', error, {}, 'FileHandler');
            this.postMessage('extension:systemError', { 
                message: 'Failed to get project files.', 
                source: 'FileHandler' 
            });
        }
    }

    public dispose(): void {
        this.disposed = true;
    }
}
