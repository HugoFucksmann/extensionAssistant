// Nombre del archivo: ChatInput.jsx

import React, { useRef, useState, useEffect } from "react";

// Importar componentes
import ModelDropdown from '../ModelSelector/ModelDropdown';
import FileChip from './FileChip'; // Importar FileChip

// Importar custom hooks
import { useProjectFiles } from './useProjectFiles';
import { useFileMention } from './useFileMention';
import { getStyles } from './ChatInputStyles';
import FileDropdown from "./fileDropdown";
import { EnterIcon, FileIcon } from "./Icons";
import { useApp } from "../../context/AppContext";

const ChatInput = () => {
  const { sendMessage, isLoading, theme, currentModel, messages } = useApp();
  const [inputText, setInputText] = useState('');
  const inputRef = useRef(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelDropdownPosition, setModelDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  // Custom hooks
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
    completeMention, 
    startMentionByButton 
  } = useFileMention(inputRef, inputText, setInputText);
  
  const { 
    projectFiles, 
    isLoading: isLoadingFiles, 
    getFilteredFiles 
  } = useProjectFiles(isDropdownOpen);

  // Enviar mensaje
  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!inputText.trim() && selectedFiles.length === 0) || isLoading) return;
    
    sendMessage(inputText.trim(), selectedFiles.map(f => f.path || f));
    setInputText('');
    setSelectedFiles([]);
    closeDropdown();
  };

  // Mostrar selector de modelo
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

  // Cambiar modelo
  const handleModelChange = (modelType) => {
    window.vscode?.postMessage({
      type: 'switchModel',
      payload: { modelType }
    });
    setIsModelDropdownOpen(false);
  };

  // Manejar la eliminación de un FileChip
  const handleRemoveFile = (fileToRemovePath) => {
    setSelectedFiles(prevFiles => prevFiles.filter(f => f !== fileToRemovePath));
    
    const fileNameToRemove = fileToRemovePath.split(/[\/\\]/).pop();
    const escapedFileName = fileNameToRemove.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const chipTextPattern = new RegExp(`\\[${escapedFileName}\\]\\s?`, 'g');
    
    setInputText(prevText => prevText.replace(chipTextPattern, '').trim());
  };

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [messages]);

  // Aplicar estilos
  const styles = getStyles(theme);
  const containerStyle = {
    ...styles.container,
    borderRadius: messages.length === 0 ? theme.borderRadius.medium : `${theme.borderRadius.medium} ${theme.borderRadius.medium} 0 0`
  };
  
  // Estilo para el contenedor de chips
  const fileChipsContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    padding: selectedFiles.length > 0 ? '8px 8px 0px 8px' : '0px',
    borderBottom: selectedFiles.length > 0 ? `1px solid ${theme.colors.border}` : 'none',
    gap: '4px'
  };

  return (
    <div style={containerStyle} ref={dropdownRef}>
      {/* Contenedor para los FileChips */}
      {selectedFiles.length > 0 && (
        <div style={fileChipsContainerStyle}>
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
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) handleSubmit(e);
              else if (e.key === "@") {
                const currentCursorPos = inputRef.current.selectionStart;
                openMentionDropdown(currentCursorPos);
              } else if (e.key === "Escape") closeDropdown();
            }}
            placeholder={selectedFiles.length > 0 
              ? "Add more details..." 
              : "Type your message... (Use @ to mention files)"}
            disabled={isLoading}
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
          searchTerm={searchTerm}
          filteredFiles={getFilteredFiles(searchTerm)}
          isLoading={isLoadingFiles}
          onSelectFile={insertFileMention}
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