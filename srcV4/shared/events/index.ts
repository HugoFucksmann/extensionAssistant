// shared/events/index.ts

/**
 * Exportaciones del módulo de eventos
 * Este archivo consolida las exportaciones públicas del módulo 'events'
 */

export * from './types/eventTypes';
export * from './components/eventManager';
export * from './core/eventBus';
export * from './components/eventLogger';
export * from './core/eventBusAdapter';

// Temporal: Solo si windsurfEvents.ts aún es referenciado desde FUERA de este módulo.
// Se recomienda encarecidamente migrar esas referencias para usar directamente EventType
// y eliminar este archivo y esta exportación.
export * from './legacy/windsurfEvents';