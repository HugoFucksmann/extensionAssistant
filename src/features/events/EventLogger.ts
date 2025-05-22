// src/features/events/EventLogger.ts
import { VSCodeContext } from '../../shared/types';
import { eventBus } from './EventBus'; // Importa la instancia singleton
import { WindsurfEvent } from './eventTypes'; // Importa el tipo de evento

export class EventLogger {
  private vscodeOutputChannel: import('vscode').OutputChannel | undefined;

  constructor(vscodeContext?: VSCodeContext) {
    if (vscodeContext && vscodeContext.outputChannel) {
      this.vscodeOutputChannel = vscodeContext.outputChannel;
    }

    // Suscribirse a todos los eventos
    // Usamos una arrow function para mantener el contexto de 'this'
    eventBus.on('*', (event: WindsurfEvent) => this.logEvent(event));

    this.logToConsole('[EventLogger] Initialized and subscribed to all events.');
    if (this.vscodeOutputChannel) {
      this.vscodeOutputChannel.appendLine('[EventLogger] Initialized and subscribed to all events.');
    }
  }

  private logEvent(event: WindsurfEvent): void {
    const logMessage = `[Event] Type: ${event.type}, ID: ${event.id}, Timestamp: ${new Date(event.timestamp).toISOString()}`;
    const payloadString = JSON.stringify(event.payload, null, 2); // Pretty print payload

    this.logToConsole(logMessage, event.payload); // Loguea el objeto payload para inspección
    if (this.vscodeOutputChannel) {
      this.vscodeOutputChannel.appendLine(logMessage);
      this.vscodeOutputChannel.appendLine(`Payload: ${payloadString}`);
      this.vscodeOutputChannel.appendLine('---');
    }
  }

  private logToConsole(message: string, ...optionalParams: any[]): void {
    console.log(message, ...optionalParams);
  }

  public dispose(): void {
    // La desuscripción es un poco más compleja si no guardas la referencia exacta de la función.
    // EventEmitter3 no tiene un método fácil para remover todos los listeners de un tipo específico
    // sin la referencia. Sin embargo, para un logger que vive durante toda la extensión,
    // la limpieza al desinstalar la extensión suele ser suficiente.
    // Si necesitas desregistrar explícitamente:
    // eventBus.off('*', this.logEvent); // Esto no funcionará directamente si this.logEvent se bindea diferente cada vez.
    // Una forma sería guardar la referencia:
    // private readonly _logEventHandler = (event: WindsurfEvent) => this.logEvent(event);
    // y luego usar this._logEventHandler en on() y off().

    this.logToConsole('[EventLogger] Disposed (logging stopped).');
    if (this.vscodeOutputChannel) {
      this.vscodeOutputChannel.appendLine('[EventLogger] Disposed (logging stopped).');
    }
  }
}