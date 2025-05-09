import React, { useRef, useState } from "react";
import { EnterIcon } from "./Icons";
import { useTextareaResize } from "../../hooks/useTextareaResize";
import FileSelector from "./FileSelector";
import { useVSCodeContext } from "../../context/VSCodeContext";
import ModelDropdown from '../ModelSelector/ModelDropdown';

const ChatInput = () => {
  const { postMessage, isLoading, theme, currentModel, messages } = useVSCodeContext();
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const inputRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const modelOptions = [
    { value: 'ollama', label: 'Ollama' },
    { value: 'gemini', label: 'Gemini' }
  ];

  const styles = {
    container: {
      width: '100%',
      maxWidth: 'calc(100% - 24px)',
      borderRadius: '8px',
      backgroundColor: theme.colors.background,
      padding: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      boxSizing: 'border-box'
    },
    inputContainer: {
      display: 'flex',
      alignItems: 'center',
      position: 'relative'
    },
    input: {
      flex: 1,
      minWidth: 0,
      height: '38px',
      padding: '0 52px 0 16px',
      border: 'none',
      borderRadius: '4px',
      backgroundColor: theme.colors.chatInputBg,
      color: theme.colors.text,
      outline: 'none',
      boxSizing: 'border-box'
    },
    sendButton: {
      position: 'absolute',
      right: '8px',
      top: '50%',
      transform: 'translateY(-40%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '6px'
    },
    controlsRow: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '0 8px'
    },
    leftControls: {
      display: 'flex',
      gap: '12px'
    },
    rightControls: {
      display: 'flex',
      gap: '12px'
    },
    modelSelector: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      cursor: 'pointer',
      color: theme.colors.text,
      position: 'relative'
    },
    modelSelectorArrow: {
      marginLeft: '4px',
      transition: 'transform 0.2s',
      fontSize: '0.8em'
    },
  };

  const containerStyle = {
    ...styles.container,
    borderRadius: messages.length === 0 ? '8px' : '8px 8px 0 0'
  };
  
  console.log('ChatInput - messages length:', messages.length, 'borderRadius:', containerStyle.borderRadius);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    
    if (inputText.trim() !== "" || selectedFiles.length > 0) {
      postMessage('chat', {
        text: inputText,
        files: selectedFiles
      });
      setInputText("");
      setSelectedFiles([]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (files) => {
    setSelectedFiles(files);
  };

  const handleFileRemove = (file) => {
    setSelectedFiles(prev => prev.filter(f => f !== file));
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    postMessage('command', { 
      command: 'switchModel',
      modelType: newModel
    });
  };

  const handleModelClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const safeLeft = Math.min(rect.left, viewportWidth - 150); // Keep 150px from right edge
    
    setDropdownPosition({
      top: rect.top - 90,
      left: safeLeft,
      width: Math.max(rect.width, 120)
    });
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div style={containerStyle}>
      <div style={styles.inputContainer}>
        <input
          ref={inputRef}
          style={styles.input}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          type="text"
        />
        <button 
          style={styles.sendButton} 
          onClick={handleSubmit}
          disabled={isLoading || !inputText.trim()}
        >
          <EnterIcon color={inputText.trim() ? theme.colors.primary : theme.colors.disabled} />
        </button>
      </div>
      
      <div style={styles.controlsRow}>
        <div style={styles.leftControls}>
          <div style={styles.modelSelector} onClick={handleModelClick}>
            {currentModel}
            <div style={styles.modelSelectorArrow}>
              ▼
            </div>
          </div>
          {isDropdownOpen && (
            <ModelDropdown
              options={modelOptions}
              currentModel={currentModel}
              onSelect={(model) => {
                handleModelChange({ target: { value: model } });
                setIsDropdownOpen(false);
              }}
              position={dropdownPosition}
              theme={theme}
            />
          )}
        </div>
        <div style={styles.rightControls}>
          <FileSelector 
            onSelect={handleFileSelect}
            onRemove={handleFileRemove}
            files={selectedFiles}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatInput;