import React, { useRef, useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { useProjectFiles } from "./useProjectFiles";
import './styles/ChatInput.css'; // Importa los estilos CSS
import { useMentionMode } from "./useMentionMode";
import { DropdownArrowIcon, EnterIcon, FileIcon, ModelIcon } from "./Iconst";

const MODEL_OPTIONS = [
  { value: 'ollama', label: 'Ollama' },
  { value: 'gemini', label: 'Gemini' }
];


const FileChip = ({ fileName, onRemove }) => (
  <div className="file-chip" title={fileName}>
    <span className="file-chip-icon" role="img" aria-label="file icon">
      <FileIcon className="file-icon-svg" />
    </span>
    <span className="file-chip-name">{fileName}</span>
    <button
      className="file-chip-remove"
      onClick={onRemove}
      title="Remove file"
      aria-label={`Remove ${fileName}`}
    >×</button>
  </div>
);

const FileItem = ({ file, isActive, index, onSelect, onHover }) => (
  <li
    className={`file-item ${isActive ? 'active' : ''}`}
    onClick={() => onSelect(file)}
    onMouseEnter={() => onHover(index)}
    title={file.path}
    role="option"
    aria-selected={isActive}
    id={`file-item-${index}`}
  >
    <span className="file-item-icon" role="img" aria-label="file icon">
      <FileIcon />
    </span>
    <div className="file-item-info">
      <div className="file-item-name">{file.name}</div>
      <div className="file-item-path">{file.path}</div>
    </div>
  </li>
);

const FileDropdown = ({
  position, files, isLoading, onSelectFile, activeIndex, onSetActiveIndex
}) => {
  const listRef = useRef(null);

  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < files.length && listRef.current) {
      const activeItem = listRef.current.children[activeIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeIndex, files.length]);

  return (
    <div className="file-dropdown" style={{ top: position.top, left: position.left, width: position.width }}>
      <div className="file-dropdown-header">
        <span className="dropdown-header-icon" role="img" aria-label="file icon">
          <FileIcon />
        </span>
        Insert File
      </div>
      <ul className="file-dropdown-list" ref={listRef} role="listbox">
        {isLoading ? (
          <div className="file-dropdown-loading">
            <div className="loading-spinner"></div>
            Loading files...
          </div>
        ) : files.length > 0 ? (
          files.map((file, index) => (
            <FileItem
              key={file.path}
              file={file}
              isActive={index === activeIndex}
              index={index}
              onSelect={onSelectFile}
              onHover={onSetActiveIndex}
            />
          ))
        ) : (
          <div className="file-dropdown-empty">
            No matching files
          </div>
        )}
      </ul>
    </div>
  );
};

const ModelDropdown = ({ options, currentModel, onSelect, position }) => (
  <div className="model-dropdown" style={{ top: position.top, left: position.left, width: position.width }}>
    {options.map(option => (
      <div
        key={option.value}
        className={`model-dropdown-item ${option.value === currentModel ? 'active' : ''}`}
        onClick={() => onSelect(option.value)}
        role="option"
        aria-selected={option.value === currentModel}
      >
       {/*  <ModelIcon className="model-icon" /> */}
        <span className="model-label">{option.label}</span>
        {option.value === currentModel && <span className="model-selected">✓</span>}
      </div>
    ))}
  </div>
);


// Función para manejar el autoajuste del textarea
const useAutoResizeTextarea = (inputRef, value) => {
  useEffect(() => {
    if (!inputRef.current) return;
    
    // Solo ajustar la altura si hay contenido
    if (value && value.trim() !== '') {
      // Guardar el scroll position
      const scrollTop = window.scrollY;
      
      // Resetear la altura para obtener la altura de scroll correcta
      inputRef.current.style.height = 'auto';
      
      // Obtener el line-height calculado o usar 16px como valor por defecto
      const lineHeight = parseInt(getComputedStyle(inputRef.current).lineHeight) || 16;
      
      // Calcular la nueva altura (máx 12 filas)
      const maxHeight = lineHeight * 22; // 12 líneas
      const scrollHeight = inputRef.current.scrollHeight;
      const newHeight = Math.min(scrollHeight, maxHeight);
      
      // Ajustar la altura sin exceder el máximo
      inputRef.current.style.height = `${newHeight}px`;
      
      // Habilitar scroll solo cuando sea necesario
      inputRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
      
      // Restaurar el scroll position
      window.scrollTo(0, scrollTop);
    } else {
      // Si no hay contenido, restaurar la altura automática
      inputRef.current.style.height = 'auto';
      inputRef.current.style.overflowY = 'hidden';
    }
  }, [value, inputRef]);
};

