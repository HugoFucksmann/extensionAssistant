import * as vscode from 'vscode';
import { ToolDefinition } from '../types';

export const respond: ToolDefinition = {
  name: 'respond',
  description: 'Sends a response to the user',
  parameters: {
    message: {
      type: 'string',
      description: 'Message to send to the user',
      required: true
    },
    markdown: {
      type: 'boolean',
      description: 'Whether message is markdown formatted',
      default: true
    },
    showNotification: {
      type: 'boolean',
      description: 'Show notification to user',
      default: false
    },
    updateUI: {
      type: 'boolean',
      description: 'Update the UI with the response',
      default: true
    }
  },
  async execute(params: { message: string; markdown?: boolean; showNotification?: boolean; updateUI?: boolean }) {
    try {
      const { message, markdown = true, showNotification = false, updateUI = true } = params;
      
      if (updateUI) {
        vscode.commands.executeCommand('extensionAssistant.updateResponse', {
          message,
          isMarkdown: markdown
        });
      }
      
      if (showNotification) {
        vscode.window.showInformationMessage(message);
      }
      
      return {
        success: true,
        data: { delivered: true }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};