import React, { useRef, useState } from "react";
import { EnterIcon } from "./Icons";
import { styles } from "./ChatInputStyles";
import { useTextareaResize } from "../../hooks/useTextareaResize";
import FileSelector from "./FileSelector";
import { useVSCodeContext } from "../../context/VSCodeContext";

const ChatInput = () => {
  const { postMessage, isLoading } = useVSCodeContext();
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