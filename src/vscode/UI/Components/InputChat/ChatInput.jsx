import React, { useRef, useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useProjectFiles } from "./useProjectFiles";
import { useMentionMode } from "./useMentionMode";
import { DropdownArrowIcon, EnterIcon, FileIcon } from "./Iconst";
import './styles/ChatInput.css';

const MODEL_OPTIONS = [
  { value: 'ollama', label: 'Ollama' },
  { value: 'gemini', label: 'Gemini' }
];

// Componentes separados pero simplificados
const FileChip = ({ fileName, onRemove }) => (
  <div className="file-chip" title={fileName}>
    <FileIcon className="file-icon-svg margin-icon-right" />
    <span className="file-chip-name">{fileName}</span>
    <button className="file-chip-remove" onClick={onRemove} title="Remove file">×</button>
  </div>
);

const FileItem = ({ file, isActive, index, onSelect, onHover }) => (
  <li
    className={`file-item ${isActive ? 'active' : ''}`}
    onClick={() => onSelect(file)}
    onMouseEnter={() => onHover(index)}
    title={file.path}
  >
    <FileIcon className="margin-icon-right" />
    <div className="file-item-info">
      <div className="file-item-name">{file.name}</div>
      <div className="file-item-path">{file.path}</div>
    </div>
  </li>
);

const FileDropdown = ({ position, files, isLoading, onSelectFile, activeIndex, onSetActiveIndex }) => (
  <div className="file-dropdown" style={position}>
    <div className="file-dropdown-header">
      <FileIcon />
      Insert File
    </div>
    <ul className="file-dropdown-list">
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
        <div className="file-dropdown-empty">No matching files</div>
      )}
    </ul>
  </div>
);

const ModelDropdown = ({ options, currentModel, onSelect, position }) => (
  <div className="model-dropdown" style={position}>
    {options.map(option => (
      <div
        key={option.value}
        className={`model-dropdown-item ${option.value === currentModel ? 'active' : ''}`}
        onClick={() => onSelect(option.value)}
      >
        <span className="model-label">{option.label}</span>
        {option.value === currentModel && <span className="model-selected">✓</span>}
      </div>
    ))}
  </div>
);

// Hook personalizado para auto-resize
const useAutoResize = (ref, value) => {
  useEffect(() => {
    if (!ref.current || !value?.trim()) {
      if (ref.current) {
        ref.current.style.height = 'auto';
        ref.current.style.overflowY = 'hidden';
      }
      return;
    }

    const textarea = ref.current;
    const scrollTop = window.scrollY;
    
    textarea.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 16;
    const maxHeight = lineHeight * 22;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    
    window.scrollTo(0, scrollTop);
  }, [value]);
};

// Hook para manejar dropdowns
const useDropdowns = (containerRef, mentionHooks) => {
  const [modelDropdown, setModelDropdown] = useState({ open: false, position: {} });
  const modelSelectorRef = useRef(null);

  const handleModelClick = () => {
    if (modelSelectorRef.current) {
      const rect = modelSelectorRef.current.getBoundingClientRect();
      setModelDropdown({
        open: !modelDropdown.open,
        position: {
          top: rect.top - (MODEL_OPTIONS.length * 35) - 10,
          left: rect.left,
          width: Math.max(rect.width, 120)
        }
      });
    }
  };

  const closeModelDropdown = () => setModelDropdown(prev => ({ ...prev, open: false }));

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideMain = containerRef.current?.contains(event.target);
      const isInsideFile = event.target.closest('.file-dropdown');
      const isInsideModel = event.target.closest('.model-dropdown');

      if (!isInsideMain && !isInsideFile && !isInsideModel) {
        mentionHooks.closeDropdown();
        closeModelDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mentionHooks]);

  return {
    modelDropdown,
    modelSelectorRef,
    handleModelClick,
    closeModelDropdown
  };
};

