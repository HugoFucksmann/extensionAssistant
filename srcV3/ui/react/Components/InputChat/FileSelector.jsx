import React, { useEffect, useState, useRef } from "react";
import { FileIcon } from "./Icons";
import { useVSCodeContext } from "../../context/VSCodeContext";

const FileSelector = ({ onSelect, onRemove, files = [] }) => {
  const { theme, postMessage } = useVSCodeContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFiles, setProjectFiles] = useState([]);
  const dropdownRef = useRef(null);

  // Styles
  const styles = {
    wrapper: {
      position: 'relative',
      display: 'inline-block'
    },
    filesContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
      alignItems: 'center'
    },
    addButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      color: theme.colors.text,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    fileTag: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: theme.colors.tagBg || theme.colors.background,
      color: theme.colors.text,
      padding: '2px 6px',
      borderRadius: '4px',
      marginRight: '4px',
      fontSize: '12px',
      maxWidth: '100px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    removeButton: {
      background: 'none',
      border: 'none',
      color: theme.colors.text,
      cursor: 'pointer',
      padding: '0 0 0 4px',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    dropdown: {
      position: 'absolute',
      bottom: '100%',
      right: '0',
      width: '250px',
      maxHeight: '300px',
      backgroundColor: theme.colors.dropdownBg || theme.colors.background,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '4px',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      marginBottom: '8px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    },
    searchContainer: {
      padding: '8px',
      borderBottom: `1px solid ${theme.colors.border}`
    },
    searchInput: {
      width: '100%',
      padding: '6px 8px',
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '4px',
      backgroundColor: theme.colors.inputBg || theme.colors.background,
      color: theme.colors.text,
      fontSize: '12px',
      outline: 'none'
    },
    fileList: {
      margin: 0,
      padding: 0,
      listStyle: 'none',
      overflowY: 'auto',
      maxHeight: '250px'
    },
    fileItem: {
      padding: '6px 12px',
      cursor: 'pointer',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      borderBottom: `1px solid ${theme.colors.border}`,
      color: theme.colors.text,
      "&:hover": {
        backgroundColor: theme.colors.hoverBg || theme.colors.background
      }
    },
    noFiles: {
      padding: '12px',
      textAlign: 'center',
      color: theme.colors.textMuted,
      fontSize: '12px'
    },
    header: {
      padding: '8px 12px',
      borderBottom: `1px solid ${theme.colors.border}`,
      fontWeight: 'bold',
      fontSize: '12px',
      color: theme.colors.text
    }
  };

  // Apply hover style manually since we're using inline styles
  const getFileItemStyle = (isHovered) => ({
    ...styles.fileItem,
    backgroundColor: isHovered ? (theme.colors.hoverBg || '#f0f0f0') : 'transparent'
  });

  // Request project files when dropdown is opened
  useEffect(() => {
    if (isDropdownOpen) {
      postMessage("command", { command: "getProjectFiles" });
    }
  }, [isDropdownOpen, postMessage]);

  // Handle incoming project files from the extension
  useEffect(() => {
    const handleMessage = (event) => {
      const message = event.data;
      if (message.type === "projectFiles") {
        // Filter out node_modules and other excluded directories
        const filteredFiles = message.payload.files.filter(file => 
          !file.includes('node_modules/') && 
          !file.includes('node_modules\\') &&
          !file.includes('.git/') &&
          !file.includes('.git\\') &&
          !file.endsWith('/') && // Exclude directories
          !file.endsWith('\\')
        );
        setProjectFiles(filteredFiles);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSearchTerm("");
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleFileSelect = (file) => {
    onSelect([...files, file]);
    setIsDropdownOpen(false);
    setSearchTerm("");
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen) {
      setSearchTerm("");
    }
  };

  // Filter files based on search term
  const filteredFiles = searchTerm
    ? projectFiles.filter(file => 
        file.toLowerCase().includes(searchTerm.toLowerCase()))
    : projectFiles;

  // Group files by directory for better organization
  const groupedFiles = filteredFiles.reduce((groups, file) => {
    const parts = file.split(/[\/\\]/);
    const directory = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    
    if (!groups[directory]) {
      groups[directory] = [];
    }
    groups[directory].push(file);
    return groups;
  }, {});

  // Create file items with hover effect
  const FileItem = ({ file }) => {
    const [isHovered, setIsHovered] = useState(false);
    const fileName = file.split(/[\/\\]/).pop();
    
    return (
      <li 
        style={getFileItemStyle(isHovered)}
        onClick={() => handleFileSelect(file)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={file}
      >
        {fileName}
      </li>
    );
  };

  return (
    <div style={styles.wrapper} ref={dropdownRef}>
      <div style={styles.filesContainer}>
        <button
          onClick={toggleDropdown}
          style={styles.addButton}
          title="Add file"
        >
          <FileIcon />
        </button>
        
        {files.map((file, index) => (
          <div key={index} style={styles.fileTag}>
            <span>{file.split(/[\/\\]/).pop()}</span>
            <button
              onClick={() => onRemove(file)}
              style={styles.removeButton}
              title="Remove file"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {isDropdownOpen && (
        <div style={styles.dropdown}>
          <div style={styles.header}>Project Files</div>
          <div style={styles.searchContainer}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files..."
              style={styles.searchInput}
              autoFocus
            />
          </div>
          
          <ul style={styles.fileList}>
            {Object.keys(groupedFiles).length > 0 ? (
              Object.entries(groupedFiles).map(([directory, files]) => (
                <React.Fragment key={directory}>
                  {files.map(file => (
                    <FileItem key={file} file={file} />
                  ))}
                </React.Fragment>
              ))
            ) : (
              <li style={styles.noFiles}>
                {projectFiles.length === 0 ? "Loading files..." : "No matching files found"}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileSelector;