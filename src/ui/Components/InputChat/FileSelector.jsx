import React, { useEffect, useState, memo, useRef } from "react";
import { FileIcon } from "./Icons";
import { styles } from "./ChatInputStyles";

const FileSelector = memo(({ files, onRemove, projectFiles, onFileSelect }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef(null);
  
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
     
      onFileSelect(file);
      setSearchTerm("");
    };
  
    const toggleDropdown = () => {
    
      setIsDropdownOpen(!isDropdownOpen);
      if (!isDropdownOpen) {
        setSearchTerm("");
      }
    };
  
    const filteredFiles = projectFiles?.filter((file) =>
      file.toLowerCase().includes(searchTerm.toLowerCase())
    );
  
    return (
      <div style={styles.filesWrapper} ref={dropdownRef}>
        <div style={styles.filesContainer}>
          <button
            onClick={toggleDropdown}
            style={styles.addButton}
            title="Add file"
          >
            <FileIcon />
          </button>
          {files.map((file) => (
            <div key={file} style={styles.fileTag}>
              <span>{file}</span>
              <button
                onClick={() => {
                 
                  onRemove(file);
                }}
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
            <div style={styles.searchContainer}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search files..."
                style={styles.searchInput}
              />
            </div>
            <ul style={styles.fileList}>
              {filteredFiles?.length > 0 ? (
                filteredFiles.map((file) => (
                  <li
                    key={file}
                    onClick={() => handleFileSelect(file)}
                    style={styles.fileItem}
                  >
                    {file}
                  </li>
                ))
              ) : (
                <li style={styles.noFiles}>No files available</li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  });



  export default FileSelector;