const ChatInput = () => {
  const { sendMessage, isLoading, currentModel, messages, postMessage } = useApp();
  
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  
  useAutoResize(inputRef, inputText);
  
  const { projectFiles, isLoadingFiles, loadFiles } = useProjectFiles(postMessage);
  const mentionHooks = useMentionMode(inputRef, projectFiles, selectedFiles, setSelectedFiles, inputText, setInputText);
  const { modelDropdown, modelSelectorRef, handleModelClick, closeModelDropdown } = useDropdowns(containerRef, mentionHooks);

  // Cargar archivos cuando se abre el dropdown
  useEffect(() => {
    if (mentionHooks.isDropdownOpen) loadFiles();
  }, [mentionHooks.isDropdownOpen, loadFiles]);

  // Enfocar input después de mensajes
  useEffect(() => {
    inputRef.current?.focus();
  }, [messages]);

  // Detectar menciones
  useEffect(() => {
    if (!inputRef.current) return;
    
    const cursorPos = inputRef.current.selectionStart;
    const textBeforeCursor = inputText.substring(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtPos !== -1) {
      const charBeforeAt = lastAtPos > 0 ? inputText[lastAtPos - 1] : '';
      if (lastAtPos === 0 || /\s/.test(charBeforeAt)) {
        mentionHooks.updateSearchTerm(inputText, cursorPos);
        return;
      }
    }
    
    if (mentionHooks.isDropdownOpen) {
      mentionHooks.closeDropdown();
    }
  }, [inputText, inputRef.current?.selectionStart]);

  // Handlers
  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!inputText.trim() && selectedFiles.length === 0) || isLoading) return;
    
    sendMessage(inputText.trim(), selectedFiles);
    setInputText('');
    setSelectedFiles([]);
    mentionHooks.closeDropdown();
  };

  const handleModelChange = (modelType) => {
    window.vscode?.postMessage({ type: 'switchModel', payload: { modelType } });
    closeModelDropdown();
  };

  const handleKeyDown = (e) => {
    const filteredFiles = projectFiles.filter(file =>
      !mentionHooks.searchTerm || file.name.toLowerCase().includes(mentionHooks.searchTerm.toLowerCase())
    );

    if (mentionHooks.isDropdownOpen) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (filteredFiles.length > 0) {
            mentionHooks.setActiveIndex(prev => (prev + 1) % filteredFiles.length);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (filteredFiles.length > 0) {
            mentionHooks.setActiveIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
          }
          break;
        case "Enter":
          if (!e.shiftKey) {
            e.preventDefault();
            if (filteredFiles.length > 0 && mentionHooks.activeIndex >= 0) {
              mentionHooks.insertFileMention(filteredFiles[mentionHooks.activeIndex]);
            } else {
              mentionHooks.closeDropdown();
              handleSubmit(e);
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          mentionHooks.closeDropdown();
          break;
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const filteredMentionFiles = projectFiles.filter(file =>
    !mentionHooks.searchTerm || file.name.toLowerCase().includes(mentionHooks.searchTerm.toLowerCase())
  );

  const canSubmit = (inputText.trim() || selectedFiles.length > 0) && !isLoading;

  return (
    <>
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
              ref={inputRef}
              className="chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedFiles.length > 0 ? "Add more details..." : "Type your message... (Use @ to mention files)"}
              disabled={isLoading}
              rows={1}
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
              <span className="model-name">{currentModel}</span>
              <DropdownArrowIcon className="dropdown-arrow" />
            </div>
          </div>
          
          <div className="right-controls">
            <button onClick={mentionHooks.startMentionByButton} className="file-button" title="Add file">
              <FileIcon className="file-button-icon" />
              <FileIcon className="file-button-icon" />
            </button>
          </div>
        </div>
      </div>

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

      {modelDropdown.open && (
        <ModelDropdown
          options={MODEL_OPTIONS}
          currentModel={currentModel}
          onSelect={handleModelChange}
          position={modelDropdown.position}
        />
      )}
    </>
  );
};

export default ChatInput;