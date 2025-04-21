import React, { useState, useRef, useEffect } from "react";
import { styles } from "../styles";
import AttachedFiles from "../AttachedFiles";

const IconEdit = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const UserMessage = ({ message, onEdit, messageIndex }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text);
  const textareaRef = useRef(null);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editedText.trim() !== "") {
        // Mantener los archivos en su formato original
        onEdit(messageIndex, editedText, message.files);
        setIsEditing(false);
      }
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`; // Limita la altura máxima a 200px
    }
  }, [editedText]);

  return (
    <div style={{ ...styles.message, ...styles.userMessage }}>
      <div style={styles.userMessageHeader}>
        <AttachedFiles files={message.files || []} />
        {!isEditing && (
          <button
            onClick={handleEdit}
            style={styles.editButton}
            title="Editar mensaje"
          >
            <IconEdit />
          </button>
        )}
      </div>
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          onKeyDown={handleKeyPress}
          style={{
            ...styles.editInput,
            minHeight: "20px",
            maxHeight: "100px",
            width: "100%",
            backgroundColor: "var(--vscode-input-background)",
            color: "var(--vscode-input-foreground)",
            border: "1px solid var(--vscode-input-border)",
            borderRadius: "4px",
            padding: "8px",
            resize: "none",
            fontFamily: "inherit",
            fontSize: "inherit",
            overflow: "auto",
          }}
          autoFocus
          placeholder="Presiona Enter para enviar"
        />
      ) : (
        <div>{message.text}</div>
      )}
    </div>
  );
};