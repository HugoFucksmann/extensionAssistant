
import { useEffect, useRef } from "react"
import MessageItem from "./MessageItem"
import "../styles/ChatMessages.css"
import { useApp } from "@vscode/react/context/AppContext"

const ChatMessages = () => {
  const { messages = [] } = useApp()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="chat-messages">
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => <MessageItem key={message?.id || `msg-${index}`} message={message} />)
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

export default ChatMessages
