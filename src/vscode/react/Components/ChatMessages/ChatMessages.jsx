import React, { useRef, useLayoutEffect, memo, useState } from "react"
import { styles, combineStyles } from "./styles"
import { useApp } from "../../context/AppContext"
import SystemMessage from "./SystemMessage"

const Message = memo(({ message, messageIndex }) => {
  const { theme } = useApp()

  const formattedMessage = {
    ...message,
    role: message.role || message.sender || "assistant",
    text: message.text || message.content || message.message || "",
    files: Array.isArray(message.files)
      ? message.files.map((file) => (typeof file === "string" ? { path: file, content: undefined } : file))
      : [],
    timestamp: message.timestamp || Date.now(),
    id: message.id || `msg_${Date.now()}_${messageIndex}`,
    metadata: message.metadata || {},
  }

  const isUserMessage = formattedMessage.sender === "user"
  const isSystemMessage = formattedMessage.sender === "system"

  if (isSystemMessage) {
    return <SystemMessage message={formattedMessage} />
  }

  const messageStyle = combineStyles(
    styles.messageContainer,
    isUserMessage ? styles.messageContainerUser : styles.messageContainerAssistant,
  )

  const headerStyle = {
    ...styles.messageHeader,
    color: isUserMessage ? "#64B5F6" : styles.messageHeader.color,
  }

  const timestampStyle = {
    ...styles.messageTimestamp,
    textAlign: isUserMessage ? "right" : "left",
  }

  return (
    <div className="message-container" style={messageStyle}>
      <div style={headerStyle}>{isUserMessage ? "Tú" : "Asistente"}</div>
      <div style={styles.messageContent}>{formattedMessage.text}</div>

      {formattedMessage.files?.length > 0 && (
        <div style={styles.attachedFilesImproved}>
          {formattedMessage.files.map((file, i) => (
            <div key={i} style={styles.fileTagImproved}>
              📎 {file.path}
            </div>
          ))}
        </div>
      )}

      <div style={timestampStyle}>{new Date(formattedMessage.timestamp).toLocaleTimeString()}</div>
    </div>
  )
})

const ChatMessages = ({ children }) => {
  const { theme, messages, isLoading } = useApp()
  const containerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [systemMessages, setSystemMessages] = useState([])

  const addSystemMessage = (content, operationId) => {
    const newSystemMessage = {
      id: operationId || `system_${Date.now()}`,
      sender: "system",
      text: content,
      timestamp: Date.now(),
      metadata: {
        status: "thinking",
        operationId: operationId,
        feedbackItems: [],
      },
    }

    setSystemMessages((prev) => [...prev, newSystemMessage])
    return newSystemMessage.id
  }

  const simulateSystemMessage = () => {
    addSystemMessage("Analizando código y generando recomendaciones...", `op_${Date.now()}`)
  }

  const allMessages = [...messages, ...systemMessages].sort((a, b) => a.timestamp - b.timestamp)

  useLayoutEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [allMessages.length])

  useLayoutEffect(() => {
    window.addSystemMessage = addSystemMessage
    window.simulateSystemMessage = simulateSystemMessage
  }, [])

  const scrollbarStyles = {
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.colors.border} transparent`,
    '&::-webkit-scrollbar': {
      width: '6px',
      height: '6px'
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent'
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.colors.border,
      borderRadius: '3px',
      '&:hover': {
        backgroundColor: theme.colors.hover
      }
    }
  };

  return (
    <div style={styles.container} ref={containerRef}>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .feedback-card:hover {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.04) 0%, 
            rgba(255, 255, 255, 0.02) 100%) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          transform: translateX(4px) !important;
        }
      `}</style>
      <div style={combineStyles(styles.scrollableContainer, styles.customScrollbar, scrollbarStyles)}>
        <div style={styles.demoButtonContainer}>
          <button onClick={simulateSystemMessage} style={styles.demoButton}>
            🔧 Simular Proceso del Sistema
          </button>
        </div>

        {allMessages.map((message, index) => (
          <Message key={message.id || `${index}-${message.timestamp}`} message={message} messageIndex={index} />
        ))}

        {allMessages.length === 0 && !isLoading && children}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

export default memo(ChatMessages)
