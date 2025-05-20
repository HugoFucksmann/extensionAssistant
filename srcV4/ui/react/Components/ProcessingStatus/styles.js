/**
 * Estilos para los componentes de estado de procesamiento
 */
export const styles = {
  container: {
    backgroundColor: 'var(--vscode-editor-background)',
    border: '1px solid var(--vscode-panel-border)',
    borderRadius: '6px',
    margin: '10px 0',
    padding: '12px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    transition: 'all 0.3s ease'
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--vscode-panel-border)'
  },
  
  title: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--vscode-foreground)'
  },
  
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid var(--vscode-progressBar-background)',
    borderTopColor: 'var(--vscode-button-background)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  
  phasesContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  
  phase: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: '1',
    padding: '8px',
    borderRadius: '4px',
    backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
    margin: '0 4px',
    minWidth: '80px',
    transition: 'all 0.2s ease'
  },
  
  activePhase: {
    backgroundColor: 'var(--vscode-button-hoverBackground)',
    boxShadow: '0 0 0 1px var(--vscode-button-background)'
  },
  
  completedPhase: {
    backgroundColor: 'var(--vscode-gitDecoration-addedResourceForeground)',
    opacity: 0.7
  },
  
  phaseIcon: {
    fontSize: '20px',
    marginBottom: '4px'
  },
  
  phaseName: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--vscode-foreground)'
  },
  
  phaseStatus: {
    fontSize: '10px',
    color: 'var(--vscode-descriptionForeground)',
    marginTop: '4px'
  },
  
  toolsSection: {
    marginTop: '12px',
    paddingTop: '8px',
    borderTop: '1px solid var(--vscode-panel-border)'
  },
  
  toolsTitle: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--vscode-foreground)'
  },
  
  toolsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  
  toolItem: {
    borderRadius: '4px',
    backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
    borderLeft: '3px solid var(--vscode-button-background)',
    overflow: 'hidden',
    transition: 'all 0.2s ease'
  },
  
  toolCompleted: {
    borderLeftColor: 'var(--vscode-gitDecoration-addedResourceForeground)'
  },
  
  toolError: {
    borderLeftColor: 'var(--vscode-errorForeground)'
  },
  
  toolHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    cursor: 'pointer'
  },
  
  toolInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  
  toolName: {
    fontWeight: '500',
    fontSize: '13px',
    color: 'var(--vscode-foreground)'
  },
  
  toolStatus: {
    fontSize: '11px',
    color: 'var(--vscode-descriptionForeground)'
  },
  
  toolActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  cancelButton: {
    background: 'none',
    border: 'none',
    color: 'var(--vscode-errorForeground)',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '2px 6px',
    borderRadius: '3px',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: 'var(--vscode-editor-selectionBackground)'
    }
  },
  
  expandIcon: {
    fontSize: '10px',
    color: 'var(--vscode-descriptionForeground)'
  },
  
  toolDetails: {
    padding: '0 12px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  
  toolSection: {
    marginTop: '4px'
  },
  
  toolSectionTitle: {
    margin: '0 0 4px 0',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--vscode-foreground)'
  },
  
  toolCode: {
    backgroundColor: 'var(--vscode-editor-background)',
    padding: '8px',
    borderRadius: '3px',
    fontSize: '12px',
    fontFamily: 'var(--vscode-editor-font-family, monospace)',
    overflowX: 'auto',
    margin: 0,
    border: '1px solid var(--vscode-panel-border)'
  },
  
  errorMessage: {
    backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
    color: 'var(--vscode-errorForeground)',
    padding: '8px',
    borderRadius: '3px',
    fontSize: '12px',
    borderLeft: '2px solid var(--vscode-errorForeground)'
  },
  
  // Estilos para el componente PerformanceMetrics
  metricsContainer: {
    backgroundColor: 'var(--vscode-editor-background)',
    border: '1px solid var(--vscode-panel-border)',
    borderRadius: '6px',
    margin: '10px 0',
    padding: '12px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
  },
  
  metricsTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--vscode-foreground)',
    margin: '0 0 12px 0',
    padding: '0 0 8px 0',
    borderBottom: '1px solid var(--vscode-panel-border)'
  },
  
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },
  
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px',
    backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
    borderRadius: '4px'
  },
  
  metricLabel: {
    fontSize: '11px',
    color: 'var(--vscode-descriptionForeground)',
    marginBottom: '4px'
  },
  
  metricValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--vscode-foreground)'
  },
  
  barChartContainer: {
    marginTop: '16px'
  },
  
  barChartLabel: {
    fontSize: '12px',
    color: 'var(--vscode-descriptionForeground)',
    marginBottom: '8px'
  },
  
  barChart: {
    height: '24px',
    width: '100%',
    backgroundColor: 'var(--vscode-editor-background)',
    border: '1px solid var(--vscode-panel-border)',
    borderRadius: '4px',
    overflow: 'hidden',
    display: 'flex'
  },
  
  barSegment: {
    height: '100%',
    transition: 'width 0.3s ease'
  },
  
  barLegend: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '8px',
    gap: '16px'
  },
  
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    color: 'var(--vscode-descriptionForeground)'
  },
  
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
    marginRight: '4px'
  }
};

// Añadir keyframes para la animación del spinner
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}
