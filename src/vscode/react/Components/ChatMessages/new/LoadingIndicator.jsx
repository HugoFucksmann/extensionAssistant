import React from "react"

import "../styles/LoadingIndicator.css"

const LoadingIndicator = () => {
  return (
    <div className="loading-indicator">
      <div className="loading-square"></div>
      <span className="loading-text">AI is thinking...</span>
    </div>
  )
}

export default LoadingIndicator
