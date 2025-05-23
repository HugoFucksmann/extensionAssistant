// Nombre del archivo: ChatInput.jsx

import React, { useRef, useState, useEffect } from "react";


import ModelDropdown from '../ModelSelector/ModelDropdown';
import FileChip from './FileChip'; // Importar FileChip

import { useProjectFiles } from './useProjectFiles';
import { useFileMention } from './useFileMention';
import { getStyles } from './ChatInputStyles';
import FileDropdown from "./fileDropdown";
import { EnterIcon, FileIcon } from "./Icons";
import { useVSCodeContext } from "../../context/VSCodeContext";

const ChatInput = () => {
  // const { postMessage, isLoading, theme, currentModel, messages } = useVSCodeContext(); // CAMBIAR
  const { sendMessage, postCommand, isLoading, theme, currentModel, messages } = useVSCodeContext(); // AÑADIR sendMessage, postCommand
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
    setSelectedFiles, // Asegurarse de obtener esto de useFileMention
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
  
  // Aplicar estilos
  const styles = getStyles(theme);
  const containerStyle = {
    ...styles.container,
    borderRadius: messages.length === 0 ? theme.borderRadius.medium : `${theme.borderRadius.medium} ${theme.borderRadius.medium} 0 0`
  };
  
  // Estilo para el contenedor de chips (nuevo)
  const fileChipsContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    padding: selectedFiles.length > 0 ? '8px 8px 0px 8px' : '0px', // Espacio solo si hay chips
    borderBottom: selectedFiles.length > 0 ? `1px solid ${theme.colors.border}` : 'none', // Separador visual
    gap: '4px', // Espacio entre chips
  };

  // Obtener archivos filtrados
  const filteredFiles = getFilteredFiles(searchTerm);
  
  // Manejar teclas especiales
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (isDropdownOpen) {
        e.preventDefault();
        const filtered = getFilteredFiles(searchTerm);
        if (filtered.length > 0) {
          insertFileMention(filtered[0]);
        } else {
          closeDropdown();
        }
      } else if (isMentionMode) {
        e.preventDefault();
        completeMention(getFilteredFiles(searchTerm));
      } else if (!e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    } else if (e.key === "@") {
      const currentCursorPos = inputRef.current.selectionStart;
      openMentionDropdown(currentCursorPos);
    } else if (e.key === "Escape") {
      closeDropdown();
    } else if (e.key === "Backspace" && isMentionMode) {
      // La lógica de borrado ahora es manejada por updateSearchTerm
    }
  };

  // Manejar cambios en el input
  const handleInputChange = (e) => {
    const newText = e.target.value;
    setInputText(newText);

    const currentCaretPos = e.target.selectionStart;

    if (isMentionMode) {
      updateSearchTerm(newText, currentCaretPos);
    }
  };

  // Enviar mensaje
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() && selectedFiles.length === 0 || isLoading) return; // Modificar condición

    // Enviar mensaje usando el nuevo método sendMessage
    sendMessage(inputText, selectedFiles); // CAMBIO: Usar sendMessage
    setInputText('');
    setSelectedFiles([]); // Limpiar archivos seleccionados
  };

  // Mostrar selector de modelo
  const handleModelClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const safeLeft = Math.min(rect.left, viewportWidth - 150);
    
    setModelDropdownPosition({
      top: rect.top - 90, // Ajustar según sea necesario
      left: safeLeft,
      width: Math.max(rect.width, 120)
    });
    setIsModelDropdownOpen(!isModelDropdownOpen);
  };

  // Cambiar modelo
  const handleModelChange = (modelType) => {
    // CAMBIO: Usar postCommand directamente
    postCommand('switchModel', { modelType });
    setIsModelDropdownOpen(false);
  };

  // Manejar la eliminación de un FileChip (nuevo)
  const handleRemoveFile = (fileToRemovePath) => {
    // 1. Eliminar de selectedFiles
    setSelectedFiles(prevFiles => prevFiles.filter(f => f !== fileToRemovePath));

    // 2. Eliminar el placeholder [fileName] del inputText
    const fileNameToRemove = fileToRemovePath.split(/[\/\\]/).pop();
    // Escapar caracteres especiales en el nombre del archivo para usar en RegExp
    const escapedFileName = fileNameToRemove.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const chipTextPattern = new RegExp(`\\[${escapedFileName}\\]\\s?`, 'g'); // Busca "[fileName]" opcionalmente seguido de un espacio
    
    setInputText(prevText => {
        const newText = prevText.replace(chipTextPattern, '');
        // Si el input queda vacío o solo con espacios, limpiarlo completamente
        return newText.trim() === '' ? '' : newText;
    });
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages]);

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
              padding: 0, // El padding se maneja en styles.input
              margin: 0,
            }}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={selectedFiles.length > 0 ? "Add more details or mention files..." : "Type your message... (Use @ to mention files)"}
          />
        </div>
        
        <button 
          style={styles.sendButton} 
          onClick={handleSubmit}
          disabled={isLoading || (!inputText.trim() && selectedFiles.length === 0)}
        >
          <EnterIcon color={(inputText.trim() || selectedFiles.length > 0) ? theme.colors.primary : theme.colors.disabled} />
        </button>
        
        {isDropdownOpen && (
          <FileDropdown
            theme={theme}
            position={dropdownPosition}
            searchTerm={searchTerm}
            filteredFiles={filteredFiles}
            isLoading={isLoadingFiles}
            onSelectFile={insertFileMention}
          />
        )}
      </div>
      
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