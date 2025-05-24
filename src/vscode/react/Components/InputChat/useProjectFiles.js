import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

// Hook para obtener y filtrar archivos del proyecto
export const useProjectFiles = (shouldFetch = false) => {
  const { postMessage } = useApp();
  const [projectFiles, setProjectFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Solicitar archivos cuando shouldFetch cambia a true
  useEffect(() => {
    if (shouldFetch) {
      setIsLoading(true);
      postMessage("command", { command: "getProjectFiles" });
    }
  }, [shouldFetch, postMessage]);

  // Escuchar respuesta con archivos del proyecto
  useEffect(() => {
    const handleMessage = (event) => {
      const message = event.data;
      if (message.type === "projectFiles") {
        // Filtrar directorios no deseados y archivos
        const filteredFiles = message.payload.files.filter(file => 
          !file.includes('node_modules/') && 
          !file.includes('node_modules\\') &&
          !file.includes('.git/') &&
          !file.includes('.git\\') &&
          !file.endsWith('/') &&
          !file.endsWith('\\')
        );
        setProjectFiles(filteredFiles);
        setIsLoading(false);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Función para filtrar archivos por término de búsqueda
  const getFilteredFiles = (searchTerm) => {
    if (!searchTerm) return projectFiles;
    
    return projectFiles.filter(file => {
      const fileName = file.split(/[\/\\]/).pop();
      return fileName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  return { 
    projectFiles, 
    isLoading, 
    getFilteredFiles,
    refreshFiles: () => postMessage("command", { command: "getProjectFiles" })
  };
};