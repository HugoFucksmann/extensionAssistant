// src/tools/core/toolRegistry.ts

/**
 * @file toolRegistry.ts
 * * Responsabilidad: Registrar y gestionar todas las herramientas disponibles en el sistema.
 * Permite buscar herramientas por nombre o categoría y obtener una lista
 * de las herramientas disponibles con sus metadatos.
 */

import { LoggerService } from '../../utils/logger'; // Asumiendo ubicación de Logger
import { Tool } from './toolInterface';

/**
 * Define la estructura de la información retornada al listar herramientas.
 * (Corresponde a la 'Respuesta Estructurada' de la especificación)
 */
export interface ToolListing {
  name: string;
  description: string;
  category: string;
  parameterSchema: object;
}

/**
 * Clase para registrar y acceder a las herramientas disponibles.
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private logger: LoggerService;

  constructor(logger: LoggerService) {
    this.logger = logger;
  }

  /**
   * Registra una nueva instancia de herramienta en el registro.
   * @param tool La instancia de la herramienta a registrar.
   * @throws Error si ya existe una herramienta con el mismo nombre.
   */
  public registerTool(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      const errorMsg = `Tool registration conflict: A tool with the name '${tool.name}' already exists.`;
      this.logger.error('ToolRegistry: ' + errorMsg);
      throw new Error(errorMsg);
    }
    this.tools.set(tool.name, tool);
    this.logger.info(`ToolRegistry: Registered tool '${tool.name}' in category '${tool.category}'.`);
  }

  /**
   * Registra múltiples herramientas a la vez.
   * @param tools Un array de instancias de herramientas a registrar.
   */
  public registerTools(tools: Tool[]): void {
    tools.forEach(tool => {
      try {
        this.registerTool(tool);
      } catch (error) {
        // Log y continúa registrando las demás si una falla
        this.logger.error(`ToolRegistry: Failed to register tool '${tool?.name || 'unknown'}'.`, { error });
      }
    });
  }

  /**
   * Obtiene una instancia de herramienta por su nombre.
   * @param name El nombre único de la herramienta.
   * @returns La instancia de la herramienta si se encuentra, o `null` si no existe.
   */
  public getByName(name: string): Tool | null {
    const tool = this.tools.get(name);
    if (!tool) {
       this.logger.warn(`ToolRegistry: Tool '${name}' not found.`);
       return null;
    }
    return tool;
  }

  /**
   * Obtiene una lista de todas las herramientas que pertenecen a una categoría específica.
   * @param category El nombre de la categoría.
   * @returns Un array con las instancias de herramientas encontradas en esa categoría.
   */
  public getByCategory(category: string): Tool[] {
    const categoryTools: Tool[] = [];
    this.tools.forEach(tool => {
      if (tool.category === category) {
        categoryTools.push(tool);
      }
    });
    return categoryTools;
  }

  /**
   * Obtiene una lista de información resumida sobre todas las herramientas registradas.
   * Corresponde a la 'Respuesta Estructurada' definida en la especificación.
   * @returns Un array de objetos ToolListing.
   */
  public getAvailableTools(): ToolListing[] {
    const toolList: ToolListing[] = [];
    this.tools.forEach(tool => {
      toolList.push({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        parameterSchema: tool.getParameterSchema(),
      });
    });
    return toolList;
  }

  /**
   * Obtiene una lista de todas las categorías únicas de herramientas registradas.
   * @returns Un array de strings con los nombres de las categorías.
   */
  public getCategories(): string[] {
    const categories = new Set<string>();
    this.tools.forEach(tool => categories.add(tool.category));
    return Array.from(categories);
  }
}
