import React, { } from "react"
import { styles, combineStyles } from "./styles"
import { useApp } from "../../context/AppContext"

import StatusIndicator from "./StatusIndicator"


const FeedbackCard = ({ message }) => {
  const { theme } = useApp()
  const status = message.metadata?.status || "info"

  const cardStyle = combineStyles(
    styles.feedbackCard,
    styles[`feedbackCard${status.charAt(0).toUpperCase() + status.slice(1)}`],
  )

  return (
    <div className="feedback-card" style={cardStyle}>
      <div style={styles.feedbackCardContent}>
        <StatusIndicator status={status} size="small" />
        <span style={styles.feedbackCardText}>{message.content}</span>
      </div>
    </div>
  )
}

export default FeedbackCard
