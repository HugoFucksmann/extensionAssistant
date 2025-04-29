import React from "react";
import { styles } from "../styles"; // Import shared styles

export const AgentMessage = ({ message }) => {
  const { agente, acción } = message;

  if (!agente || !acción) {
    return null;
  }

  return (
    <div style={{ ...styles.message, ...styles.agentMessage }}>
      <div style={styles.agentMessageContent}>
        <strong>{agente}:</strong> {acción}
      </div>
    </div>
  );
};