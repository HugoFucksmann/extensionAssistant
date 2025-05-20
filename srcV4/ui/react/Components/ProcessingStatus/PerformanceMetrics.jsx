import React, { useState, useEffect } from 'react';
import { useVSCodeContext } from '../../context/VSCodeContext';
import { styles } from './styles';

/**
 * Componente para mostrar métricas de rendimiento del ciclo ReAct
 * Muestra información como tiempos de ejecución, uso de memoria, etc.
 */
const PerformanceMetrics = ({ chatId }) => {
  const { processingStatus } = useVSCodeContext();
  const [metrics, setMetrics] = useState({
    totalDuration: 0,
    toolExecutions: 0,
    averageToolTime: 0,
    reasoningTime: 0,
    actionTime: 0,
    reflectionTime: 0,
    memoryUsage: 0
  });
  
  // Calcular métricas basadas en el estado de procesamiento
  useEffect(() => {
    if (processingStatus.tools && processingStatus.tools.length > 0) {
      // Calcular tiempos de ejecución de herramientas
      const toolTimes = processingStatus.tools
        .filter(tool => tool.startTime && tool.endTime)
        .map(tool => tool.endTime - tool.startTime);
      
      const totalToolTime = toolTimes.reduce((sum, time) => sum + time, 0);
      const averageToolTime = toolTimes.length > 0 ? totalToolTime / toolTimes.length : 0;
      
      // Calcular tiempo total de procesamiento
      const startTime = processingStatus.startTime || 0;
      const endTime = Date.now();
      const totalDuration = startTime > 0 ? endTime - startTime : 0;
      
      // Actualizar métricas
      setMetrics({
        totalDuration,
        toolExecutions: processingStatus.tools.length,
        averageToolTime,
        reasoningTime: processingStatus.phase === 'reasoning' ? totalDuration * 0.4 : 0, // Estimación
        actionTime: processingStatus.phase === 'action' ? totalDuration * 0.5 : 0, // Estimación
        reflectionTime: processingStatus.phase === 'reflection' ? totalDuration * 0.1 : 0, // Estimación
        memoryUsage: Math.round(Math.random() * 50 + 50) // Simulación para demostración
      });
    }
  }, [processingStatus]);
  
  // No mostrar nada si no hay procesamiento activo
  if (processingStatus.status !== 'active' || metrics.totalDuration === 0) {
    return null;
  }
  
  return (
    <div style={styles.metricsContainer}>
      <h4 style={styles.metricsTitle}>Métricas de Rendimiento</h4>
      
      <div style={styles.metricsGrid}>
        <div style={styles.metricItem}>
          <span style={styles.metricLabel}>Tiempo total</span>
          <span style={styles.metricValue}>{(metrics.totalDuration / 1000).toFixed(2)}s</span>
        </div>
        
        <div style={styles.metricItem}>
          <span style={styles.metricLabel}>Herramientas ejecutadas</span>
          <span style={styles.metricValue}>{metrics.toolExecutions}</span>
        </div>
        
        <div style={styles.metricItem}>
          <span style={styles.metricLabel}>Tiempo promedio por herramienta</span>
          <span style={styles.metricValue}>{(metrics.averageToolTime / 1000).toFixed(2)}s</span>
        </div>
        
        <div style={styles.metricItem}>
          <span style={styles.metricLabel}>Uso de memoria</span>
          <span style={styles.metricValue}>{metrics.memoryUsage} MB</span>
        </div>
      </div>
      
      {/* Gráfico de barras simple para visualizar tiempos */}
      <div style={styles.barChartContainer}>
        <div style={styles.barChartLabel}>Distribución de tiempo</div>
        <div style={styles.barChart}>
          {metrics.reasoningTime > 0 && (
            <div 
              style={{
                ...styles.barSegment,
                width: `${(metrics.reasoningTime / metrics.totalDuration) * 100}%`,
                backgroundColor: 'var(--vscode-charts-blue)'
              }}
              title={`Razonamiento: ${(metrics.reasoningTime / 1000).toFixed(2)}s`}
            />
          )}
          {metrics.actionTime > 0 && (
            <div 
              style={{
                ...styles.barSegment,
                width: `${(metrics.actionTime / metrics.totalDuration) * 100}%`,
                backgroundColor: 'var(--vscode-charts-green)'
              }}
              title={`Acción: ${(metrics.actionTime / 1000).toFixed(2)}s`}
            />
          )}
          {metrics.reflectionTime > 0 && (
            <div 
              style={{
                ...styles.barSegment,
                width: `${(metrics.reflectionTime / metrics.totalDuration) * 100}%`,
                backgroundColor: 'var(--vscode-charts-orange)'
              }}
              title={`Reflexión: ${(metrics.reflectionTime / 1000).toFixed(2)}s`}
            />
          )}
        </div>
        <div style={styles.barLegend}>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: 'var(--vscode-charts-blue)'}} />
            <span>Razonamiento</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: 'var(--vscode-charts-green)'}} />
            <span>Acción</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: 'var(--vscode-charts-orange)'}} />
            <span>Reflexión</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
