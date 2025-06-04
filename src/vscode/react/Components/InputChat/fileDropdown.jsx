import React, { useEffect, useRef } from 'react';

// Componente independiente para mostrar la lista de archivos en un dropdown
const FileDropdown = ({ 
  theme, 
  position, 
  searchTerm, // Término de búsqueda actual (después del @)
  filteredFiles,
  isLoading, 
  onSelectFile,
  activeIndex,
  setActiveIndex // Para actualizar activeIndex con el hover del ratón
}) => {
  const styles = {
    dropdown: {
      position: 'fixed', // Changed from fixed to ensure proper layering
      top: position.top,
      left: position.left,
      width: position.width,
      backgroundColor: theme.colors.dropdownBg || theme.colors.background,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '4px',
      zIndex: 9999, // Much higher z-index
      
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '250px', // Max height para el dropdown completo
    },
    header: {
      padding: '4px 4px',
      borderBottom: `1px solid ${theme.colors.border}`,
      fontWeight: 'bold',
      fontSize: '10px',
      color: theme.colors.text,
      flexShrink: 0, // Evitar que el header se encoja
    },
    fileList: {
      margin: 0,
      padding: 0,
      listStyle: 'none',
      overflowY: 'auto',
      flexGrow: 1, // Permitir que la lista crezca para llenar el espacio
    },
    fileItem: {
      padding: '4px 4px',
      cursor: 'pointer',
      fontSize: '10px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      borderBottom: `1px solid ${theme.colors.border}`,
      color: theme.colors.text,
      transition: 'background-color 0.2s ease', // Add smooth transition
    },
    noFiles: {
      padding: '6px',
      textAlign: 'center',
      color: theme.colors.textMuted,
      fontSize: '10px'
    }
  };

  const listRef = useRef(null);

  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < filteredFiles.length && listRef.current) {
      const activeItem = listRef.current.children[activeIndex];
      if (activeItem) {
        activeItem.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth' 
        });
      }
    }
  }, [activeIndex, filteredFiles.length]);

  // Componente para cada archivo en la lista
  const FileItem = ({ file, isActive, index }) => {
    const fileName = file.split(/[\/\\]/).pop();
    // Obtener la ruta relativa sin el nombre del archivo
    const filePath = file.replace(new RegExp(`${fileName}$`), '');
    
    const fileItemStyle = {
      ...styles.fileItem,
      backgroundColor: isActive ? (theme.colors.primary || '#007acc') : 'transparent',
      color: isActive ? (theme.colors.primaryText || '#ffffff') : theme.colors.text,
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      padding: '8px 12px',
    };
    
    const fileNameStyle = {
      fontWeight: 'bold',
      fontSize: '12px',
      lineHeight: '1.1',
    };
    
    const filePathStyle = {
      fontSize: '11px',
      color: isActive ? 'rgba(255, 255, 255, 0.8)' : 'rgba(121, 121, 121, 0.6)',
      fontStyle: 'italic',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    };
    
    return (
      <li 
        style={fileItemStyle}
        onClick={() => onSelectFile(file)}
        onMouseEnter={() => {
          if (setActiveIndex) setActiveIndex(index); // Actualizar activeIndex en hover
        }}
        title={file}
        role="option"
        aria-selected={isActive}
        id={`file-item-${index}`} // Para aria-activedescendant
      >
        <div style={fileNameStyle}>{fileName}</div>
        <div style={filePathStyle}>{filePath}</div>
      </li>
    );
  };

  return (
    <div 
      style={styles.dropdown} 
      role="listbox" 
      aria-label="File suggestions"
      aria-activedescendant={filteredFiles.length > 0 && activeIndex >=0 ? `file-item-${activeIndex}` : undefined}
    >
      <div style={styles.header}>Insert File</div>
      <ul style={styles.fileList} ref={listRef}>
        {isLoading ? (
            <li style={styles.noFiles}>Loading files...</li>
        ) : filteredFiles.length > 0 ? (
          filteredFiles.map((file, index) => (
            <FileItem 
              key={file} 
              file={file} 
              isActive={index === activeIndex}
              index={index}
            />
          ))
        ) : (
          <li style={styles.noFiles}>
            {searchTerm ? "No matching files" : "Type to search or no files found"}
          </li>
        )}
      </ul>
    </div>
  );
};

export default FileDropdown;