import React, { useState } from 'react';

// Componente independiente para mostrar la lista de archivos en un dropdown
const FileDropdown = ({ 
  theme, 
  position, 
  searchTerm, 
  filteredFiles,
  isLoading, 
  onSelectFile 
}) => {
  const styles = {
    dropdown: {
      position: 'fixed',
      top: position.top,
      left: position.left,
      width: position.width,
      height: '200px', // Increased to match new position
      backgroundColor: theme.colors.dropdownBg || theme.colors.background,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '4px',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      padding: '8px 12px',
      borderBottom: `1px solid ${theme.colors.border}`,
      fontWeight: 'bold',
      fontSize: '12px',
      color: theme.colors.text
    },
    fileList: {
      margin: 0,
      padding: 0,
      listStyle: 'none',
      overflowY: 'auto',
      maxHeight: '200px' // Also updated to maintain consistency
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

  // Componente para cada archivo en la lista
  const FileItem = ({ file }) => {
    const [isHovered, setIsHovered] = useState(false);
    const fileName = file.split(/[\/\\]/).pop();
    
    const fileItemStyle = {
      ...styles.fileItem,
      backgroundColor: isHovered ? (theme.colors.hoverBg || '#f0f0f0') : 'transparent'
    };
    
    return (
      <li 
        style={fileItemStyle}
        onClick={() => onSelectFile(file)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={file}
      >
        {fileName}
      </li>
    );
  };

  return (
    <div style={styles.dropdown}>
      <div style={styles.header}>Insert File</div>
      <ul style={styles.fileList}>
        {filteredFiles.length > 0 ? (
          filteredFiles.map(file => (
            <FileItem key={file} file={file} />
          ))
        ) : (
          <li style={styles.noFiles}>
            {isLoading ? "Loading files..." : (searchTerm ? "No matching files" : "No files found")}
          </li>
        )}
      </ul>
    </div>
  );
};

export default FileDropdown;