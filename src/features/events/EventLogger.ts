// src/features/events/EventLogger.ts
import { VSCodeContext } from '../../shared/types';
// import { eventBus } from './EventBus'; // Ya no se usa la instancia global directamente
import { WindsurfEvent } from './eventTypes';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher'; // Nueva importación

export class EventLogger {
  private vscodeOutputChannel: import('vscode').OutputChannel | undefined;
  private dispatcherSubscription?: { unsubscribe: () => void }; // Para guardar la suscripción

  constructor(
    vscodeContext: VSCodeContext, // vscodeContext ahora es requerido
    private dispatcher: InternalEventDispatcher // Inyectar el dispatcher
  ) {
    if (vscodeContext && vscodeContext.outputChannel) {
      this.vscodeOutputChannel = vscodeContext.outputChannel;
    } else {
      // Considerar crear un output channel aquí si no se provee, o lanzar un error.
      console.warn('[EventLogger] VSCodeContext o outputChannel no proporcionado. El logging al output channel de VS Code estará deshabilitado.');
    }

    // Suscribirse a todos los eventos del dispatcher
    this.dispatcherSubscription = this.dispatcher.subscribe('*', (event: WindsurfEvent) => this.logEvent(event));

    this.logToConsole('[EventLogger] Initialized and subscribed to InternalEventDispatcher.');
    if (this.vscodeOutputChannel) {
      this.vscodeOutputChannel.appendLine('[EventLogger] Initialized and subscribed to InternalEventDispatcher.');
    }
  }

  private logEvent(event: WindsurfEvent): void {
    const logMessage = `[Event] Type: ${event.type}, ID: ${event.id}, Timestamp: ${new Date(event.timestamp).toISOString()}`;
    // Evitar serializar payloads muy grandes o complejos en el log principal si es necesario
    let payloadSummary = JSON.stringify(event.payload);
    if (payloadSummary.length > 200) { // Ejemplo de límite
        payloadSummary = payloadSummary.substring(0, 200) + "... (payload truncated)";
    }


    this.logToConsole(logMessage, /* No loguear el payload completo aquí para evitar ruido, solo el resumen */ payloadSummary);
    if (this.vscodeOutputChannel) {
      this.vscodeOutputChannel.appendLine(logMessage);
      // Para el output channel, sí podemos ser más verbosos si se desea
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
      this.dispatcherSubscription = undefined; // Limpiar la referencia
    }

    this.logToConsole('[EventLogger] Disposed (logging stopped).');
    if (this.vscodeOutputChannel) {
      this.vscodeOutputChannel.appendLine('[EventLogger] Disposed (logging stopped).');
    }
  }
}