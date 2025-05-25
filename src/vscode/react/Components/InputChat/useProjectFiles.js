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
  // El searchTerm que llega aquí es el texto DESPUÉS del '@'
  const getFilteredFiles = (searchTerm) => {
    if (!searchTerm) { // Si no hay término de búsqueda (después del @), mostrar todos los archivos
        return projectFiles;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return projectFiles.filter(file => {
      const fileName = file.split(/[\/\\]/).pop().toLowerCase(); // Nombre de archivo con extensión, ej: "app.js"
      const extension = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : ''; // Extensión, ej: ".js"

      if (lowerSearchTerm.startsWith('.')) { // Si el término de búsqueda es una extensión, ej: ".js"
        return extension === lowerSearchTerm;
      } else { // Si no, buscar en el nombre completo del archivo (sin ruta)
        return fileName.includes(lowerSearchTerm);
      }
    });
  };

  return { 
    projectFiles, 
    isLoading, 
    getFilteredFiles,
    refreshFiles: () => {
        setIsLoading(true); // Indicar carga al refrescar
        postMessage("command", { command: "getProjectFiles" });
    }
  };
};