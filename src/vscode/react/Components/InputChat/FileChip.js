import React from 'react';

const FileChip = ({ fileName, onRemove, theme }) => {
  const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSlightlyDarker || '#e0e0e0', // Un color de fondo para el chip
    color: theme.colors.textSecondary || '#666',
    padding: '3px 8px',
    borderRadius: theme.borderRadius.medium || '16px', // Más redondeado para un look de chip
    marginRight: '8px',
    marginBottom: '8px',
    fontSize: '13px', // Un poco más pequeño que el texto principal
    lineHeight: '1.2',
    cursor: 'default',
    boxShadow: `0 1px 2px ${theme.colors.shadow || 'rgba(0,0,0,0.1)'}`, // Sombra sutil
  };

  const iconStyle = {
    marginRight: '6px',
    // Si usas un componente SVG Icon, puedes pasarle color: theme.colors.textSecondary
    // Ejemplo con un emoji simple:
    // No necesita estilo adicional si el emoji se ve bien
  };

  const fileNameStyle = {
    maxWidth: '150px', // Evita que nombres muy largos rompan el layout
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const removeButtonStyle = {
    marginLeft: '8px',
    background: 'transparent',
    border: 'none',
    color: theme.colors.textSecondary || '#666',
    cursor: 'pointer',
    padding: '0',
    fontSize: '16px', // Tamaño del ícono de cierre
    lineHeight: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={chipStyle} title={fileName}> {/* title para ver nombre completo en hover */}
      {/* <FileIcon color={theme.colors.textSecondary} style={iconStyle} /> */}
      <span style={iconStyle} role="img" aria-label="file icon">📄</span> {/* Emoji como placeholder */}
      <span style={fileNameStyle}>{fileName}</span>
      {onRemove && (
        <button
          style={removeButtonStyle}
          onClick={onRemove}
          title="Remove file"
          aria-label={`Remove ${fileName}`}
        >
          × {/* Caracter 'x' para cerrar */}
        </button>
      )}
    </div>
  );
};

export default FileChip;