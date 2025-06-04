import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

// Hook para obtener y filtrar archivos del proyecto
export const useProjectFiles = (shouldFetch = false) => {
  const { postMessage } = useApp();
  const [projectFiles, setProjectFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // Solicitar archivos cuando shouldFetch cambia a true
  useEffect(() => {
    if (shouldFetch) {
      console.log('[useProjectFiles] Solicitando archivos...');
      setIsLoading(true);
      postMessage("command", { command: "getProjectFiles" });
    }
  }, [shouldFetch, postMessage]);

  // Escuchar respuesta con archivos del proyecto
  useEffect(() => {
    const handleMessage = (event) => {
      const message = event.data;
      if (message.type === "projectFiles") {
        console.log('[useProjectFiles] Recibiendo archivos del proyecto...');
        console.log('[useProjectFiles] Archivos recibidos:', message.payload.files.length);

        // Extensiones de archivos de imagen a excluir
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico'];
        
        // Filtrar archivos no deseados
        const filteredFiles = message.payload.files.filter(file => {
          const lowerFile = file.toLowerCase();
          
          // Excluir directorios no deseados
          if (lowerFile.includes('node_modules/') || 
              lowerFile.includes('node_modules\\') ||
              lowerFile.includes('.git/') ||
              lowerFile.includes('.git\\') ||
              lowerFile.endsWith('/') ||
              lowerFile.endsWith('\\')) {
            return false;
          }
          
          // Excluir archivos de imagen
          const extension = file.substring(file.lastIndexOf('.')).toLowerCase();
          if (imageExtensions.includes(extension)) {
            console.log('[useProjectFiles] Excluyendo archivo de imagen:', file);
            return false;
          }
          
          return true;
        });

        console.log('[useProjectFiles] Archivos después de filtrado:', filteredFiles.length);
        
        // Verificar archivos en src/
        const srcFiles = filteredFiles.filter(f => f.includes('src/'));
        console.log('[useProjectFiles] Archivos encontrados en src/:', srcFiles.length);
        if (srcFiles.length > 0) {
          console.log('[useProjectFiles] Ejemplo de archivos en src/:', srcFiles.slice(0, 3));
        }

        setProjectFiles(filteredFiles);
        setIsLoading(false);
        setLastFetchTime(Date.now());
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Función para filtrar archivos por término de búsqueda
  // El searchTerm que llega aquí es el texto DESPUÉS del '@'
  const getFilteredFiles = (searchTerm) => {
    if (!searchTerm) { // Si no hay término de búsqueda (después del @), mostrar todos los archivos
      console.log('[useProjectFiles] Mostrando todos los archivos (sin búsqueda)');
      return projectFiles;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    const filtered = projectFiles.filter(file => {
      const fileName = file.split(/[\\/]/).pop().toLowerCase(); // Nombre de archivo con extensión, ej: "app.js"
      const matches = fileName.includes(lowerSearchTerm);
      if (!matches) {
        console.log('[useProjectFiles] No match:', fileName, 'for', searchTerm);
      }
      return matches;
    });

    console.log('[useProjectFiles] Archivos filtrados:', filtered.length);
    return filtered;
  };

  return {
    projectFiles,
    isLoading,
    getFilteredFiles,
    lastFetchTime,
    refreshFiles: () => {
      setIsLoading(true); // Indicar carga al refrescar
      postMessage("command", { command: "getProjectFiles" });
    }
  };
};