import React from 'react';
import { useVSCodeContext } from '../../context/VSCodeContext';
import ToolExecutionList from './ToolExecutionList';
import { styles } from './styles';

/**
 * Componente que muestra el estado actual del procesamiento
 * Incluye las fases del ciclo ReAct y las herramientas en ejecución
 */
const ProcessingStatus = () => {
  const { processingStatus, isLoading } = useVSCodeContext();
  
  // No mostrar nada si no hay procesamiento activo
  if (!isLoading && processingStatus.status === 'inactive') {
    return null;
  }

  const { phase, status, tools } = processingStatus;
  
  // Determinar qué fases están activas o completadas
  const phases = [
    { id: 'reasoning', name: 'Razonamiento', icon: '🧠' },
    { id: 'action', name: 'Acción', icon: '🛠️' },
    { id: 'reflection', name: 'Reflexión', icon: '🔍' },
    { id: 'correction', name: 'Corrección', icon: '✏️' }
  ];
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>
          {status === 'active' ? 'Procesando...' : 
           status === 'completed' ? 'Procesamiento completado' : 
           'Preparando respuesta'}
        </span>
        {status === 'active' && <div style={styles.spinner} />}
      </div>
      
      {/* Fases del ciclo ReAct */}
      <div style={styles.phasesContainer}>
        {phases.map(p => (
          <div 
            key={p.id}
            style={{
              ...styles.phase,
              ...(phase === p.id && status === 'active' ? styles.activePhase : {}),
              ...(phase === p.id && status === 'completed' ? styles.completedPhase : {})
            }}
          >
            <span style={styles.phaseIcon}>{p.icon}</span>
            <span style={styles.phaseName}>{p.name}</span>
            <span style={styles.phaseStatus}>
              {phase === p.id && status === 'active' && 'En progreso'}
              {phase === p.id && status === 'completed' && 'Completado'}
            </span>
          </div>
        ))}
      </div>
      
      {/* Herramientas en ejecución */}
      {tools.length > 0 && (
        <div style={styles.toolsSection}>
          <h4 style={styles.toolsTitle}>Herramientas</h4>
          <ToolExecutionList tools={tools} />
        </div>
      )}
    </div>
  );
};

export default ProcessingStatus;
