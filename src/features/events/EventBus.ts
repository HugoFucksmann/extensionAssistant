/**
 * Unified EventBus for the Windsurf architecture
 * Single event system replacing all legacy implementations
 */

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { EventType, EventPayload, WindsurfEvent, EventFilter } from './eventTypes';

/**
 * EventBus configuration options
 */
interface EventBusOptions {
  maxHistorySize?: number;
  enableDebugLogging?: boolean;
  enableEventReplay?: boolean;
}

/**
 * Unified EventBus implementing singleton pattern
 */
export class EventBus extends EventEmitter {
  private static instance: EventBus;
  private eventHistory: WindsurfEvent[] = [];
  private options: EventBusOptions;
  private listenerMap: Map<string, { type: EventType | '*', listener: Function }> = new Map();

  private constructor(options: EventBusOptions = {}) {
    super();
    this.options = {
      maxHistorySize: 1000,
      enableDebugLogging: false,
      enableEventReplay: true,
      ...options
    };

    if (this.options.enableDebugLogging) {
      console.log('[EventBus] Initialized with unified event handling');
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(options?: EventBusOptions): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus(options);
    }
    return EventBus.instance;
  }

  /**
   * Emit an event with typed payload
   */
  public emitEvent(type: EventType, payload: EventPayload = {}): WindsurfEvent {
    const event: WindsurfEvent = {
      type,
      payload: {
        ...payload,
        timestamp: payload.timestamp || Date.now()
      },
      timestamp: Date.now(),
      id: uuidv4()
    };

    // Store in history
    this.storeEvent(event);

    // Debug logging
    if (this.options.enableDebugLogging) {
      console.log(`[EventBus] ${type}`, event.payload);
    }

    // Emit to specific listeners
    this.emit(type, event);
    
    // Emit to wildcard listeners
    this.emit('*', event);

    return event;
  }

  /**
   * Register event listener with optional filter
   */
  public onEvent(
    type: EventType | EventType[] | '*',
    listener: (event: WindsurfEvent) => void,
    filter?: EventFilter
  ): string {
    const listenerId = uuidv4();

    // Create wrapped listener with filter
    const wrappedListener = (event: WindsurfEvent) => {
      if (!filter || this.passesFilter(event, filter)) {
        listener(event);
      }
    };

    // Register for multiple types or single type
    if (Array.isArray(type)) {
      type.forEach(t => {
        this.on(t, wrappedListener);
        this.listenerMap.set(listenerId, { type: t, listener: wrappedListener });
      });
    } else {
      this.on(type, wrappedListener);
      this.listenerMap.set(listenerId, { type, listener: wrappedListener });
    }

    return listenerId;
  }

  /**
   * Register one-time event listener
   */
  public onceEvent(
    type: EventType | EventType[] | '*',
    listener: (event: WindsurfEvent) => void,
    filter?: EventFilter
  ): string {
    const listenerId = uuidv4();

    const wrappedListener = (event: WindsurfEvent) => {
      if (!filter || this.passesFilter(event, filter)) {
        listener(event);
        this.offEvent(listenerId);
      }
    };

    if (Array.isArray(type)) {
      type.forEach(t => {
        this.once(t, wrappedListener);
        this.listenerMap.set(listenerId, { type: t, listener: wrappedListener });
      });
    } else {
      this.once(type, wrappedListener);
      this.listenerMap.set(listenerId, { type, listener: wrappedListener });
    }

    return listenerId;
  }

  /**
   * Remove listener by ID
   */
  public offEvent(listenerId: string): void {
    const listenerInfo = this.listenerMap.get(listenerId);
    if (listenerInfo) {
      this.removeListener(listenerInfo.type as string, listenerInfo.listener as any);
      this.listenerMap.delete(listenerId);
    }
  }

  /**
   * Get event history with optional filter
   */
  public getEventHistory(filter?: EventFilter): WindsurfEvent[] {
    if (!filter) {
      return [...this.eventHistory];
    }
    return this.eventHistory.filter(event => this.passesFilter(event, filter));
  }

  /**
   * Clear event history
   */
  public clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Replay events from history
   */
  public async replayEvents(filter?: EventFilter, speed: number = 1): Promise<void> {
    if (!this.options.enableEventReplay) {
      throw new Error('Event replay is disabled');
    }

    const events = this.getEventHistory(filter).sort((a, b) => a.timestamp - b.timestamp);
    if (events.length === 0) return;

    const startTime = events[0].timestamp;
    const replayStartTime = Date.now();

    for (const event of events) {
      const originalDelay = event.timestamp - startTime;
      const replayDelay = originalDelay / speed;
      const elapsedReplayTime = Date.now() - replayStartTime;
      const waitTime = Math.max(0, replayDelay - elapsedReplayTime);

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Emit as replay
      const replayEvent = {
        ...event,
        payload: { ...event.payload, isReplay: true }
      };

      this.emit(event.type, replayEvent);
      this.emit('*', replayEvent);
    }
  }

  /**
   * Convenience methods for system events
   */
  public info(message: string, details?: Record<string, any>, source?: string): void {
    this.emitEvent(EventType.SYSTEM_INFO, { message, details, source, level: 'info' });
  }

  public warn(message: string, details?: Record<string, any>, source?: string): void {
    this.emitEvent(EventType.SYSTEM_WARNING, { message, details, source, level: 'warning' });
  }

  public error(message: string, error?: Error, details?: Record<string, any>, source?: string): void {
    this.emitEvent(EventType.SYSTEM_ERROR, {
      message,
      error: error?.message,
      stack: error?.stack,
      details,
      source,
      level: 'error'
    });
  }

  /**
   * Legacy compatibility methods
   */
  public emit(event: string | symbol, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public once(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.once(event, listener);
  }

  /**
   * Store event in history
   */
  private storeEvent(event: WindsurfEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.options.maxHistorySize!) {
      this.eventHistory.shift();
    }
  }

  /**
   * Check if event passes filter
   */
  private passesFilter(event: WindsurfEvent, filter: EventFilter): boolean {
    if (filter.types && !filter.types.includes(event.type)) {
      return false;
    }

    if (filter.chatId && event.payload.chatId !== filter.chatId) {
      return false;
    }

    if (filter.timeRange) {
      if (filter.timeRange.start && event.timestamp < filter.timeRange.start) {
        return false;
      }
      if (filter.timeRange.end && event.timestamp > filter.timeRange.end) {
        return false;
      }
    }

    if (filter.custom && !filter.custom(event)) {
      return false;
    }

    return true;
  }

  /**
   * Dispose and cleanup
   */
  public dispose(): void {
    this.removeAllListeners();
    this.listenerMap.clear();
    this.eventHistory = [];
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();