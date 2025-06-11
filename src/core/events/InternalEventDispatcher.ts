// src/core/events/InternalEventDispatcher.ts
import { EventType, EventPayload, WindsurfEvent, EventFilter } from '../../features/events/eventTypes'; // Reutiliza tus tipos de eventos existentes
import { generateUniqueId } from '../../shared/utils/generateIds';
import EventEmitter from 'eventemitter3';

import { Disposable } from '../interfaces/Disposable';

export class InternalEventDispatcher implements Disposable {
  private emitter: EventEmitter;
  private eventHistory: WindsurfEvent[] = [];
  private maxHistorySize: number = 200;

  constructor() {
    this.emitter = new EventEmitter();

  }


  public dispatch(type: EventType, payload: EventPayload, forcedId?: string): WindsurfEvent {
    const event: WindsurfEvent = {
      type,
      payload: {
        ...payload,
        timestamp: payload.timestamp || Date.now(),
      },
      timestamp: Date.now(),
      id: forcedId || generateUniqueId(),
    };


    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }


    this.emitter.emit(type, event);



    return event;
  }

  public subscribe(
    type: EventType | EventType[] | '*',
    listener: (event: WindsurfEvent) => void
  ): { unsubscribe: () => void } {
    const typesToSubscribe = Array.isArray(type) ? type : [type];

    typesToSubscribe.forEach(t => {
      this.emitter.on(t, listener);
    });

    return {
      unsubscribe: () => {
        typesToSubscribe.forEach(t => {
          this.emitter.off(t, listener);
        });
      },
    };
  }

  public once(
    type: EventType,
    listener: (event: WindsurfEvent) => void
  ): { unsubscribe: () => void } {
    this.emitter.once(type, listener);
    return {
      unsubscribe: () => {
        this.emitter.off(type, listener);
      }
    }
  }



  public getEventHistory(filter?: EventFilter): WindsurfEvent[] {
    if (!filter) {
      return [...this.eventHistory];
    }
    return this.eventHistory.filter(event => this.passesFilter(event, filter));
  }

  private passesFilter(event: WindsurfEvent, filter: EventFilter): boolean {

    if (filter.types && !filter.types.includes(event.type)) return false;
    if (filter.chatId && event.payload.chatId !== filter.chatId) return false;

    return true;
  }


  public dispose(): void {
    this.emitter.removeAllListeners();
    this.eventHistory = [];
    console.log('[InternalEventDispatcher] Disposed and all listeners removed.');
  }


  public systemInfo(message: string, details?: Record<string, any>, source?: string): void {
    this.dispatch(EventType.SYSTEM_INFO, { message, details, source, level: 'info' });
  }

  public systemWarning(message: string, details?: Record<string, any>, source?: string): void {
    this.dispatch(EventType.SYSTEM_WARNING, { message, details, source, level: 'warning' });
  }

  public systemError(message: string, error?: Error, details?: Record<string, any>, source?: string): void {
    this.dispatch(EventType.SYSTEM_ERROR, {
      message,
      error: error?.message,
      details,
      source,
      level: 'error'
    });
  }
}