const ChatInputUI = ({
  // Refs
  containerRef, inputRef, modelSelectorRef, // New ref for model selector
  // State & Data
  isLoading, inputText, selectedFiles, currentModel,
  isModelDropdownOpen, modelDropdownPosition, filteredMentionFiles, isLoadingFiles,
  // Handlers
  handleSubmit, handleInputChange, handleKeyDownInInput, handleModelClick,
  handleModelChange,
  // Mention-related props
  mentionHooks,
}) => {
  const canSubmit = (inputText.trim() || selectedFiles.length > 0) && !isLoading;

  return (
    <> {/* Fragment para renderizar múltiples elementos hermanos */}
      <div className="chat-input-container" ref={containerRef}>
        {selectedFiles.length > 0 && (
          <div className="file-chips-container">
            {selectedFiles.map((file) => (
              <FileChip
                key={file.path}
                fileName={file.name}
                onRemove={() => mentionHooks.removeFile(file)}
              />
            ))}
          </div>
        )}

        <div className="input-container">
          <div className="input-wrapper" onClick={() => inputRef.current?.focus()}>
            <textarea
              rows={1}
              ref={inputRef}
              className="chat-input"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDownInInput}
              placeholder={selectedFiles.length > 0 ? "Add more details..." : "Type your message... (Use @ to mention files)"}
              aria-autocomplete="list"
              aria-expanded={mentionHooks.isDropdownOpen}
              aria-controls={mentionHooks.isDropdownOpen ? "file-dropdown-listbox" : undefined}
              aria-activedescendant={mentionHooks.isDropdownOpen && mentionHooks.activeIndex >= 0 && filteredMentionFiles.length > 0 ? `file-item-${mentionHooks.activeIndex}` : undefined}
              disabled={isLoading}
            />
          </div>
          
          <button
            className={`send-button ${canSubmit ? 'enabled' : 'disabled'}`}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            <span className="send-button-glow"></span>
            <EnterIcon className="send-icon" />
          </button>
        </div>

        <div className="controls-row">
          <div className="left-controls">
            <div className="model-selector" ref={modelSelectorRef} onClick={handleModelClick}>
             {/*  <ModelIcon className="model-icon" /> */}
              <span className="model-name">{currentModel}</span>
              <DropdownArrowIcon className="dropdown-arrow" />
            </div>
          </div>
          
          <div className="right-controls">
            <button onClick={mentionHooks.startMentionByButton} className="file-button" title="Add file">
              <FileIcon className="file-button-icon" />
              <FileIcon className="file-button-icon" /> {/* Second icon for hover effect */}
            </button>
          </div>
        </div>
      </div>

      {/* Render FileDropdown and ModelDropdown as siblings of the main container */}
      {mentionHooks.isDropdownOpen && (
        <FileDropdown
          position={mentionHooks.dropdownPosition}
          files={filteredMentionFiles}
          isLoading={isLoadingFiles}
          onSelectFile={mentionHooks.insertFileMention}
          activeIndex={mentionHooks.activeIndex}
          onSetActiveIndex={mentionHooks.setActiveIndex}
        />
      )}

      {isModelDropdownOpen && (
        <ModelDropdown
          options={MODEL_OPTIONS}
          currentModel={currentModel}
          onSelect={handleModelChange}
          position={modelDropdownPosition}
        />
      )}
    </>
  );
};

