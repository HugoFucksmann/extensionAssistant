// src/vscode/react/Components/Permissions/PermissionDialog.jsx
import React from 'react';
import { useApp } from '../../context/AppContext';

/**
 * Componente que muestra un diálogo de solicitud de permisos
 * @param {Object} props - Propiedades del componente
 * @param {string} props.toolName - Nombre de la herramienta que solicita el permiso
 * @param {string} props.permission - Permiso requerido
 * @param {string} props.description - Descripción del permiso
 * @param {Object} props.params - Parámetros de la herramienta (para mostrar contexto)
 * @param {string} props.operationId - ID de la operación para correlacionar la respuesta
 * @param {Function} props.onAllow - Función a llamar cuando se permite el permiso
 * @param {Function} props.onDeny - Función a llamar cuando se deniega el permiso
 */
const PermissionDialog = ({ 
  toolName, 
  permission, 
  description, 
  params, 
  operationId,
  onAllow,
  onDeny
}) => {
  const { theme } = useApp();

  // Estilos
  const containerStyle = {
    padding: theme.spacing.medium,
    margin: `${theme.spacing.medium} 0`,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.glassBackground || '#f0f0f0',
    border: `1px solid ${theme.colors.warning || '#ff9800'}`,
    boxShadow: theme.shadows.medium,
    maxWidth: '100%',
    overflow: 'hidden'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing.small,
    fontWeight: 'bold',
    color: theme.colors.warning || '#ff9800'
  };

  const contentStyle = {
    marginBottom: theme.spacing.medium,
    fontSize: '14px'
  };

  const paramsStyle = {
    marginTop: theme.spacing.small,
    padding: theme.spacing.small,
    backgroundColor: theme.colors.codeBackground || '#f5f5f5',
    borderRadius: theme.borderRadius.small,
    fontSize: '12px',
    fontFamily: 'monospace',
    overflowX: 'auto',
    maxHeight: '100px',
    color: theme.colors.code || '#333'
  };

  const buttonsContainerStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing.small
  };

  const buttonBaseStyle = {
    padding: `${theme.spacing.small} ${theme.spacing.medium}`,
    borderRadius: theme.borderRadius.small,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  };

  const allowButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: theme.colors.primary || '#007acc',
    color: '#fff'
  };

  const denyButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: 'transparent',
    color: theme.colors.text,
    border: `1px solid ${theme.colors.border}`
  };

  // Formatear los parámetros para mostrarlos de manera legible
  const formattedParams = JSON.stringify(params, null, 2);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span>⚠️ Solicitud de Permiso</span>
      </div>
      <div style={contentStyle}>
        <p>
          La herramienta <strong>{toolName}</strong> requiere permiso para:
          <br />
          <strong>{description || permission}</strong>
        </p>
        <div>
          <p style={{ fontSize: '13px', marginTop: '8px', marginBottom: '4px' }}>
            Parámetros de la herramienta:
          </p>
          <pre style={paramsStyle}>{formattedParams}</pre>
        </div>
      </div>
      <div style={buttonsContainerStyle}>
        <button 
          style={denyButtonStyle} 
          onClick={() => onDeny(operationId, permission)}
        >
          Denegar
        </button>
        <button 
          style={allowButtonStyle} 
          onClick={() => onAllow(operationId, permission)}
        >
          Permitir
        </button>
      </div>
    </div>
  );
};

export default PermissionDialog;
