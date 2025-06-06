"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { MessageItem } from "./MessageItem"
import type { ChatMessage } from "../../../../features/chat/types"
import "./styles/ChatMessages.css"

interface ChatMessagesProps {
  messages: ChatMessage[]
  className?: string
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages = [], className = "" }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Filter messages for display
  const displayableMessages = messages.filter((msg) => {
    const { phase, status, toolName } = msg.metadata || {}

    // Show phase messages only if they have a tool name
    if (phase && (status === "phase_started" || status === "phase_completed")) {
      return !!toolName
    }
    return true
  })

  if (displayableMessages.length === 0) {
    return (
      <div className={`chat-messages empty ${className}`}>
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <p>Inicia una conversación escribiendo un mensaje</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`chat-messages ${className}`}>
      <div className="messages-container">
        {displayableMessages.map((message, index) => (
          <MessageItem
            key={message?.operationId || message?.id || `msg-${index}`}
            message={message}
            isLast={index === displayableMessages.length - 1}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
