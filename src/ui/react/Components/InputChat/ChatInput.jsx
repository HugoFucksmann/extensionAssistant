import React, { useRef, useState } from "react";
import { EnterIcon } from "./Icons";
import { styles } from "./ChatInputStyles";
import { useAppContext } from "../../context/AppContext";
import { useTextareaResize } from "../../hooks/useTextareaResize";
import useBackend from "../../hooks/useBackend";
import FileSelector from "./FileSelector";
import { ACTIONS } from "../../services/BackendService";

const ChatInput = () => {
  try {
    console.log("Renderizando ChatInput");
    const {
      selectedFiles,
      setSelectedFiles,
      projectFiles,
      model,
      addMessage,
      isLoading,
    } = useAppContext();

    const backend = useBackend();
    const [inputText, setInputText] = useState("");
    
    const textareaRef = useRef(null);
    useTextareaResize(textareaRef);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (isLoading) return;
      
      if (inputText.trim() !== "" || selectedFiles.length > 0) {
        // Agregar mensaje a la UI
        addMessage({
          role: "user",
          text: inputText,
          files: selectedFiles
        });
        
        // Enviar al backend
        backend.sendToBackend(ACTIONS.SEND_MESSAGE, {
          message: inputText,
          selectedFiles,
          model
        });

        // Limpiar el input y los archivos seleccionados después de enviar el mensaje
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

    const handleFileSelect = (file) => {
      if (!selectedFiles.includes(file)) {
        setSelectedFiles((prev) => [...prev, file]);
      }
    };

    const handleFileRemove = (file) => {
      setSelectedFiles((prev) => prev.filter((f) => f !== file));
    };

    return (
      <div style={styles.container}>
        <FileSelector
          files={selectedFiles}
          onRemove={handleFileRemove}
          projectFiles={projectFiles}
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
            title="Send message"
            disabled={isLoading || (inputText.trim() === "" && selectedFiles.length === 0)}
          >
            <EnterIcon />
          </button>
        </form>
      </div>
    );
  } catch (error) {
    console.error("Error en ChatInput:", error);
    return (
      <div style={styles.container}>
        <div style={{ padding: "10px", textAlign: "center" }}>
          Error al cargar el input
        </div>
      </div>
    );
  }
};

export default ChatInput;