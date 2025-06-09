import { useCallback, useState, useEffect } from "react";

export const useMentionMode = (inputRef, projectFiles, selectedFiles, setSelectedFiles, inputText, setInputText) => {
  const [state, setState] = useState({
    isDropdownOpen: false,
    dropdownPosition: { top: 0, left: 0, width: 0 },
    searchTerm: '',
    cursorPosition: 0,
    activeIndex: -1
  });

  // Función helper para actualizar estado
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Calcular posición del dropdown
  const getDropdownPosition = useCallback(() => {
    if (!inputRef.current) return { top: 0, left: 0, width: 0 };
    const rect = inputRef.current.getBoundingClientRect();
    return { top: rect.top - 220, left: rect.left, width: rect.width };
  }, [inputRef]);

  // Cerrar dropdown
  const closeDropdown = useCallback(() => {
    updateState({
      isDropdownOpen: false,
      searchTerm: '',
      activeIndex: -1
    });
  }, [updateState]);

  // Insertar mención de archivo
  const insertFileMention = useCallback((file) => {
    const fileName = file.name;
    const textToInsert = `${fileName} `;
    const textBeforeAt = inputText.substring(0, state.cursorPosition);
    const lengthOfReplacedText = 1 + state.searchTerm.length;
    const textAfterMentionPoint = inputText.substring(state.cursorPosition + lengthOfReplacedText);
    const newText = `${textBeforeAt}${textToInsert}${textAfterMentionPoint}`;
    
    setInputText(newText);
    
    // Agregar archivo si no existe
    if (!selectedFiles.some(f => f.path === file.path)) {
      setSelectedFiles(prev => [...prev, file]);
    }
    
    closeDropdown();
    
    // Restaurar foco y posición del cursor
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const finalCursorPos = textBeforeAt.length + textToInsert.length;
        inputRef.current.setSelectionRange(finalCursorPos, finalCursorPos);
      }
    }, 0);
  }, [inputText, state.cursorPosition, state.searchTerm, setInputText, selectedFiles, setSelectedFiles, closeDropdown, inputRef]);

  // Remover archivo
  const removeFile = useCallback((fileToRemove) => {
    setSelectedFiles(prev => prev.filter(f => f.path !== fileToRemove.path));
    const fileName = fileToRemove.name;
    const newText = inputText.split(fileName).join('').replace(/\s+/g, ' ').trim();
    setInputText(newText);
  }, [inputText, setInputText, setSelectedFiles]);

  // Actualizar término de búsqueda
  const updateSearchTerm = useCallback((currentTextValue, caretPositionInInput) => {
    const textBeforeCaret = currentTextValue.substring(0, caretPositionInInput);
    const lastAtIndex = textBeforeCaret.lastIndexOf('@');

    if (lastAtIndex === -1) {
      if (state.isDropdownOpen) closeDropdown();
      return;
    }

    const textAfterAt = currentTextValue.substring(lastAtIndex + 1, caretPositionInInput);
    const charBeforeAt = lastAtIndex > 0 ? currentTextValue[lastAtIndex - 1] : '';
    const isAtValid = lastAtIndex === 0 || /\s/.test(charBeforeAt);
    
    if (!isAtValid) {
      if (state.isDropdownOpen) closeDropdown();
      return;
    }

    // Obtener término de búsqueda
    const searchTermMatch = textAfterAt.match(/^([^\s@]*)/);
    const searchTerm = searchTermMatch ? searchTermMatch[1] : '';

    updateState({
      searchTerm,
      cursorPosition: lastAtIndex,
      isDropdownOpen: true,
      dropdownPosition: getDropdownPosition(),
      activeIndex: 0
    });
  }, [state.isDropdownOpen, closeDropdown, updateState, getDropdownPosition]);

  // Iniciar mención por botón
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
      
      updateState({
        cursorPosition: currentCaret,
        isDropdownOpen: true,
        dropdownPosition: getDropdownPosition(),
        searchTerm: '',
        activeIndex: 0
      });
    }, 0);
  }, [inputRef, inputText, setInputText, updateState, getDropdownPosition]);

  // Setters simples
  const setActiveIndex = useCallback((indexOrUpdater) => {
    setState(prev => ({
      ...prev,
      activeIndex: typeof indexOrUpdater === 'function' ? indexOrUpdater(prev.activeIndex) : indexOrUpdater
    }));
  }, []);

  // Reset activeIndex cuando cambia searchTerm
  useEffect(() => {
    if (state.isDropdownOpen) {
      updateState({ activeIndex: 0 });
    }
  }, [state.searchTerm, state.isDropdownOpen, updateState]);

  return {
    // State getters
    isDropdownOpen: state.isDropdownOpen,
    dropdownPosition: state.dropdownPosition,
    searchTerm: state.searchTerm,
    activeIndex: state.activeIndex,
    
    // Actions
    setActiveIndex,
    closeDropdown,
    insertFileMention,
    removeFile,
    updateSearchTerm,
    startMentionByButton
  };
};