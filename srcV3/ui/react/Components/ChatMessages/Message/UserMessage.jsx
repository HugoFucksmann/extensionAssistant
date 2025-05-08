import React, { useState, useRef, useEffect } from "react";
import { useVSCodeContext } from "../../../context/VSCodeContext";
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
  const { theme } = useVSCodeContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text);
  const textareaRef = useRef(null);

  const messageStyles = {
    container: {
      backgroundColor: theme.colors.messageUserBg,
      color: theme.colors.text,
      padding: theme.spacing.medium,
      borderRadius: theme.borderRadius.medium,
      marginBottom: theme.spacing.medium,
      maxWidth: '80%',
      alignSelf: 'flex-end',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      border: `1px solid ${theme.colors.border}`
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.small
    },
    editButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: theme.spacing.small,
      color: theme.colors.text,
      '&:hover': {
        color: theme.colors.primary
      }
    },
    messageText: {
      lineHeight: 1.5,
      whiteSpace: 'pre-wrap'
    },
    editInput: {
      minHeight: '20px',
      maxHeight: '100px',
      width: '100%',
      backgroundColor: theme.colors.chatInputBg,
      color: theme.colors.text,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.small,
      padding: theme.spacing.small,
      resize: 'none',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      overflow: 'auto'
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editedText.trim() !== "") {
        onEdit(messageIndex, editedText, message.files);
        setIsEditing(false);
      }
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [editedText]);

  return (
    <div style={messageStyles.container}>
      <div style={messageStyles.header}>
        <AttachedFiles files={message.files || []} />
        {!isEditing && (
          <button
            onClick={handleEdit}
            style={messageStyles.editButton}
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
          style={messageStyles.editInput}
          autoFocus
          placeholder="Presiona Enter para enviar"
        />
      ) : (
        <div style={messageStyles.messageText}>{message.text}</div>
      )}
    </div>
  );
};