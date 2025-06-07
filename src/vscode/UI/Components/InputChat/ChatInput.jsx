import React, { useRef, useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";

// Constants
const MODEL_OPTIONS = [
  { value: 'ollama', label: 'Ollama' },
  { value: 'gemini', label: 'Gemini' }
];

// Icons
const EnterIcon = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
    <path d="M8 12l-4-4h3V4h2v4h3l-4 4z"/>
  </svg>
);

const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2h8l4 4v8H2V2zm8 0v4h4"/>
  </svg>
);

// Utility functions
const getFileName = (filePath) => filePath.split(/[\/\\]/).pop();

// Components
const FileChip = ({ fileName, onRemove, theme }) => (
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSlightlyDarker || '#e0e0e0',
    color: theme.colors.textSecondary || '#666',
    padding: '3px 8px',
    borderRadius: theme.borderRadius.medium || '16px',
    marginRight: '8px',
    marginBottom: '8px',
    fontSize: '13px',
    cursor: 'default',
    boxShadow: `0 1px 2px ${theme.colors.shadow || 'rgba(0,0,0,0.1)'}`,
  }} title={fileName}>
    <span style={{marginRight: '6px'}} role="img" aria-label="file icon">📄</span>
    <span style={{
      maxWidth: '150px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>{fileName}</span>
    <button
      style={{
        marginLeft: '8px',
        background: 'transparent',
        border: 'none',
        color: theme.colors.textSecondary || '#666',
        cursor: 'pointer',
        padding: '0',
        fontSize: '16px',
      }}
      onClick={onRemove}
      title="Remove file"
      aria-label={`Remove ${fileName}`}
    >×</button>
  </div>
);

const FileItem = ({ file, isActive, index, theme, onSelect, onHover }) => (
  <li 
    style={{
      padding: '8px 12px',
      cursor: 'pointer',
      fontSize: '12px',
      backgroundColor: isActive ? (theme.colors.primary || '#007acc') : 'transparent',
      color: isActive ? (theme.colors.primaryText || '#ffffff') : theme.colors.text,
      borderBottom: `1px solid ${theme.colors.border}`,
    }}
    onClick={() => onSelect(file)}
    onMouseEnter={() => onHover(index)}
    title={file.path}
    role="option"
    aria-selected={isActive}
    id={`file-item-${index}`}
  >
    <div style={{ fontWeight: 'bold' }}>{file.name}</div>
    <div style={{ 
      fontSize: '10px', 
      color: isActive ? 'rgba(255, 255, 255, 0.7)' : 'rgba(121, 121, 121, 0.6)',
      fontStyle: 'italic',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>{file.path}</div>
  </li>
);

const FileDropdown = ({ 
  theme, position, files, isLoading, onSelectFile, activeIndex, onSetActiveIndex 
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
    <div style={{
      position: 'fixed',
      top: position.top,
      left: position.left,
      width: position.width,
      backgroundColor: theme.colors.dropdownBg || theme.colors.background,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '4px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '250px',
    }}>
      <div style={{
        padding: '4px',
        borderBottom: `1px solid ${theme.colors.border}`,
        fontWeight: 'bold',
        fontSize: '10px',
        color: theme.colors.text,
      }}>Insert File</div>
      <ul style={{
        margin: 0,
        padding: 0,
        listStyle: 'none',
        overflowY: 'auto',
        flexGrow: 1,
      }} ref={listRef}>
        {isLoading ? (
          <li style={{ padding: '6px', textAlign: 'center', color: theme.colors.textMuted, fontSize: '10px' }}>
            Loading files...
          </li>
        ) : files.length > 0 ? (
          files.map((file, index) => (
            <FileItem 
              key={file.path} 
              file={file} 
              isActive={index === activeIndex} 
              index={index}
              theme={theme}
              onSelect={onSelectFile}
              onHover={onSetActiveIndex}
            />
          ))
        ) : (
          <li style={{ padding: '6px', textAlign: 'center', color: theme.colors.textMuted, fontSize: '10px' }}>
            No matching files
          </li>
        )}
      </ul>
    </div>
  );
};

const ModelDropdown = ({ options, currentModel, onSelect, position, theme }) => (
  <div style={{
    position: 'fixed',
    top: position.top,
    left: position.left,
    width: position.width,
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    zIndex: 9999,
    overflow: 'hidden'
  }}>
    {options.map(option => (
      <div 
        key={option.value}
        style={{
          padding: '8px 16px',
          cursor: 'pointer',
          color: theme.colors.text,
          backgroundColor: option.value === currentModel ? theme.colors.chatInputBg : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (option.value !== currentModel) {
            e.target.style.backgroundColor = theme.colors.chatInputBg || theme.colors.secondary;
          }
        }}
        onMouseLeave={(e) => {
          if (option.value !== currentModel) {
            e.target.style.backgroundColor = 'transparent';
          }
        }}
        onClick={() => onSelect(option.value)}
      >
        {option.label}
      </div>
    ))}
  </div>
);

// Custom hooks
const useProjectFiles = (postMessage) => {
  const [projectFiles, setProjectFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const loadFiles = useCallback(() => {
    if (isLoadingFiles || hasLoadedOnce) return;
    
    setIsLoadingFiles(true);
    postMessage("command", { command: "getProjectFiles" });
  }, [postMessage, isLoadingFiles, hasLoadedOnce]);

  useEffect(() => {
    const handleMessage = (event) => {
      const message = event.data;
      if (message.type === "projectFiles") {
        setProjectFiles(message.payload.files || []);
        setIsLoadingFiles(false);
        setHasLoadedOnce(true);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return { projectFiles, isLoadingFiles, loadFiles };
};

const useMentionMode = (inputRef, projectFiles, selectedFiles, setSelectedFiles, inputText, setInputText) => {
  const [isMentionMode, setIsMentionMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
    if (isMentionMode) {
      setIsMentionMode(false);
      setSearchTerm('');
    }
  }, [isMentionMode]);

  const openMentionDropdown = useCallback((atPosition) => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.top - 220, 
      left: rect.left, 
      width: rect.width 
    });
    setCursorPosition(atPosition);
    setIsMentionMode(true);
    setIsDropdownOpen(true);
    setSearchTerm('');
  }, [inputRef]);

  const insertFileMention = useCallback((file) => {
    const fileName = file.name;
    const textToInsert = `${fileName} `;
    
    const textBeforeAt = inputText.substring(0, cursorPosition);
    const lengthOfReplacedText = 1 + searchTerm.length;
    const textAfterMentionPoint = inputText.substring(cursorPosition + lengthOfReplacedText);
    
    const newText = `${textBeforeAt}${textToInsert}${textAfterMentionPoint}`;
    setInputText(newText);
    
    if (!selectedFiles.some(f => f.path === file.path)) {
      setSelectedFiles(prev => [...prev, file]);
    }
    
    closeDropdown();
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const finalCursorPos = textBeforeAt.length + textToInsert.length;
        inputRef.current.setSelectionRange(finalCursorPos, finalCursorPos);
      }
    }, 0);
  }, [inputText, cursorPosition, searchTerm, setInputText, selectedFiles, setSelectedFiles, closeDropdown, inputRef]);

  const removeFile = useCallback((fileToRemove) => {
    setSelectedFiles(prev => prev.filter(f => f.path !== fileToRemove.path));
    
    // Remove filename from text
    const fileName = fileToRemove.name;
    const newText = inputText.replace(fileName, '').replace(/\s+/g, ' ').trim();
    setInputText(newText);
  }, [inputText, setInputText, setSelectedFiles]);

  const updateSearchTerm = useCallback((currentTextValue, caretPositionInInput) => {
    if (isMentionMode && caretPositionInInput >= cursorPosition) {
      if (currentTextValue[cursorPosition] === '@') {
        const textAfterAt = currentTextValue.substring(cursorPosition + 1, caretPositionInInput);
        setSearchTerm(textAfterAt);
        if (!isDropdownOpen) {
          setIsDropdownOpen(true); 
        }
      } else {
        closeDropdown();
      }
    } else if (isMentionMode && caretPositionInInput < cursorPosition) {
      closeDropdown();
    }
  }, [isMentionMode, cursorPosition, isDropdownOpen, closeDropdown]);

  const startMentionByButton = useCallback(() => {
    if (!inputRef.current) return;
    
    const currentCaret = inputRef.current.selectionStart;
    const textBefore = inputText.substring(0, currentCaret);
    const textAfter = inputText.substring(currentCaret);
    
    const tempTextWithAt = `${textBefore}@${textAfter}`;
    setInputText(tempTextWithAt);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(currentCaret + 1, currentCaret + 1); 
      }
      openMentionDropdown(currentCaret); 
    }, 0);
  }, [inputRef, inputText, setInputText, openMentionDropdown]);

  useEffect(() => {
    if (isDropdownOpen) {
      setActiveIndex(0);
    } else {
      setActiveIndex(-1);
    }
  }, [searchTerm, isDropdownOpen]);

  return {
    isMentionMode,
    isDropdownOpen,
    dropdownPosition,
    searchTerm,
    activeIndex,
    setActiveIndex,
    closeDropdown,
    openMentionDropdown,
    insertFileMention,
    removeFile,
    updateSearchTerm,
    startMentionByButton
  };
};

