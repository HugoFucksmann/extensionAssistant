import React, { useRef, useState } from "react";
import { EnterIcon } from "./Icons";
import { useTextareaResize } from "../../hooks/useTextareaResize";
import FileSelector from "./FileSelector";
import { useVSCodeContext } from "../../context/VSCodeContext";

const ChatInput = () => {
  const { postMessage, isLoading, theme } = useVSCodeContext();
  const [inputText, setInputText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const textareaRef = useRef(null);
  
  useTextareaResize(textareaRef);

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

  const styles = {
    container: {
      padding: theme.spacing.medium,
      backgroundColor: theme.colors.chatInputBg,
      borderTop: `1px solid ${theme.colors.border}`,
      position: "sticky",
      bottom: 0,
      display: "flex",
      gap: theme.spacing.small,
      borderRadius: `${theme.borderRadius.medium} ${theme.borderRadius.medium} 0 0`
    },
    textarea: {
      flex: 1,
      padding: `${theme.spacing.small} ${theme.spacing.medium}`,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.small,
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      fontSize: theme.typography.text,
      '&:focus': {
        outline: `2px solid ${theme.colors.primary}`,
        outlineOffset: "2px"
      }
    },
    button: {
      padding: `${theme.spacing.small} ${theme.spacing.medium}`,
      backgroundColor: theme.colors.primary,
      color: theme.colors.text,
      border: "none",
      borderRadius: theme.borderRadius.small,
      fontSize: theme.typography.text,
      cursor: "pointer",
      '&:hover': {
        backgroundColor: theme.colors.secondary
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: "not-allowed"
      }
    },
    form: {
      display: "flex",
      gap: theme.spacing.small,
      flex: 1
    }
  };

  return (
    <div style={styles.container}>
      <FileSelector
        files={selectedFiles}
        onRemove={handleFileRemove}
        onFileSelect={handleFileSelect}
      />
      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          style={styles.textarea}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          style={styles.button}
          disabled={isLoading || (inputText.trim() === "" && selectedFiles.length === 0)}
        >
          <EnterIcon />
        </button>
      </form>
    </div>
  );
};

export default ChatInput;