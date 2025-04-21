// Este archivo está obsoleto y se mantiene solo por compatibilidad
// La lógica se ha movido a AppContext.jsx
import { useState } from "react";

export const useHistory = () => {
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  return {
    history,
    setHistory,
    showHistory,
    setShowHistory,
    handleLoadChat: () => {},
    handleShowHistory: () => {}
  };
};