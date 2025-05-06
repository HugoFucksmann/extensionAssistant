import * as vscode from 'vscode';

export class ConfigurationManager {
    constructor(private context: vscode.ExtensionContext) {}

    getModelType(): 'ollama' | 'gemini' {
        return this.context.globalState.get('modelType') || 'ollama';
    }

    setModelType(type: 'ollama' | 'gemini'): Thenable<void> {
        return this.context.globalState.update('modelType', type);
    }
}