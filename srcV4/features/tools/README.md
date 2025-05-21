# Módulo de Herramientas

Este módulo proporciona un conjunto de herramientas que pueden ser utilizadas por el asistente para realizar diversas tareas. Las herramientas están organizadas en categorías lógicas para facilitar su uso y mantenimiento.

## Estructura del Módulo

```
tools/
├── editor/           # Herramientas para interactuar con el editor
├── filesystem/       # Operaciones de sistema de archivos
├── project/          # Herramientas de gestión de proyectos
├── baseTool.ts       # Clase base para todas las herramientas
├── types.ts          # Tipos y interfaces compartidos
└── index.ts          # Punto de entrada principal
```

## Uso Básico

### Importar herramientas

```typescript
import { allTools, getToolByName } from './tools';

// Usar una herramienta específica
const readFileTool = getToolByName('readFile');
if (readFileTool) {
  const result = await readFileTool.execute({ path: 'ruta/al/archivo.txt' });
  console.log(result);
}

// Registrar todas las herramientas en un registro
toolRegistry.registerAll(allTools);
```

## Herramientas Disponibles

### Sistema de Archivos

- **readFile**: Lee el contenido de un archivo
  ```typescript
  const result = await readFileTool.execute({ 
    path: 'ruta/al/archivo.txt',
    encoding: 'utf-8' // opcional
  });
  ```

- **writeToFile**: Escribe contenido en un archivo
  ```typescript
  await writeToFileTool.execute({
    path: 'ruta/al/archivo.txt',
    content: 'Contenido del archivo',
    createIfNotExists: true // opcional
  });
  ```

- **listFiles**: Lista archivos en un directorio
  ```typescript
  const result = await listFilesTool.execute({
    path: 'ruta/al/directorio',
    recursive: true // opcional
  });
  ```

### Editor

- **getActiveEditorContent**: Obtiene el contenido del editor activo
  ```typescript
  const result = await getActiveEditorContentTool.execute();
  console.log(result.content);
  ```

- **applyTextEdit**: Aplica ediciones de texto a un documento
  ```typescript
  await applyTextEditTool.execute({
    documentUri: 'file:///ruta/al/archivo.txt', // opcional (usa el editor activo si no se especifica)
    edits: [{
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 5 }
      },
      text: 'Nuevo texto'
    }]
  });
  ```

### Proyecto

- **searchWorkspace**: Busca archivos en el workspace
  ```typescript
  const result = await searchWorkspaceTool.execute({
    pattern: '*.ts',
    maxResults: 50
  });
  ```

- **getProjectInfo**: Obtiene información sobre el proyecto actual
  ```typescript
  const projectInfo = await getProjectInfoTool.execute();
  console.log('Proyecto:', projectInfo.name);
  console.log('Archivos:', projectInfo.stats.totalFiles);
  ```

## Crear una Nueva Herramienta

Para crear una nueva herramienta, sigue estos pasos:

1. Crea un nuevo archivo en la carpeta correspondiente (o crea una nueva si es necesario)
2. Extiende la clase `BaseTool`
3. Implementa las propiedades y métodos requeridos
4. Exporta una instancia de la herramienta

Ejemplo:

```typescript
import { BaseTool } from '../baseTool';

export class MiHerramientaTool extends BaseTool<Parametros, Resultado> {
  static readonly NAME = 'miHerramienta';
  
  readonly name = MiHerramientaTool.NAME;
  readonly description = 'Descripción de mi herramienta';
  
  readonly parameters = {
    // Definir parámetros aquí
  };
  
  async execute(params: Parametros) {
    // Implementar lógica de la herramienta
    return this.success(/* resultado */);
  }
}

// Exportar una instancia de la herramienta
export const miHerramientaTool = new MiHerramientaTool();
```

## Pruebas

Cada herramienta debe tener sus propias pruebas unitarias. Las pruebas deben cubrir:

- Casos de éxito
- Casos de error
- Validación de parámetros
- Comportamiento con entradas inesperadas

## Convenciones

- Los nombres de las herramientas deben ser descriptivos y en camelCase
- Cada herramienta debe tener una descripción clara
- Los parámetros deben estar documentados con su tipo y descripción
- Las herramientas deben manejar errores de manera adecuada
- El código debe seguir las guías de estilo de TypeScript/JavaScript

## Mantenimiento

- Mantener las dependencias actualizadas
- Revisar periódicamente las herramientas para mejoras de rendimiento
- Documentar cambios importantes en el CHANGELOG.md
- Mantener la retrocompatibilidad cuando sea posible