// Main ChatInput Component
const ChatInput = () => {
  const { sendMessage, isLoading, theme, currentModel, messages, postMessage } = useApp();
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelDropdownPosition, setModelDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const { projectFiles, isLoadingFiles, loadFiles } = useProjectFiles(postMessage);
  const mentionHooks = useMentionMode(
    inputRef, 
    projectFiles, 
    selectedFiles, 
    setSelectedFiles, 
    inputText, 
    setInputText
  );

  // Load files when dropdown opens (only once)
  useEffect(() => {
    if (mentionHooks.isDropdownOpen) {
      loadFiles();
    }
  }, [mentionHooks.isDropdownOpen, loadFiles]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          inputRef.current && !inputRef.current.contains(event.target)) {
        mentionHooks.closeDropdown();
      }
    };
    
    if (mentionHooks.isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mentionHooks.isDropdownOpen, mentionHooks.closeDropdown]);

  // Focus input on new messages
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [messages]);

  // Event handlers
  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!inputText.trim() && selectedFiles.length === 0) || isLoading) return;
    
    sendMessage(inputText.trim(), selectedFiles);
    setInputText('');
    setSelectedFiles([]); 
    mentionHooks.closeDropdown(); 
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

  const handleKeyDownInInput = (e) => {
    if (mentionHooks.isDropdownOpen) {
      const filteredFiles = projectFiles.filter(file => 
        !mentionHooks.searchTerm || 
        file.name.toLowerCase().includes(mentionHooks.searchTerm.toLowerCase())
      );
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filteredFiles.length > 0) {
          mentionHooks.setActiveIndex(prev => (prev + 1) % filteredFiles.length);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filteredFiles.length > 0) {
          mentionHooks.setActiveIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
        }
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); 
        if (filteredFiles.length > 0 && mentionHooks.activeIndex >= 0 && mentionHooks.activeIndex < filteredFiles.length) {
          mentionHooks.insertFileMention(filteredFiles[mentionHooks.activeIndex]);
        } else {
          mentionHooks.closeDropdown();
        }
      } else if (e.key === "Escape") {
        e.preventDefault(); 
        mentionHooks.closeDropdown();
      }
    } else { 
      if (e.key === "Enter" && !e.shiftKey) {
        handleSubmit(e);
      } else if (e.key === "@") {
        const currentCursorPos = inputRef.current.selectionStart;
        mentionHooks.openMentionDropdown(currentCursorPos); 
      }
    }
  };

  const handleInputChange = (e) => {
    const newText = e.target.value;
    setInputText(newText); 
    
    if (mentionHooks.isMentionMode && inputRef.current) {
      const caretPosition = inputRef.current.selectionStart;
      mentionHooks.updateSearchTerm(newText, caretPosition);
    }
  };

  // Styles
  const styles = {
    container: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      padding: '4px',
      backgroundColor: theme.colors.background,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.medium,
    },
    inputContainer: {
      display: 'flex',
      alignItems: 'center',
      padding: '4px',
      borderBottom: `1px solid ${theme.colors.border}`,
    },
    input: {
      flex: 1,
      padding: '8px',
      fontSize: theme.typography.text,
      fontFamily: 'inherit',
      color: theme.colors.text,
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
    },
    sendButton: {
      padding: '8px',
      fontSize: theme.typography.text,
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
      padding: '4px',
    },
    leftControls: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    modelSelector: {
      padding: '4px',
      fontSize: theme.typography.small,
      fontFamily: 'inherit',
      color: theme.colors.text,
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      cursor: 'pointer',
    },
    rightControls: {
      display: 'flex',
      alignItems: 'center',
    },
    fileButton: {
      padding: '4px',
      fontSize: theme.typography.text,
      fontFamily: 'inherit',
      color: theme.colors.primary,
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      cursor: 'pointer',
    },
  };

  // Debug: log the structure of projectFiles
  console.log('Project files:', projectFiles);
  console.log('Search term:', mentionHooks.searchTerm);

  const filteredMentionFiles = projectFiles.filter(file => {
    // Handle different possible file structures
    const fileName = file.name || file.path?.split('/').pop() || '';
    const searchTerm = mentionHooks.searchTerm || '';
    
    console.log('Filtering file:', fileName, 'with term:', searchTerm);
    
    return !searchTerm || fileName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={styles.container} ref={dropdownRef}> 
      {selectedFiles.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          padding: '8px 8px 0px 8px',
          borderBottom: `1px solid ${theme.colors.border}`,
          gap: '4px'
        }}>
          {selectedFiles.map((file) => (
            <FileChip
              key={file.path}
              fileName={file.name}
              onRemove={() => mentionHooks.removeFile(file)}
              theme={theme}
            />
          ))}
        </div>
      )}

      <div style={styles.inputContainer}>
        <div style={styles.input} onClick={() => inputRef.current?.focus()}>
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
            aria-autocomplete="list"
            aria-expanded={mentionHooks.isDropdownOpen}
            aria-controls={mentionHooks.isDropdownOpen ? "file-dropdown-listbox" : undefined}
            aria-activedescendant={mentionHooks.isDropdownOpen && mentionHooks.activeIndex >=0 && filteredMentionFiles.length > 0 ? `file-item-${mentionHooks.activeIndex}` : undefined}
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

      <div style={styles.controlsRow}>
        <div style={styles.leftControls}>
          <div style={styles.modelSelector} onClick={handleModelClick}>
            {currentModel}
            <div style={{
              display: 'inline-flex',
              fontSize: theme.typography.small,
              fontFamily: 'inherit',
              color: theme.colors.text,
              marginLeft: '8px',
            }}>▼</div>
          </div>
          
          {isModelDropdownOpen && (
            <ModelDropdown
              options={MODEL_OPTIONS}
              currentModel={currentModel}
              onSelect={handleModelChange}
              position={modelDropdownPosition}
              theme={theme}
            />
          )}
        </div>
        
        <div style={styles.rightControls}>
          <button
            onClick={mentionHooks.startMentionByButton}
            style={styles.fileButton}
            title="Add file"
          >
            <FileIcon />
          </button>
        </div>
      </div>

      {mentionHooks.isDropdownOpen && (
        <FileDropdown
          theme={theme}
          position={mentionHooks.dropdownPosition}
          files={filteredMentionFiles}
          isLoading={isLoadingFiles}
          onSelectFile={mentionHooks.insertFileMention}
          activeIndex={mentionHooks.activeIndex}
          onSetActiveIndex={mentionHooks.setActiveIndex}
        />
      )}
    </div>
  );
};

export default ChatInput;