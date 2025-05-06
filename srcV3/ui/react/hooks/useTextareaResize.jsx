import { useCallback } from 'react';

export const useTextareaResize = () => {
  const handleResize = useCallback((textarea) => {
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 150 ? "auto" : "hidden";
  }, []);

  return handleResize;
};
