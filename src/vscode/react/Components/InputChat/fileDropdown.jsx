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
      position: 'fixed',
      top: position.top,
      left: position.left,
      width: position.width,
      backgroundColor: theme.colors.dropdownBg || theme.colors.background,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '4px',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '250px', // Max height para el dropdown completo
    },
    header: {
      padding: '8px 12px',
      borderBottom: `1px solid ${theme.colors.border}`,
      fontWeight: 'bold',
      fontSize: '12px',
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
      padding: '6px 12px',
      cursor: 'pointer',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      borderBottom: `1px solid ${theme.colors.border}`,
      color: theme.colors.text
    },
    noFiles: {
      padding: '12px',
      textAlign: 'center',
      color: theme.colors.textMuted,
      fontSize: '12px'
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
    
    const fileItemStyle = {
      ...styles.fileItem,
      backgroundColor: isActive ? (theme.colors.primary || '#007acc') : 'transparent',
      color: isActive ? (theme.colors.primaryText || '#ffffff') : theme.colors.text,
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
        {fileName}
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