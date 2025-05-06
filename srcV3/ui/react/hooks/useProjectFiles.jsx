import { useState, useEffect } from "react";
import { ACTIONS } from "../services/BackendService";

export const useProjectFiles = (backendService) => {
  const [projectFiles, setProjectFiles] = useState([]);

  useEffect(() => {
    if (!backendService) return;

    // Registrar un listener para los archivos del proyecto
    const unsubscribe = backendService.on("projectFiles", (message) => {
      setProjectFiles(message.files);
    });

    // Solicitar los archivos del proyecto
    backendService.send(ACTIONS.GET_PROJECT_FILES);

    // Limpiar el listener cuando el componente se desmonte
    return unsubscribe;
  }, [backendService]);

  return {
    projectFiles,
    setProjectFiles,
  };
};