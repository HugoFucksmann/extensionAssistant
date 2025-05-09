import React, { useRef, useState, useEffect } from "react";
import { EnterIcon, FileIcon } from "./Icons";
import { useVSCodeContext } from "../../context/VSCodeContext";
import ModelDropdown from '../ModelSelector/ModelDropdown';
import { styles } from "./ChatInputStyles";

const ChatInput = () => {
  const { postMessage, isLoading, theme, currentModel, messages } = useVSCodeContext();
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); // Full paths for backend
  const [mentionedFiles, setMentionedFiles] = useState({}); // Maps chip text (e.g., "[auth.js]") to full path
  const inputRef = useRef(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelDropdownPosition, setModelDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const [isMentionDropdownOpen, setIsMentionDropdownOpen] = useState(false);
  const [mentionDropdownPosition, setMentionDropdownPosition] = useState({ top: 0, left: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFiles, setProjectFiles] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0); // Position of @ or where button initiated mention
  const dropdownRef = useRef(null);
  const [mentionMode, setMentionMode] = useState(false);

  const modelOptions = [
    { value: 'ollama', label: 'Ollama' },
    { value: 'gemini', label: 'Gemini' }
  ];

  const containerStyle = {
    ...styles(theme).container,
    borderRadius: messages.length === 0 ? theme.borderRadius.medium : `${theme.borderRadius.medium} ${theme.borderRadius.medium} 0 0`
  };
  
  const getFileItemStyle = (isHovered) => ({
    ...styles(theme).fileItem,
    backgroundColor: isHovered ? (theme.colors.hoverBg || '#f0f0f0') : 'transparent'
  });

  // No longer needed if [fileName] is plain text in input
  // const fileChipStyle = { ... }; 

  useEffect(() => {
    if (isMentionDropdownOpen) {
      postMessage("command", { command: "getProjectFiles" });
    }
  }, [isMentionDropdownOpen, postMessage]);

  useEffect(() => {
    const handleMessage = (event) => {
      const message = event.data;
      if (message.type === "projectFiles") {
        const filteredFiles = message.payload.files.filter(file => 
          !file.includes('node_modules/') && 
          !file.includes('node_modules\\') &&
          !file.includes('.git/') &&
          !file.includes('.git\\') &&
          !file.endsWith('/') &&
          !file.endsWith('\\')
        );
        setProjectFiles(filteredFiles);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMentionDropdownOpen(false);
        // Do not reset searchTerm here if we want to complete on Enter without dropdown
        // setSearchTerm(""); 
        // setMentionMode(false); // Only close dropdown, keep mentionMode if user typed @
      }
    };
    if (isMentionDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMentionDropdownOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    
    let finalText = inputText;
    
    // The `selectedFiles` state already holds the full paths of mentioned files.
    // `finalText` will contain "revisa mi [auth.js]"
    if (inputText.trim() !== "" || selectedFiles.length > 0) {
      postMessage('chat', {
        text: finalText,
        files: selectedFiles // Send the array of full file paths
      });
      
      setInputText("");
      setSelectedFiles([]);
      setMentionedFiles({});
      // No need for setFileMentions if it was tracking @positions
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (isMentionDropdownOpen) {
        e.preventDefault();
        const filtered = getFilteredFiles();
        if (filtered.length > 0) {
          insertFileMention(filtered[0]);
        } else {
          // No match, just close dropdown and exit mention mode
          setIsMentionDropdownOpen(false);
          setMentionMode(false);
        }
      } else if (mentionMode) { // User typed @something then Enter without dropdown (e.g. dropdown closed by Esc)
        e.preventDefault();
        completeMention();
      } else if (!e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    } else if (e.key === "@") {
      // No setMentionMode(true) here, handleInputChange will do it if @ is typed
      // This allows typing @ as a character if not followed by text for search
      const currentCursorPos = inputRef.current.selectionStart;
      setCursorPosition(currentCursorPos); // Store position of @
      // Open dropdown immediately or wait for next char? Let's open.
      
      // Delay opening dropdown slightly to allow handleInputChange to set mentionMode and searchTerm
      setTimeout(() => {
        if (inputRef.current) { // Check if inputRef is still valid
            const rect = inputRef.current.getBoundingClientRect();
            const textBeforeCursor = inputText.substring(0, currentCursorPos);
            const lastNewlinePos = textBeforeCursor.lastIndexOf('\n');
            const currentLineText = lastNewlinePos >= 0 ? textBeforeCursor.substring(lastNewlinePos + 1) : textBeforeCursor;
            
            // A more robust way to get cursor X: create a temporary span
            const tempSpan = document.createElement('span');
            tempSpan.style.font = window.getComputedStyle(inputRef.current).font;
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.position = 'absolute';
            tempSpan.textContent = currentLineText + "@"; // Include the @
            document.body.appendChild(tempSpan);
            const cursorX = tempSpan.offsetWidth;
            document.body.removeChild(tempSpan);

            setMentionDropdownPosition({
                top: rect.bottom + 5, // Position below input
                left: rect.left + (inputRef.current.paddingLeft || 0) + cursorX - (tempSpan.textContent.endsWith("@") ? (tempSpan.offsetWidth / tempSpan.textContent.length) : 0) // Adjust for @
            });
            setSearchTerm(""); // Reset search term for the new @
            setIsMentionDropdownOpen(true);
            setMentionMode(true); // Explicitly set mention mode
        }
      }, 0);

    } else if (e.key === "Escape") {
      setIsMentionDropdownOpen(false);
      setMentionMode(false); // Exit mention mode on Escape
      setSearchTerm("");
    } else if (e.key === "Backspace" && mentionMode) {
        const curPos = inputRef.current.selectionStart;
        // If backspacing the @ character that started the mention
        if (curPos === cursorPosition && inputText[cursorPosition-1] === '@') { 
            setMentionMode(false);
            setIsMentionDropdownOpen(false);
            setSearchTerm("");
        }
    }
  };

  const handleInputChange = (e) => {
    const newText = e.target.value;
    const oldText = inputText;
    setInputText(newText);
    
    const currentCaretPos = e.target.selectionStart;

    if (mentionMode) {
      // Check if the @ that started the mention still exists or if cursor is after it
      if (currentCaretPos > cursorPosition && newText[cursorPosition] === '@') {
        const textAfterAt = newText.substring(cursorPosition + 1, currentCaretPos);
        setSearchTerm(textAfterAt);
        
        if (!isMentionDropdownOpen && textAfterAt.length > 0) { // Re-open if closed and user types more
            setIsMentionDropdownOpen(true);
        } else if (textAfterAt.length === 0 && isMentionDropdownOpen) {
             // Potentially keep open or filter with empty search term
        }

        // Update dropdown position (optional, can be complex)
        // ... 
      } else {
        // Cursor moved before @, or @ was deleted
        setMentionMode(false);
        setIsMentionDropdownOpen(false);
        setSearchTerm("");
      }
    }
  };

  const completeMention = () => {
    // Called when Enter is pressed, and dropdown is NOT open, but we are in mentionMode.
    // This means user typed "@searchterm" and pressed Enter.
    if (searchTerm) {
      const filtered = getFilteredFiles();
      if (filtered.length > 0) {
        insertFileMention(filtered[0]); // Insert the best match
      } else {
        // No match found, treat as plain text. Exit mention mode.
        setMentionMode(false);
        setSearchTerm("");
      }
    } else {
      // No search term (e.g., user typed "@" then Enter)
      // Treat as plain text. Exit mention mode.
      setMentionMode(false);
    }
  };

  const insertFileMention = (fullPath) => {
    const fileName = fullPath.split(/[\/\\]/).pop();
    const chipText = `[${fileName}]`; // The desired chip format
    let textToInsert = chipText + " "; // Add a space after for easier typing

    let newText;
    let finalCursorPos;

    // `cursorPosition` is the index of the '@' character or where file button initiated
    // `searchTerm` is the text typed after '@' (if any)

    const textBeforeAt = inputText.substring(0, cursorPosition);
    
    // Determine what part of the original text is being replaced
    // If an '@' is at cursorPosition, we replace '@' + searchTerm
    // Otherwise (e.g. button click into empty input), we just insert.
    let lengthOfReplacedText = 0;
    if (inputText[cursorPosition] === '@') {
        lengthOfReplacedText = 1 + searchTerm.length; // 1 for '@'
    } else {
        // This case could happen if button is clicked, cursorPosition is set to caret,
        // but no '@' was typed. SearchTerm would be empty.
        lengthOfReplacedText = searchTerm.length; // usually 0 if no @
    }

    const textAfterMentionPoint = inputText.substring(cursorPosition + lengthOfReplacedText);
    
    newText = `${textBeforeAt}${textToInsert}${textAfterMentionPoint}`;
    finalCursorPos = textBeforeAt.length + textToInsert.length;

    setInputText(newText);
    
    if (!selectedFiles.includes(fullPath)) {
      setSelectedFiles(prev => [...prev, fullPath]);
      setMentionedFiles(prev => ({
        ...prev,
        [chipText]: fullPath // Map "[fileName]" to "path/to/fileName"
      }));
    }
    
    setIsMentionDropdownOpen(false);
    setMentionMode(false);
    setSearchTerm("");
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(finalCursorPos, finalCursorPos);
      }
    }, 0);
  };

  const getFilteredFiles = () => {
    return searchTerm
      ? projectFiles.filter(file => {
          const fileName = file.split(/[\/\\]/).pop();
          return fileName.toLowerCase().includes(searchTerm.toLowerCase());
        })
      : projectFiles; // Show all if no search term
  };

  const FileItem = ({ file }) => {
    const [isHovered, setIsHovered] = useState(false);
    const fileName = file.split(/[\/\\]/).pop();
    
    return (
      <li 
        style={getFileItemStyle(isHovered)}
        onClick={() => insertFileMention(file)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={file}
      >
        {fileName}
      </li>
    );
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

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    postMessage('command', { 
      command: 'switchModel',
      modelType: newModel
    });
  };

  // `parseInputWithChips` is no longer needed as inputText will contain `[fileName]` directly.
  // The `renderInputWithChips` function can be simplified or its content moved directly into the return.
  // For simplicity, let's use a standard input/textarea. If you need a multi-line input, use textarea.
  // For a single line, input type="text" is fine. The existing styles might assume a div wrapper.

  const filteredProjectFiles = getFilteredFiles(); // Renamed from filteredFiles to avoid conflict

  return (
    <div style={containerStyle} ref={dropdownRef}>
      <div style={styles(theme).inputContainer}>
        {/* This div acts as the styled input area */}
        <div 
          style={{
            ...styles(theme).input, // Use existing input style for the container
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap', // In case text + chips wrap
            cursor: 'text',
            // overflowX: 'hidden', // Let it scroll if needed or manage via textarea
          }}
          onClick={() => inputRef.current?.focus()} // Focus the actual input/textarea
        >
          {/* 
            If you want a multi-line input that behaves more like common chat inputs,
            you'd use a <textarea>. For this example, sticking to <input> for simplicity
            based on original code. Adjust styling and element type if <textarea> is preferred.
          */}
          <input // Or <textarea /> if you need multi-line support
            ref={inputRef}
            style={{ // Style to make it look like part of the div, transparent, etc.
              border: 'none',
              outline: 'none',
              background: 'transparent',
              flex: 1, // Take available space
              minWidth: '50px', // Prevent collapsing
              color: theme.colors.text,
              fontFamily: 'inherit',
              fontSize: 'inherit',
              padding: 0, // Padding is on the parent div
              margin: 0,
              // For textarea, you might add:
              // resize: 'none',
              // overflowY: 'auto', // if content exceeds height
              // height: 'auto', // or a fixed height
              // whiteSpace: 'pre-wrap', // To respect newlines
              // wordBreak: 'break-word',
            }}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={ "Type your message... (Use @ to mention files)"}
            // type="text" // Not needed for textarea
            // rows={1} // For textarea, initial rows
          />
        </div>
        <button 
          style={styles(theme).sendButton} 
          onClick={handleSubmit}
          disabled={isLoading || (!inputText.trim() && selectedFiles.length === 0)} // Also disable if only spaces
        >
          <EnterIcon color={(inputText.trim() || selectedFiles.length > 0) ? theme.colors.primary : theme.colors.disabled} />
        </button>
        
        {isMentionDropdownOpen && (
          <div 
            style={{
              ...styles(theme).mentionDropdown,
              top: mentionDropdownPosition.top,
              left: mentionDropdownPosition.left
            }}
          >
            <div style={styles(theme).header}>Insert File</div>
            <ul style={styles(theme).fileList}>
              {filteredProjectFiles.length > 0 ? (
                filteredProjectFiles.map(file => (
                  <FileItem key={file} file={file} />
                ))
              ) : (
                <li style={styles(theme).noFiles}>
                  {projectFiles.length === 0 ? "Loading files..." : (searchTerm ? "No matching files" : "No files found")}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      
      <div style={styles(theme).controlsRow}>
        <div style={styles(theme).leftControls}>
          <div style={styles(theme).modelSelector} onClick={handleModelClick}>
            {currentModel}
            <div style={styles(theme).modelSelectorArrow}>
              ▼
            </div>
          </div>
          {isModelDropdownOpen && (
            <ModelDropdown
              options={modelOptions}
              currentModel={currentModel}
              onSelect={(model) => {
                handleModelChange({ target: { value: model } });
                setIsModelDropdownOpen(false);
              }}
              position={modelDropdownPosition}
              theme={theme}
            />
          )}
        </div>
        <div style={styles(theme).rightControls}>
          <button
            onClick={() => {
              const currentCaret = inputRef.current ? inputRef.current.selectionStart : 0;
              const currentInputText = inputRef.current ? inputRef.current.value : "";
              
              // Simulate typing "@" at the current cursor position to trigger the dropdown
              // This makes the button behave consistently with typing "@"
              const textBefore = currentInputText.substring(0, currentCaret);
              const textAfter = currentInputText.substring(currentCaret);
              const tempTextWithAt = `${textBefore}@${textAfter}`;
              
              setInputText(tempTextWithAt); // Temporarily add @
              setCursorPosition(currentCaret); // This is the position of the (virtual) @
              setSearchTerm(""); // Start with empty search for the button
              setMentionMode(true);
              setIsMentionDropdownOpen(true);

              // Position dropdown
              // Need to do this after inputText is updated and inputRef.current is available
              setTimeout(() => {
                if (inputRef.current) {
                    const rect = inputRef.current.getBoundingClientRect();
                    // Calculate X position more accurately
                    const tempSpan = document.createElement('span');
                    tempSpan.style.font = window.getComputedStyle(inputRef.current).font;
                    tempSpan.style.visibility = 'hidden';
                    tempSpan.style.position = 'absolute';
                    // Get text up to and including the newly inserted virtual '@'
                    const textForWidthCalc = tempTextWithAt.substring(0, currentCaret + 1);
                    const lastNewlinePos = textForWidthCalc.lastIndexOf('\n');
                    const currentLineText = lastNewlinePos >= 0 ? textForWidthCalc.substring(lastNewlinePos + 1) : textForWidthCalc;
                    tempSpan.textContent = currentLineText;
                    document.body.appendChild(tempSpan);
                    const cursorX = tempSpan.offsetWidth;
                    document.body.removeChild(tempSpan);

                    setMentionDropdownPosition({
                        top: rect.bottom + 5,
                        left: rect.left + (inputRef.current.paddingLeft || 0) + cursorX - (tempSpan.offsetWidth / tempSpan.textContent.length) // Adjust for @ width
                    });
                    inputRef.current.focus();
                    inputRef.current.setSelectionRange(currentCaret + 1, currentCaret + 1); // Place cursor after @
                }
              }, 0);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: theme.colors.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
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