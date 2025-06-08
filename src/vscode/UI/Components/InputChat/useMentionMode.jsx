import { useCallback, useState, useEffect  } from "react";

export const useMentionMode = (inputRef, projectFiles, selectedFiles, setSelectedFiles, inputText, setInputText) => {
  const [isMentionMode, setIsMentionMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
    if (isMentionMode) {
      setIsMentionMode(false);
      setSearchTerm('');
    }
  }, [isMentionMode]);

  const openMentionDropdown = useCallback((atPosition) => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    // Calculate position relative to the viewport
    setDropdownPosition({ top: rect.top - 220, left: rect.left, width: rect.width });
    setCursorPosition(atPosition);
    setIsMentionMode(true);
    setIsDropdownOpen(true);
    setSearchTerm('');
  }, [inputRef]);

  const insertFileMention = useCallback((file) => {
    const fileName = file.name;
    const textToInsert = `${fileName} `;
    const textBeforeAt = inputText.substring(0, cursorPosition);
    const lengthOfReplacedText = 1 + searchTerm.length;
    const textAfterMentionPoint = inputText.substring(cursorPosition + lengthOfReplacedText);
    const newText = `${textBeforeAt}${textToInsert}${textAfterMentionPoint}`;
    setInputText(newText);
    if (!selectedFiles.some(f => f.path === file.path)) {
      setSelectedFiles(prev => [...prev, file]);
    }
    closeDropdown();
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const finalCursorPos = textBeforeAt.length + textToInsert.length;
        inputRef.current.setSelectionRange(finalCursorPos, finalCursorPos);
      }
    }, 0);
  }, [inputText, cursorPosition, searchTerm, setInputText, selectedFiles, setSelectedFiles, closeDropdown, inputRef]);

  const removeFile = useCallback((fileToRemove) => {
    setSelectedFiles(prev => prev.filter(f => f.path !== fileToRemove.path));
    const fileName = fileToRemove.name;
    const newText = inputText.split(fileName).join('').replace(/\s+/g, ' ').trim();
    setInputText(newText);
  }, [inputText, setInputText, setSelectedFiles]);

  const updateSearchTerm = useCallback((currentTextValue, caretPositionInInput) => {
    const textBeforeCaret = currentTextValue.substring(0, caretPositionInInput);
    const lastAtIndex = textBeforeCaret.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = currentTextValue.substring(lastAtIndex + 1, caretPositionInInput);
      const charBeforeAt = lastAtIndex > 0 ? currentTextValue[lastAtIndex - 1] : '';
      
      // Verificar si el @ está al inicio o después de un espacio
      const isAtValid = lastAtIndex === 0 || /\s/.test(charBeforeAt);
      
      if (isAtValid) {
        // Actualizar la posición del dropdown
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setDropdownPosition({ 
            top: rect.top - 220, 
            left: rect.left, 
            width: rect.width 
          });
        }
        
        // Si no hay texto después del @, abrir el menú vacío
        if (!textAfterAt || /^\s*$/.test(textAfterAt)) {
          setSearchTerm('');
          setCursorPosition(lastAtIndex);
          setIsMentionMode(true);
          setIsDropdownOpen(true);
          return;
        }
        
        // Si hay texto después del @, usarlo como término de búsqueda
        const searchTermMatch = textAfterAt.match(/^([^\s@]+)/);
        if (searchTermMatch) {
          setSearchTerm(searchTermMatch[1]);
          setCursorPosition(lastAtIndex);
          setIsMentionMode(true);
          setIsDropdownOpen(true);
          return;
        }
      }
    }
    
    // Si no hay un @ válido, cerramos el dropdown
    if (isMentionMode) {
      closeDropdown();
    }
  }, [closeDropdown, isMentionMode, inputRef]);

  const startMentionByButton = useCallback(() => {
    if (!inputRef.current) return;
    const currentCaret = inputRef.current.selectionStart;
    const textBefore = inputText.substring(0, currentCaret);
    const textAfter = inputText.substring(currentCaret);
    const tempTextWithAt = `${textBefore}@${textAfter}`;
    setInputText(tempTextWithAt);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(currentCaret + 1, currentCaret + 1);
      }
      openMentionDropdown(currentCaret);
    }, 0);
  }, [inputRef, inputText, setInputText, openMentionDropdown]);

  useEffect(() => {
    setActiveIndex(isDropdownOpen ? 0 : -1);
  }, [searchTerm, isDropdownOpen]);

  return {
    isMentionMode, isDropdownOpen, dropdownPosition, searchTerm, activeIndex,
    setActiveIndex, closeDropdown, openMentionDropdown, insertFileMention,
    removeFile, updateSearchTerm, startMentionByButton
  };
};