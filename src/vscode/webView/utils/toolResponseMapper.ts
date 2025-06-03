import { ToolResult } from '../../../features/tools/types';
import { ActiveEditorInfo } from '../../../features/tools/definitions/edit/getActiveEditorInfo';

export interface ToolOutput {
  title: string;
  summary: string;
  details: string;
  items: any[];
  meta: Record<string, any>;
}

// Función auxiliar para formatear el tiempo de ejecución
export function formatExecutionTime(ms: number | undefined | null): string {
  if (ms === undefined || ms === null || ms < 0) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function mapToolResponse<T>(
  toolName: string,
  result: ToolResult<T>
): ToolOutput {
  const finalExecutionTime = result.executionTime;

  if (!result.success) {
    return {
      title: `Error en ${toolName}`,
      summary: result.error || 'Ocurrió un error al ejecutar la herramienta.',
      details: result.error || 'Error desconocido.',
      items: [],
      meta: {
        executionTime: formatExecutionTime(finalExecutionTime),
        success: false,
        error: result.error,
        warnings: result.warnings,
      }
    };
  }

  // Mapeador específico para getActiveEditorInfo
  if (toolName === 'getActiveEditorInfo' && result.data) {
    const data = result.data as unknown as ActiveEditorInfo | null; // Cast to allow null check
    if (data === null) { // Handle case where getActiveEditorInfo returns success:true, data:null (e.g. no workspace)
      return {
        title: 'Editor activo',
        summary: 'No hay información de editor activo disponible.',
        details: 'No se encontró un editor activo o información relevante.',
        items: [],
        meta: {
          executionTime: formatExecutionTime(finalExecutionTime),
          success: true, // The tool itself might have succeeded in determining no editor
          warnings: result.warnings,
        }
      };
    }
    return {
      title: 'Editor activo',
      summary: data.filePath ? `Información de '${data.filePath}' obtenida.` : 'Información del editor obtenida.',
      details: `Archivo: ${data.filePath || 'Sin archivo (ej. nuevo editor sin guardar)'}\n` +
        `Lenguaje: ${data.languageId || 'Desconocido'}\n` +
        `Líneas: ${data.lineCount}\n` +
        `Selección: ${data.selection && !data.selection.isEmpty ? `'${data.selection.text.substring(0, 50)}${data.selection.text.length > 50 ? '...' : ''}'` : (data.selection?.isEmpty ? 'Vacía' : 'No')}`,
      items: [],
      meta: {
        filePath: data.filePath,
        languageId: data.languageId,
        lineCount: data.lineCount,
        hasSelection: !!data.selection,
        selectionIsEmpty: data.selection?.isEmpty,
        executionTime: formatExecutionTime(finalExecutionTime),
        success: true,
        warnings: result.warnings,
      }
    };
  }

  // Mapeador por defecto para otras herramientas exitosas
  let summary = 'Operación completada exitosamente.';
  let details = result.data !== undefined ? JSON.stringify(result.data, null, 2) : 'Operación completada sin datos de retorno específicos.';
  let items: any[] = [];

  if (result.data && typeof result.data === 'object') {
    if ('message' in result.data && typeof (result.data as any).message === 'string') {
      summary = (result.data as any).message;
    } else if ('summary' in result.data && typeof (result.data as any).summary === 'string') {
      summary = (result.data as any).summary;
    } else if (Array.isArray(result.data)) {
      summary = `Operación completada. Se procesaron ${result.data.length} ${result.data.length === 1 ? 'elemento' : 'elementos'}.`;
      items = result.data;
      if (result.data.length === 0) summary = 'Operación completada. No se procesaron elementos.';
    } else if (Object.keys(result.data).length === 1 && typeof Object.values(result.data)[0] === 'string') {
      summary = `${Object.keys(result.data)[0]}: ${Object.values(result.data)[0]}`;
    } else if (Object.keys(result.data).length > 0) {
      summary = `Operación completada. Datos recibidos.`;
    }
  } else if (typeof result.data === 'string') {
    summary = result.data.substring(0, 200) + (result.data.length > 200 ? '...' : '');
    details = result.data;
  } else if (result.data === undefined || result.data === null) {
    summary = 'Operación completada sin datos de retorno específicos.';
    details = 'Sin datos.';
  }

  // Limit details length to avoid overly long messages in UI
  if (details.length > 1000) {
    details = details.substring(0, 1000) + "\n... (contenido truncado)";
  }


  return {
    title: `Resultado de ${toolName}`,
    summary: summary,
    details: details,
    items: items.length > 0 ? items : (Array.isArray(result.data) ? result.data : (result.data !== undefined && result.data !== null ? [result.data] : [])),
    meta: {
      executionTime: formatExecutionTime(finalExecutionTime),
      success: true,
      warnings: result.warnings,
    }
  };
}