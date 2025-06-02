
import React, { useEffect, useRef } from "react"
import MessageItem from "./MessageItem"
import "../styles/ChatMessages.css"
import { useApp } from "@vscode/react/context/AppContext"
import LoadingIndicator from "./LoadingIndicator"

const ChatMessages = () => {
  const { messages = [], isLoading } = useApp()
  const messagesEndRef = useRef(null)

  
    useEffect(() => {
      console.log('Mensajes de chat recibidos:', messages);
    }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])


 
  

  return (<>
    <div className="chat-messages">
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          (() => {
            // Filtro: solo el último mensaje por toolName+toolInput+sender
            const toolMsgMap = new Map();
            const result = [];
            for (let i = messages.length - 1; i >= 0; i--) {
              const m = messages[i];
              const meta = m?.metadata || {};
              if (meta.toolName && meta.toolInput && (m.sender === 'system' || m.sender === 'feedback')) {
                const key = `${meta.toolName}::${JSON.stringify(meta.toolInput)}::${m.sender}`;
                if (!toolMsgMap.has(key)) {
                  toolMsgMap.set(key, true);
                  result.unshift(m);
                }
              } else {
                // Mensajes normales, siempre incluir (puede haber varios)
                result.unshift(m);
              }
            }
            return result.map((message, index) => (
              <MessageItem key={message?.id || `msg-${index}`} message={message} />
            ));
          })()
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
    {!isLoading && <LoadingIndicator />}
    </>
  )
}

export default ChatMessages