const ChatInput = () => {
  const { sendMessage, isLoading, theme, currentModel, messages, postMessage } = useApp();
  
  // State
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelDropdownPosition, setModelDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  // Refs
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  
  // Usar el hook de autoajuste para el textarea
  useAutoResizeTextarea(inputRef, inputText);
  const modelSelectorRef = useRef(null); // Ref for the model selector button

  // Custom Hooks for logic encapsulation
  const { projectFiles, isLoadingFiles, loadFiles } = useProjectFiles(postMessage);
  const mentionHooks = useMentionMode(inputRef, projectFiles, selectedFiles, setSelectedFiles, inputText, setInputText);

  // Effects
  useEffect(() => {
    if (mentionHooks.isDropdownOpen) loadFiles();
  }, [mentionHooks.isDropdownOpen, loadFiles]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is outside the main container AND outside any dropdown
      // We need to check the event.target's ancestors for the dropdown classes
      const clickedInsideChatInput = containerRef.current && containerRef.current.contains(event.target);
      const clickedInsideFileDropdown = event.target.closest('.file-dropdown');
      const clickedInsideModelDropdown = event.target.closest('.model-dropdown');

      if (!clickedInsideChatInput && !clickedInsideFileDropdown && !clickedInsideModelDropdown) {
        mentionHooks.closeDropdown();
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mentionHooks]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [messages]);

  // Handlers
  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!inputText.trim() && selectedFiles.length === 0) || isLoading) return;
    sendMessage(inputText.trim(), selectedFiles);
    setInputText('');
    setSelectedFiles([]);
    mentionHooks.closeDropdown();
  };

  const handleModelClick = (e) => {
    // Use the ref for the model selector to get its position
    if (modelSelectorRef.current) {
      const rect = modelSelectorRef.current.getBoundingClientRect();
      // Position the dropdown above the button
      setModelDropdownPosition({ top: rect.top - (MODEL_OPTIONS.length * 35) - 10, left: rect.left, width: Math.max(rect.width, 120) });
      setIsModelDropdownOpen(prev => !prev);
    }
  };

  const handleModelChange = (modelType) => {
    window.vscode?.postMessage({ type: 'switchModel', payload: { modelType } });
    setIsModelDropdownOpen(false);
  };

  const handleKeyDownInInput = (e) => {
    const filteredFiles = projectFiles.filter(file =>
      !mentionHooks.searchTerm || file.name.toLowerCase().includes(mentionHooks.searchTerm.toLowerCase())
    );

    if (mentionHooks.isDropdownOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filteredFiles.length > 0) mentionHooks.setActiveIndex(prev => (prev + 1) % filteredFiles.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filteredFiles.length > 0) mentionHooks.setActiveIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (filteredFiles.length > 0 && mentionHooks.activeIndex >= 0) {
          mentionHooks.insertFileMention(filteredFiles[mentionHooks.activeIndex]);
        } else {
          mentionHooks.closeDropdown();
          handleSubmit(e);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        mentionHooks.closeDropdown();
      }
    } else {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    }
  };

  const handleInputChange = (e) => {
    const newText = e.target.value;
    setInputText(newText);
    // La actualización del menú de menciones se manejará en el efecto
  };

  // Efecto para manejar la detección de menciones cuando cambia el texto o la posición del cursor
  useEffect(() => {
    if (!inputRef.current) return;
    
    const textarea = inputRef.current;
    const cursorPos = textarea.selectionStart;
    
    // Verificar si hay un @ antes de la posición actual del cursor
    const textBeforeCursor = inputText.substring(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtPos !== -1) {
      // Verificar si el @ está al inicio o después de un espacio
      const charBeforeAt = lastAtPos > 0 ? inputText[lastAtPos - 1] : '';
      if (lastAtPos === 0 || /\s/.test(charBeforeAt)) {
        mentionHooks.updateSearchTerm(inputText, cursorPos);
        return;
      }
    }
    
    // Si no hay un @ válido, cerrar el menú si está abierto
    if (mentionHooks.isDropdownOpen) {
      mentionHooks.closeDropdown();
    }
  }, [inputText, inputRef.current?.selectionStart]); // Se ejecuta cuando cambia el texto o la posición del cursor

  // Derived Data
  const filteredMentionFiles = projectFiles.filter(file =>
    !mentionHooks.searchTerm || (file.name || '').toLowerCase().includes(mentionHooks.searchTerm.toLowerCase())
  );

  // Render the UI component, passing all necessary props
  return (
    <ChatInputUI
      containerRef={containerRef}
      inputRef={inputRef}
      modelSelectorRef={modelSelectorRef} // Pass the new ref
      theme={theme}
      isLoading={isLoading}
      inputText={inputText}
      selectedFiles={selectedFiles}
      currentModel={currentModel}
      isModelDropdownOpen={isModelDropdownOpen}
      modelDropdownPosition={modelDropdownPosition}
      filteredMentionFiles={filteredMentionFiles}
      isLoadingFiles={isLoadingFiles}
      handleSubmit={handleSubmit}
      handleInputChange={handleInputChange}
      handleKeyDownInInput={handleKeyDownInInput}
      handleModelClick={handleModelClick}
      handleModelChange={handleModelChange}
      mentionHooks={mentionHooks}
    />
  );
};

export default ChatInput;