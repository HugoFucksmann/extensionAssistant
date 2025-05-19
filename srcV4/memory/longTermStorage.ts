/**
 * Almacenamiento a largo plazo para la arquitectura Windsurf
 * Implementa persistencia de memoria entre sesiones
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Implementa almacenamiento persistente para memorias a largo plazo
 * Utiliza un archivo JSON para almacenar las memorias
 */
export class LongTermStorage {
  private storageFile: string;
  private memories: Map<string, any[]>;
  
  constructor() {
    // Inicializar el almacenamiento
    this.memories = new Map();
    
    // Determinar la ubicación del archivo de almacenamiento
    // En una implementación real, esto se obtendría del contexto de VS Code
    this.storageFile = path.join(__dirname, '..', '..', 'storage', 'long_term_memory.json');
    
    // Crear el directorio si no existe
    const storageDir = path.dirname(this.storageFile);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    // Cargar memorias existentes
    this.loadMemories();
    
    console.log('[LongTermStorage] Initialized');
  }
  
  /**
   * Carga las memorias desde el archivo de almacenamiento
   */
  private loadMemories(): void {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, 'utf8');
        const memoryData = JSON.parse(data);
        
        // Convertir el objeto JSON a un Map
        for (const [key, value] of Object.entries(memoryData)) {
          this.memories.set(key, value as any[]);
        }
        
        console.log(`[LongTermStorage] Loaded ${this.memories.size} memory categories`);
      } else {
        console.log('[LongTermStorage] No existing memory file found, starting fresh');
      }
    } catch (error) {
      console.error('[LongTermStorage] Error loading memories:', error);
      // Si hay un error, comenzar con una memoria limpia
      this.memories.clear();
    }
  }
  
  /**
   * Guarda las memorias en el archivo de almacenamiento
   */
  private saveMemories(): void {
    try {
      // Convertir el Map a un objeto para JSON
      const memoryData: Record<string, any[]> = {};
      for (const [key, value] of this.memories.entries()) {
        memoryData[key] = value;
      }
      
      // Guardar en el archivo
      fs.writeFileSync(this.storageFile, JSON.stringify(memoryData, null, 2), 'utf8');
      console.log('[LongTermStorage] Memories saved successfully');
    } catch (error) {
      console.error('[LongTermStorage] Error saving memories:', error);
    }
  }
  
  /**
   * Almacena insights en la memoria a largo plazo
   * @param chatId ID de la conversación
   * @param insights Insights a almacenar
   * @param metadata Metadatos asociados a los insights
   */
  public async storeInsights(chatId: string, insights: any[], metadata: any): Promise<void> {
    // Preparar los insights con metadatos y timestamp
    const enrichedInsights = insights.map(insight => ({
      ...insight,
      chatId,
      metadata,
      timestamp: Date.now()
    }));
    
    // Obtener la lista actual de insights o crear una nueva
    const currentInsights = this.memories.get('insights') || [];
    
    // Añadir los nuevos insights
    this.memories.set('insights', [...currentInsights, ...enrichedInsights]);
    
    // Guardar en disco
    this.saveMemories();
    
    console.log(`[LongTermStorage] Stored ${insights.length} insights for chat ${chatId}`);
  }
  
  /**
   * Almacena un elemento en la memoria a largo plazo
   * @param category Categoría del elemento
   * @param item Elemento a almacenar
   * @param metadata Metadatos asociados al elemento
   */
  public async store(category: string, item: any, metadata: any = {}): Promise<void> {
    // Preparar el elemento con metadatos y timestamp
    const enrichedItem = {
      ...item,
      metadata,
      timestamp: Date.now()
    };
    
    // Obtener la lista actual de elementos o crear una nueva
    const currentItems = this.memories.get(category) || [];
    
    // Añadir el nuevo elemento
    this.memories.set(category, [...currentItems, enrichedItem]);
    
    // Guardar en disco
    this.saveMemories();
    
    console.log(`[LongTermStorage] Stored item in category ${category}`);
  }
  
  /**
   * Busca elementos en la memoria a largo plazo
   * En una implementación real, esto utilizaría embeddings para búsqueda semántica
   * @param query Query de búsqueda
   * @param limit Número máximo de resultados
   * @param categories Categorías en las que buscar (todas por defecto)
   * @returns Elementos que coinciden con la query
   */
  public async search(query: string, limit: number = 5, categories?: string[]): Promise<any[]> {
    try {
      const results: any[] = [];
      
      // Determinar las categorías en las que buscar
      const categoriesToSearch = categories || Array.from(this.memories.keys());
      
      // Convertir la query a minúsculas para búsqueda insensible a mayúsculas
      const lowerQuery = query.toLowerCase();
      
      // Buscar en cada categoría
      for (const category of categoriesToSearch) {
        const items = this.memories.get(category) || [];
        
        // Búsqueda simple por coincidencia de texto
        // En una implementación real, esto utilizaría embeddings para búsqueda semántica
        const matchingItems = items.filter(item => {
          // Convertir el item a texto para búsqueda
          const itemText = JSON.stringify(item).toLowerCase();
          return itemText.includes(lowerQuery);
        });
        
        results.push(...matchingItems);
      }
      
      // Ordenar por relevancia (en este caso, por timestamp descendente)
      results.sort((a, b) => b.timestamp - a.timestamp);
      
      // Limitar el número de resultados
      return results.slice(0, limit);
    } catch (error) {
      console.error('[LongTermStorage] Error searching memories:', error);
      return [];
    }
  }
  
  /**
   * Elimina una categoría completa de la memoria
   * @param category Categoría a eliminar
   */
  public async deleteCategory(category: string): Promise<void> {
    if (this.memories.has(category)) {
      this.memories.delete(category);
      this.saveMemories();
      console.log(`[LongTermStorage] Deleted category ${category}`);
    }
  }
  
  /**
   * Libera recursos al desactivar la extensión
   */
  public dispose(): void {
    // Asegurarse de que todas las memorias estén guardadas
    this.saveMemories();
    console.log('[LongTermStorage] Disposed');
  }
}
