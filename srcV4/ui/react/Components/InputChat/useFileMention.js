import { useState, useRef, useEffect } from 'react';

export const useFileMention = (inputRef, inputTextProp, setInputText) => {
  const [isMentionMode, setIsMentionMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Manejar el cierre del dropdown al hacer clic fuera
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeDropdown();
      }
    };
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);
  
  // Cerrar dropdown y resetear estados de mención
  const closeDropdown = () => {
    setIsDropdownOpen(false);
    if (isMentionMode) {
      setIsMentionMode(false);
      setSearchTerm('');
    }
  };
  
  // Abrir dropdown de mención en la posición actual del cursor
  const openMentionDropdown = (position) => {
    if (!inputRef.current) return;
    
    const rect = inputRef.current.getBoundingClientRect();
    
    setDropdownPosition({
      top: rect.top - 220, // Increased from 250 to appear higher
      left: rect.left, // Align with input left edge
      width: rect.width // Match input width
    });
    
    setCursorPosition(position);
    setIsMentionMode(true);
    setIsDropdownOpen(true);
    setSearchTerm('');
  };
  
  // Insertar mención de archivo en el texto
  const insertFileMention = (fullPath) => {
    const fileName = fullPath.split(/[\/\\]/).pop();
    const chipText = `${fileName}`;
    const textToInsert = `${chipText} `;
    
    const textBeforeAt = inputTextProp.substring(0, cursorPosition);
    let lengthOfReplacedText = 0;
    
    if (inputTextProp[cursorPosition] === '@') {
      lengthOfReplacedText = 1 + searchTerm.length;
    } else {
      lengthOfReplacedText = searchTerm.length;
    }
    
    const textAfterMentionPoint = inputTextProp.substring(cursorPosition + lengthOfReplacedText);
    const newText = `${textBeforeAt}${textToInsert}${textAfterMentionPoint}`;
    setInputText(newText);
    
    if (!selectedFiles.includes(fullPath)) {
      setSelectedFiles(prev => [...prev, fullPath]);
    }
    
    closeDropdown();
    
    // Actualizar posición del cursor después de la inserción
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const finalCursorPos = textBeforeAt.length + textToInsert.length;
        inputRef.current.setSelectionRange(finalCursorPos, finalCursorPos);
      }
    }, 0);
  };
  
  // Actualizar término de búsqueda mientras se escribe
  const updateSearchTerm = (currentTextValue, caretPosition) => {
    if (isMentionMode && caretPosition > cursorPosition && currentTextValue[cursorPosition] === '@') {
      const textAfterAt = currentTextValue.substring(cursorPosition + 1, caretPosition);
      setSearchTerm(textAfterAt);
      
      if (!isDropdownOpen && textAfterAt.length > 0) {
        setIsDropdownOpen(true);
      }
    } else {
      if (isMentionMode && currentTextValue[cursorPosition] !== '@') {
        closeDropdown();
      } else if (isMentionMode && caretPosition <= cursorPosition) {
        closeDropdown();
      }
    }
  };
  
  // Completar mención cuando no hay dropdown visible
  const completeMention = (filteredFiles) => {
    if (searchTerm && filteredFiles.length > 0) {
      insertFileMention(filteredFiles[0]);
    } else {
      setIsMentionMode(false);
      setSearchTerm('');
    }
  };
  
  // Iniciar mención por botón
  const startMentionByButton = () => {
    if (!inputRef.current) return;
    
    const currentCaret = inputRef.current.selectionStart;
    
    // Insertar @ virtual en la posición actual
    const textBefore = inputTextProp.substring(0, currentCaret);
    const textAfter = inputTextProp.substring(currentCaret);
    const tempTextWithAt = `${textBefore}@${textAfter}`;
    
    setInputText(tempTextWithAt);
    setCursorPosition(currentCaret);
    setSearchTerm('');
    setIsMentionMode(true);
    setIsDropdownOpen(true);
    
    // Actualizar posición del dropdown
    setTimeout(() => openMentionDropdown(currentCaret), 0);
  };
  
  return {
    isMentionMode,
    isDropdownOpen,
    dropdownPosition,
    searchTerm,
    cursorPosition,
    selectedFiles,
    dropdownRef,
    setSelectedFiles,
    openMentionDropdown,
    closeDropdown,
    insertFileMention,
    updateSearchTerm,
    completeMention,
    startMentionByButton
  };
};