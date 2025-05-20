# Arquitectura Modular de Windsurf

## Visión General

La arquitectura de Windsurf está diseñada siguiendo principios de modularidad, desacoplamiento y patrones de diseño sólidos. Esta documentación describe la arquitectura modular implementada, sus componentes principales y cómo interactúan entre sí.

## Componentes Principales

### 1. Controlador Principal (WindsurfController)

El `WindsurfController` actúa como orquestador central de la aplicación, coordinando la interacción entre todos los componentes. Implementa el patrón Singleton y recibe sus dependencias a través de la Factory de Componentes.

Responsabilidades:
- Gestionar el ciclo de vida de las conversaciones
- Coordinar el flujo del ciclo ReAct
- Emitir eventos relevantes durante el procesamiento
- Gestionar el estado de la aplicación

### 2. Factory de Componentes (ComponentFactory)

La `ComponentFactory` centraliza la creación e inicialización de todos los componentes del sistema. Implementa el patrón Singleton y proporciona métodos para obtener instancias de los diferentes componentes.

Responsabilidades:
- Crear y configurar componentes
- Gestionar dependencias
- Facilitar la inyección de dependencias
- Respetar los feature flags para alternar entre implementaciones

### 3. Adaptadores

Los adaptadores implementan las interfaces definidas en el sistema y adaptan los componentes existentes a la nueva arquitectura. Esto permite una migración gradual y controlada.

Adaptadores implementados:
- `ToolRegistryAdapter`: Adapta el registro de herramientas
- `MemoryManagerAdapter`: Adapta el gestor de memoria
- `ModelManagerAdapter`: Adapta el gestor de modelos
- `ReActGraphAdapter`: Adapta el grafo ReAct
- `EventBusAdapter`: Adapta el bus de eventos

### 4. Sistema de Eventos

El sistema de eventos permite la comunicación desacoplada entre componentes. Incluye:
- `EventBus`: Bus centralizado para la emisión y recepción de eventos
- `EventManager`: Gestiona el historial de eventos y proporciona capacidades de filtrado
- `EventLogger`: Registra eventos en diferentes niveles (debug, info, warn, error)
- `EventTypes`: Define los tipos de eventos estándar en el sistema

### 5. Feature Flags

Los feature flags permiten habilitar/deshabilitar características de forma controlada, facilitando la migración gradual entre arquitecturas.

## Flujo de Datos

1. El usuario envía un mensaje a través de la UI
2. El `WindsurfController` recibe el mensaje y lo procesa
3. El controlador utiliza los diferentes componentes (obtenidos a través de la Factory) para procesar el mensaje
4. El grafo ReAct ejecuta el ciclo de razonamiento, acción, reflexión y corrección
5. Los eventos se emiten en puntos clave del proceso
6. La respuesta generada se devuelve al usuario

## Patrones de Diseño Utilizados

- **Singleton**: Para componentes que deben tener una única instancia (Controller, Factory, EventBus)
- **Factory**: Para centralizar la creación de componentes
- **Adapter**: Para adaptar componentes existentes a las nuevas interfaces
- **Observer**: Para la comunicación basada en eventos
- **Dependency Injection**: Para facilitar las pruebas y el desacoplamiento

## Migración entre Arquitecturas

La migración entre la arquitectura antigua y la nueva se controla mediante feature flags. Esto permite:

1. Habilitar/deshabilitar componentes específicos
2. Probar la nueva arquitectura en entornos controlados
3. Realizar una migración gradual y segura
4. Volver a la arquitectura anterior en caso de problemas

## Diagrama de Componentes

```
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│      UI         │────▶│ WindsurfController│────▶│ ComponentFactory│
└─────────────────┘     └───────────────────┘     └─────────────────┘
                                 │                          │
                                 ▼                          ▼
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   EventBus      │◀───▶│  Adaptadores      │◀────│FeatureFlags     │
└─────────────────┘     └───────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌───────────────────┐
                        │  Componentes      │
                        │  Originales       │
                        └───────────────────┘
```

## Extensibilidad

La arquitectura está diseñada para ser extensible:

1. Nuevos componentes pueden ser añadidos fácilmente a la Factory
2. Nuevos adaptadores pueden implementar las interfaces existentes
3. Nuevos eventos pueden ser definidos y emitidos
4. Nuevas características pueden ser controladas mediante feature flags
