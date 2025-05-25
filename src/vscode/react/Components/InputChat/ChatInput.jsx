// Nombre del archivo: ChatInput.jsx

import React, { useRef, useState, useEffect } from "react";

// Importar componentes
import ModelDropdown from './ModelDropdown';
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
  const [activeIndex, setActiveIndex] = useState(-1); // Para el FileDropdown, -1 para ninguna selección
  
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
    startMentionByButton 
  } = useFileMention(inputRef, inputText, setInputText);
  
  const { 
    // projectFiles, // No necesitamos la lista completa aquí directamente
    isLoading: isLoadingFiles, 
    getFilteredFiles 
  } = useProjectFiles(isDropdownOpen); // Fetch cuando el dropdown se abre

  const filteredMentionFiles = getFilteredFiles(searchTerm); // Archivos filtrados para la mención

  // Reset activeIndex cuando cambia el término de búsqueda o los archivos filtrados
  // o cuando el dropdown se abre/cierra.
  useEffect(() => {
    if (isDropdownOpen) {
        setActiveIndex(0); // Seleccionar el primer elemento por defecto
    } else {
        setActiveIndex(-1); // -1 cuando está cerrado para indicar ninguna selección
    }
  }, [searchTerm, filteredMentionFiles.length, isDropdownOpen]);


  // Enviar mensaje
  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!inputText.trim() && selectedFiles.length === 0) || isLoading) return;
    
    sendMessage(inputText.trim(), selectedFiles.map(f => f.path || f));
    setInputText('');
    setSelectedFiles([]); // Limpiar selectedFiles del hook useFileMention
    closeDropdown(); // Asegurarse que el dropdown de mención se cierre
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
    // El texto en el input es solo el nombre del archivo, no [fileName]
    const chipTextPattern = new RegExp(`${escapedFileName}\\s?`, 'g'); 
    
    setInputText(prevText => prevText.replace(chipTextPattern, '').trim());
  };

  const handleFileSelect = (filePath) => {
    // insertFileMention del hook se encarga de:
    // 1. Actualizar inputText
    // 2. Añadir a selectedFiles (si no está ya)
    // 3. Cerrar el dropdown
    // 4. Posicionar el cursor
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
          // Si no hay selección válida, o no hay archivos, Enter cierra el dropdown.
          closeDropdown();
        }
      } else if (e.key === "Escape") {
        e.preventDefault(); // Prevenir otros manejadores de Escape
        closeDropdown();
      }
      // Otros caracteres (letras, backspace, etc.) son manejados por onChange -> handleInputChange -> updateSearchTerm
    } else { // Dropdown CERRADO
      if (e.key === "Enter" && !e.shiftKey) {
        handleSubmit(e);
      } else if (e.key === "@") {
        // No e.preventDefault() para que '@' se escriba en el input.
        const currentCursorPos = inputRef.current.selectionStart;
        // openMentionDropdown establece isMentionMode, cursorPosition, etc. y abre el dropdown.
        openMentionDropdown(currentCursorPos); 
      }
    }
  };

  const handleInputChange = (e) => {
    const newText = e.target.value;
    setInputText(newText); // Actualiza el estado del input
    
    // Si estamos en modo mención, actualiza el término de búsqueda.
    // `updateSearchTerm` es llamado con el texto actual y la posición del cursor.
    // `cursorPosition` en el hook (la posición del '@') ya está establecida por `openMentionDropdown`.
    if (isMentionMode && inputRef.current) {
      const caretPosition = inputRef.current.selectionStart;
      updateSearchTerm(newText, caretPosition);
    }
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
    <div style={containerStyle} ref={dropdownRef}> {/* dropdownRef de useFileMention */}
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