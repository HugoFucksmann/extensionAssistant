
import { VSCodeContext } from '../../shared/types';

import { WindsurfEvent } from './eventTypes';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';

export class EventLogger {
  private vscodeOutputChannel: import('vscode').OutputChannel | undefined;
  private dispatcherSubscription?: { unsubscribe: () => void }; 

  constructor(
    vscodeContext: VSCodeContext, 
    private dispatcher: InternalEventDispatcher 
  ) {
    if (vscodeContext && vscodeContext.outputChannel) {
      this.vscodeOutputChannel = vscodeContext.outputChannel;
    } else {
    
      console.warn('[EventLogger] VSCodeContext o outputChannel no proporcionado. El logging al output channel de VS Code estará deshabilitado.');
    }

  
    this.dispatcherSubscription = this.dispatcher.subscribe('*', (event: WindsurfEvent) => this.logEvent(event));

    this.logToConsole('[EventLogger] Initialized and subscribed to InternalEventDispatcher.');
    if (this.vscodeOutputChannel) {
      this.vscodeOutputChannel.appendLine('[EventLogger] Initialized and subscribed to InternalEventDispatcher.');
    }
  }

  private logEvent(event: WindsurfEvent): void {
    const logMessage = `[Event] Type: ${event.type}, ID: ${event.id}, Timestamp: ${new Date(event.timestamp).toISOString()}`;
   
    let payloadSummary = JSON.stringify(event.payload);
    if (payloadSummary.length > 200) { // Ejemplo de límite
        payloadSummary = payloadSummary.substring(0, 200) + "... (payload truncated)";
    }


    this.logToConsole(logMessage,  payloadSummary);
    if (this.vscodeOutputChannel) {
      this.vscodeOutputChannel.appendLine(logMessage);
     
      const payloadString = JSON.stringify(event.payload, null, 2);
      this.vscodeOutputChannel.appendLine(`Payload: ${payloadString}`);
      this.vscodeOutputChannel.appendLine('---');
    }
  }

  private logToConsole(message: string, ...optionalParams: any[]): void {
    console.log(message, ...optionalParams);
  }

  public dispose(): void {
    if (this.dispatcherSubscription) {
      this.dispatcherSubscription.unsubscribe();
      this.dispatcherSubscription = undefined;
    }

    this.logToConsole('[EventLogger] Disposed (logging stopped).');
    if (this.vscodeOutputChannel) {
      this.vscodeOutputChannel.appendLine('[EventLogger] Disposed (logging stopped).');
    }
  }
}