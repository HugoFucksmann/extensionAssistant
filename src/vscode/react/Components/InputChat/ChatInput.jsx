import React, { useRef, useState, useEffect } from "react";
import ModelDropdown from './ModelDropdown';
import FileChip from './FileChip';
import { useProjectFiles } from './useProjectFiles';
import { useFileMention } from './useFileMention';
import './ChatInput.css';
import FileDropdown from "./fileDropdown";
import { EnterIcon, FileIcon } from "./Icons";
import { useApp } from "../../context/AppContext";

const ChatInput = () => {
  const { sendMessage, isLoading, theme, currentModel, messages } = useApp();
  const [inputText, setInputText] = useState('');
  const inputRef = useRef(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelDropdownPosition, setModelDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [activeIndex, setActiveIndex] = useState(-1); 
  
  const { 
    isMentionMode, 
    isDropdownOpen, 
    dropdownPosition, 
    searchTerm, 
    selectedFiles, 
    setSelectedFiles,
    dropdownRef, 
    openMentionDropdown, 
    closeDropdown, 
    insertFileMention, 
    updateSearchTerm, 
    startMentionByButton 
  } = useFileMention(inputRef, inputText, setInputText);
  
  const { 
    isLoading: isLoadingFiles, 
    getFilteredFiles 
  } = useProjectFiles(isDropdownOpen); 

  const filteredMentionFiles = getFilteredFiles(searchTerm); 

  useEffect(() => {
    if (isDropdownOpen) {
        setActiveIndex(0); 
    } else {
        setActiveIndex(-1); 
    }
  }, [searchTerm, filteredMentionFiles.length, isDropdownOpen]);


  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!inputText.trim() && selectedFiles.length === 0) || isLoading) return;
    
    sendMessage(inputText.trim(), selectedFiles.map(f => f.path || f));
    setInputText('');
    setSelectedFiles([]); 
    closeDropdown(); 
  };


  const handleModelClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const safeLeft = Math.min(rect.left, viewportWidth - 150);
    
    setModelDropdownPosition({
      top: rect.top - 90,
      left: safeLeft,
      width: Math.max(rect.width, 120)
    });
    setIsModelDropdownOpen(!isModelDropdownOpen);
  };


  const handleModelChange = (modelType) => {
    window.vscode?.postMessage({
      type: 'switchModel',
      payload: { modelType }
    });
    setIsModelDropdownOpen(false);
  };


  const handleRemoveFile = (fileToRemovePath) => {
    setSelectedFiles(prevFiles => prevFiles.filter(f => f !== fileToRemovePath));
    
    const fileNameToRemove = fileToRemovePath.split(/[\/\\]/).pop();
    const escapedFileName = fileNameToRemove.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    const chipTextPattern = new RegExp(`${escapedFileName}\\s?`, 'g'); 
    
    setInputText(prevText => prevText.replace(chipTextPattern, '').trim());
  };

  const handleFileSelect = (filePath) => {
 
    insertFileMention(filePath);
  };
  
  const handleKeyDownInInput = (e) => {
    if (isDropdownOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filteredMentionFiles.length > 0) {
          setActiveIndex(prev => (prev + 1) % filteredMentionFiles.length);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filteredMentionFiles.length > 0) {
          setActiveIndex(prev => (prev - 1 + filteredMentionFiles.length) % filteredMentionFiles.length);
        }
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); 
        if (filteredMentionFiles.length > 0 && activeIndex >= 0 && activeIndex < filteredMentionFiles.length) {
          handleFileSelect(filteredMentionFiles[activeIndex]);
        } else {
         
          closeDropdown();
        }
      } else if (e.key === "Escape") {
        e.preventDefault(); 
        closeDropdown();
      }
     
    } else { 
      if (e.key === "Enter" && !e.shiftKey) {
        handleSubmit(e);
      } else if (e.key === "@") {
       
        const currentCursorPos = inputRef.current.selectionStart;
        
        openMentionDropdown(currentCursorPos); 
      }
    }
  };

  const handleInputChange = (e) => {
    const newText = e.target.value;
    setInputText(newText); 
    
    if (isMentionMode && inputRef.current) {
      const caretPosition = inputRef.current.selectionStart;
      updateSearchTerm(newText, caretPosition);
    }
  };


  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [messages]);

  // Aplicar estilos
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      padding: '8px',
      backgroundColor: theme.colors.background,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.medium,
      boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
    },
    inputContainer: {
      display: 'flex',
      alignItems: 'center',
      padding: '8px',
      borderBottom: `1px solid ${theme.colors.border}`,
    },
    input: {
      flex: 1,
      padding: '8px',
      fontSize: '16px',
      fontFamily: 'inherit',
      color: theme.colors.text,
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
    },
    sendButton: {
      padding: '8px',
      fontSize: '16px',
      fontFamily: 'inherit',
      color: theme.colors.primary,
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      cursor: 'pointer',
    },
    controlsRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px',
    },
    leftControls: {
      display: 'flex',
      alignItems: 'center',
    },
    modelSelector: {
      padding: '8px',
      fontSize: '16px',
      fontFamily: 'inherit',
      color: theme.colors.text,
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      cursor: 'pointer',
    },
    modelSelectorArrow: {
      fontSize: '16px',
      fontFamily: 'inherit',
      color: theme.colors.text,
      marginLeft: '8px',
    },
    rightControls: {
      display: 'flex',
      alignItems: 'center',
    },
    fileButton: {
      padding: '8px',
      fontSize: '16px',
      fontFamily: 'inherit',
      color: theme.colors.primary,
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      cursor: 'pointer',
    },
  };

  return (
    <div style={styles.container} ref={dropdownRef}> {/* dropdownRef de useFileMention */}
      {/* Contenedor para los FileChips */}
      {selectedFiles.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          padding: '8px 8px 0px 8px',
          borderBottom: `1px solid ${theme.colors.border}`,
          gap: '4px'
        }}>
          {selectedFiles.map((filePath) => (
            <FileChip
              key={filePath}
              fileName={filePath.split(/[\/\\]/).pop()}
              onRemove={() => handleRemoveFile(filePath)}
              theme={theme}
            />
          ))}
        </div>
      )}

      <div style={styles.inputContainer}>
        <div
          style={styles.input}
          onClick={() => inputRef.current?.focus()}
        >
          <input
            ref={inputRef}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              width: '100%',
              color: theme.colors.text,
              fontFamily: 'inherit',
              fontSize: 'inherit',
              padding: 0,
              margin: 0,
            }}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDownInInput}
            placeholder={selectedFiles.length > 0 
              ? "Add more details..." 
              : "Type your message... (Use @ to mention files)"}
            disabled={isLoading}
            aria-autocomplete="list"
            aria-expanded={isDropdownOpen}
            aria-controls={isDropdownOpen ? "file-dropdown-listbox" : undefined} // ID del listbox
            aria-activedescendant={isDropdownOpen && activeIndex >=0 && filteredMentionFiles.length > 0 ? `file-item-${activeIndex}` : undefined}
          />
        </div>
        
        <button 
          style={styles.sendButton} 
          onClick={handleSubmit}
          disabled={(!inputText.trim() && selectedFiles.length === 0) || isLoading}
        >
          <EnterIcon color={((inputText.trim() || selectedFiles.length > 0) && !isLoading) 
            ? theme.colors.primary 
            : theme.colors.disabled} />
        </button>
      </div>

      {isDropdownOpen && (
        <FileDropdown
          theme={theme}
          position={dropdownPosition}
          searchTerm={searchTerm} // Pasar searchTerm para el mensaje "No matching files"
          filteredFiles={filteredMentionFiles}
          isLoading={isLoadingFiles}
          onSelectFile={handleFileSelect}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex} // Para que FileItem pueda actualizarlo en hover
        />
      )}

      <div style={styles.controlsRow}>
        <div style={styles.leftControls}>
          <div style={styles.modelSelector} onClick={handleModelClick}>
            {currentModel}
            <div style={styles.modelSelectorArrow}>▼</div>
          </div>
          
          {isModelDropdownOpen && (
            <ModelDropdown
              options={[
                { value: 'ollama', label: 'Ollama' },
                { value: 'gemini', label: 'Gemini' }
              ]}
              currentModel={currentModel}
              onSelect={handleModelChange}
              position={modelDropdownPosition}
              theme={theme}
            />
          )}
        </div>
        
        <div style={styles.rightControls}>
          <button
            onClick={startMentionByButton}
            style={styles.fileButton}
            title="Add file"
          >
            <FileIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;