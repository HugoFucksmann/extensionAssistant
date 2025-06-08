import { useState, useCallback, useEffect } from "react";

export const useProjectFiles = (postMessage) => {
  const [projectFiles, setProjectFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const loadFiles = useCallback(() => {
    if (isLoadingFiles || hasLoadedOnce) return;
    setIsLoadingFiles(true);
    postMessage("command", { command: "getProjectFiles" });
  }, [postMessage, isLoadingFiles, hasLoadedOnce]);

  useEffect(() => {
    const handleMessage = (event) => {
      const message = event.data;
      if (message.type === "projectFiles") {
        setProjectFiles(message.payload.files || []);
        setIsLoadingFiles(false);
        setHasLoadedOnce(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return { projectFiles, isLoadingFiles, loadFiles };
};