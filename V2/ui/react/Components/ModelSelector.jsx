import React from "react";
import { useAppContext } from "../context/AppContext";
import useBackend from "../hooks/useBackend";
import { ACTIONS } from "../services/BackendService";

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    borderBottom: "1px solid var(--vscode-panel-border)",
  },
  label: {
    marginRight: "10px",
    fontSize: "12px",
    color: "var(--vscode-descriptionForeground)",
  },
  select: {
    backgroundColor: "var(--vscode-dropdown-background)",
    color: "var(--vscode-dropdown-foreground)",
    border: "1px solid var(--vscode-dropdown-border)",
    padding: "4px 8px",
    borderRadius: "2px",
    fontSize: "12px",
    outline: "none",
  },
  option: {
    backgroundColor: "var(--vscode-dropdown-listBackground)",
    color: "var(--vscode-dropdown-foreground)",
  }
};

const ModelSelector = () => {
  const { model, setModel } = useAppContext();
  const backend = useBackend();

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    
    // Actualizar el estado local
    setModel(newModel);
    
    // Notificar al backend sobre el cambio de modelo
    backend.sendToBackend(ACTIONS.SELECT_MODEL, { model: newModel });
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>Modelo:</label>
      <select 
        value={model} 
        onChange={handleModelChange} 
        style={styles.select}
      >
        <option value="ollama" style={styles.option}>Ollama</option>
        <option value="gemini" style={styles.option}>Gemini</option>
      </select>
    </div>
  );
};

export default ModelSelector;
