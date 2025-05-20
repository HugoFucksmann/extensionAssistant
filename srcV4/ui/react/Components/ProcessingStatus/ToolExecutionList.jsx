import React, { useState } from 'react';
import { styles } from './styles';
import { useVSCodeContext } from '../../context/VSCodeContext';

/**
 * Componente para mostrar una lista de herramientas en ejecución
 */
const ToolExecutionList = ({ tools }) => {
  const { executeToolManually, cancelToolExecution } = useVSCodeContext();
  
  // Ordenar herramientas: primero las activas, luego las completadas, luego las con error
  const sortedTools = [...tools].sort((a, b) => {
    if (a.status === 'started' && b.status !== 'started') return -1;
    if (a.status !== 'started' && b.status === 'started') return 1;
    if (a.status === 'completed' && b.status === 'error') return -1;
    if (a.status === 'error' && b.status === 'completed') return 1;
    return (b.startTime || 0) - (a.startTime || 0); // Más recientes primero
  });
  
  return (
    <div style={styles.toolsList}>
      {sortedTools.map((tool, index) => (
        <ToolItem 
          key={`${tool.name}-${index}`} 
          tool={tool} 
          onRetry={(params) => executeToolManually(tool.name, params)}
          onCancel={() => cancelToolExecution(tool.name)}
        />
      ))}
    </div>
  );
};

/**
 * Componente para mostrar una herramienta individual
 */
const ToolItem = ({ tool, onRetry, onCancel }) => {
  const [expanded, setExpanded] = useState(false);
  
  const { name, status, parameters, result, error, startTime, endTime } = tool;
  
  // Calcular tiempo de ejecución si está disponible
  const executionTime = startTime && endTime 
    ? ((endTime - startTime) / 1000).toFixed(2) 
    : null;
  
  // Determinar el estilo basado en el estado
  const itemStyle = {
    ...styles.toolItem,
    ...(status === 'completed' && styles.toolCompleted),
    ...(status === 'error' && styles.toolError)
  };
  
  // Formatear los parámetros para mostrarlos
  const formatParams = (params) => {
    if (!params) return 'No hay parámetros';
    try {
      return JSON.stringify(params, null, 2);
    } catch (e) {
      return 'Error al formatear parámetros';
    }
  };
  
  // Formatear el resultado para mostrarlo
  const formatResult = (result) => {
    if (result === undefined || result === null) return 'Sin resultado';
    try {
      return typeof result === 'object' 
        ? JSON.stringify(result, null, 2)
        : String(result);
    } catch (e) {
      return 'Error al formatear resultado';
    }
  };
  
  return (
    <div style={itemStyle}>
      <div style={styles.toolHeader} onClick={() => setExpanded(!expanded)}>
        <div style={styles.toolInfo}>
          <span style={styles.toolName}>{name}</span>
          <span style={styles.toolStatus}>
            {status === 'started' && 'Ejecutando...'}
            {status === 'completed' && (duration ? `Completado en ${duration}` : 'Completado')}
            {status === 'error' && 'Error'}
          </span>
        </div>
        
        <div style={styles.toolActions}>
          {status === 'started' && (
            <button 
              style={styles.cancelButton}
              onClick={(e) => {
                e.stopPropagation();
                cancelToolExecution(name);
              }}
              title="Cancelar ejecución"
            >
              ✕
            </button>
          )}
          <span style={styles.expandIcon}>
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>
      
      {expanded && (
        <div style={styles.toolDetails}>
          {parameters && (
            <div style={styles.toolSection}>
              <h5 style={styles.toolSectionTitle}>Parámetros</h5>
              <pre style={styles.toolCode}>
                {JSON.stringify(parameters, null, 2)}
              </pre>
            </div>
          )}
          
          {result && (
            <div style={styles.toolSection}>
              <h5 style={styles.toolSectionTitle}>Resultado</h5>
              <pre style={styles.toolCode}>
                {typeof result === 'object' 
                  ? JSON.stringify(result, null, 2) 
                  : String(result)}
              </pre>
            </div>
          )}
          
          {/* Error */}
          {tool.status === 'error' && tool.error && (
            <div style={styles.toolSection}>
              <h4 style={styles.toolSectionTitle}>Error</h4>
              <div style={styles.errorMessage}>{tool.error}</div>
            </div>
          )}
          
          {/* Tiempo de ejecución */}
          {executionTime && (
            <div style={styles.toolSection}>
              <h4 style={styles.toolSectionTitle}>Tiempo de ejecución</h4>
              <div>{executionTime} segundos</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolExecutionList;
export { ToolItem };
