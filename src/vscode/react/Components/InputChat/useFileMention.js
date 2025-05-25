import { useState, useRef, useEffect } from 'react';

export const useFileMention = (inputRef, inputTextProp, setInputText) => {
  const [isMentionMode, setIsMentionMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0); // Posición del '@' que inició la mención
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          inputRef.current && !inputRef.current.contains(event.target)) { // No cerrar si se hace clic en el input
        closeDropdown();
      }
    };
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, inputRef]); // Añadir inputRef a dependencias
  
  const closeDropdown = () => {
    setIsDropdownOpen(false);
    if (isMentionMode) { // Solo resetear modo mención si estábamos en él
      setIsMentionMode(false);
      setSearchTerm('');
      // No resetear cursorPosition aquí, podría ser útil si se reabre inmediatamente
    }
  };
  
  const openMentionDropdown = (atPosition) => {
    if (!inputRef.current) return;
    
    const rect = inputRef.current.getBoundingClientRect();
    
    setDropdownPosition({
      top: rect.top - 220, 
      left: rect.left, 
      width: rect.width 
    });
    
    setCursorPosition(atPosition); // Guardar la posición del '@'
    setIsMentionMode(true);
    setIsDropdownOpen(true);
    setSearchTerm(''); // Iniciar con término de búsqueda vacío
  };
  
  const insertFileMention = (fullPath) => {
    const fileName = fullPath.split(/[\/\\]/).pop();
    const textToInsert = `${fileName} `; // Añadir un espacio después
    
    // inputTextProp es el texto actual del input
    // cursorPosition es la posición donde se escribió el '@' original
    // searchTerm es el texto que el usuario escribió después del '@'
    
    const textBeforeAt = inputTextProp.substring(0, cursorPosition);
    const lengthOfReplacedText = 1 + searchTerm.length; // '@' + searchTerm
    const textAfterMentionPoint = inputTextProp.substring(cursorPosition + lengthOfReplacedText);
    
    const newText = `${textBeforeAt}${textToInsert}${textAfterMentionPoint}`;
    setInputText(newText);
    
    if (!selectedFiles.some(f => f === fullPath)) {
      setSelectedFiles(prev => [...prev, fullPath]);
    }
    
    closeDropdown();
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const finalCursorPos = textBeforeAt.length + textToInsert.length;
        inputRef.current.setSelectionRange(finalCursorPos, finalCursorPos);
      }
    }, 0);
  };
  
  const updateSearchTerm = (currentTextValue, caretPositionInInput) => {
    // cursorPosition es la posición del '@' que inició el modo mención.
    if (isMentionMode && caretPositionInInput >= cursorPosition) {
      // Asegurarse que el carácter en cursorPosition (donde estaba el '@') sigue siendo '@'.
      if (currentTextValue[cursorPosition] === '@') {
        const textAfterAt = currentTextValue.substring(cursorPosition + 1, caretPositionInInput);
        setSearchTerm(textAfterAt);

        if (!isDropdownOpen) { // Si el dropdown se cerró por alguna razón (ej. Escape) y el usuario sigue escribiendo
          setIsDropdownOpen(true); 
        }
      } else {
        // El '@' original fue eliminado, salir del modo mención.
        closeDropdown();
      }
    } else if (isMentionMode && caretPositionInInput < cursorPosition) {
      // El cursor se movió antes del '@' original, salir del modo mención.
      closeDropdown();
    }
    // Si no está en isMentionMode, esta función no debería hacer nada.
  };
  
  // completeMention no se usa activamente con la nueva lógica de Enter en ChatInput
  // pero se mantiene por si se necesita en el futuro.
  const completeMention = (filteredFiles) => {
    if (isMentionMode && searchTerm && filteredFiles.length > 0) {
      insertFileMention(filteredFiles[0]); // Inserta el primer archivo coincidente
    } else {
      // Si no hay coincidencias o no hay término, simplemente cierra el modo mención
      closeDropdown();
    }
  };
  
  const startMentionByButton = () => {
    if (!inputRef.current) return;
    
    const currentCaret = inputRef.current.selectionStart;
    const textBefore = inputTextProp.substring(0, currentCaret);
    const textAfter = inputTextProp.substring(currentCaret);
    
    const tempTextWithAt = `${textBefore}@${textAfter}`;
    setInputText(tempTextWithAt); // Actualizar el input text
    
    // Usar setTimeout para asegurar que el input se actualice y el cursor se posicione
    // antes de llamar a openMentionDropdown, que puede depender de la geometría del input.
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Mueve el cursor a justo después del '@' insertado
        inputRef.current.setSelectionRange(currentCaret + 1, currentCaret + 1); 
      }
      // `currentCaret` es la posición donde se insertó el '@'.
      // openMentionDropdown usará esta posición como `cursorPosition` para la mención.
      openMentionDropdown(currentCaret); 
    }, 0);
  };
  
  return {
    isMentionMode,
    isDropdownOpen,
    dropdownPosition,
    searchTerm,
    // cursorPosition, // No es necesario exponerlo fuera del hook
    selectedFiles,
    dropdownRef,
    setSelectedFiles, // Exponer para que ChatInput pueda limpiar al enviar mensaje
    openMentionDropdown,
    closeDropdown,
    insertFileMention,
    updateSearchTerm,
    completeMention,
    startMentionByButton
  };
};