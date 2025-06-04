
import React from "react"
import { useApp } from "../context/AppContext"
import "../styles/Sidebar.css"

const Sidebar = () => {
  const { chatList, currentChatId, loadChat, setShowHistory } = useApp()

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return "Today"
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const handleChatClick = (chatId) => {
    loadChat(chatId)
    setShowHistory(false)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Chat History</h3>
        <button className="close-sidebar-button" onClick={() => setShowHistory(false)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <div className="chat-list">
        {chatList.length === 0 ? (
          <div className="empty-state">
            <p>No chat history yet</p>
          </div>
        ) : (
          chatList.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${currentChatId === chat.id ? "active" : ""}`}
              onClick={() => handleChatClick(chat.id)}
            >
              <div className="chat-item-content">
                <div className="chat-title">{chat.title || "Untitled Chat"}</div>
                <div className="chat-preview">{chat.lastMessage || "No messages"}</div>
                <div className="chat-date">{formatDate(chat.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}

export default Sidebar
