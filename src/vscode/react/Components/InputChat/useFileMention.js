import { useState, useRef, useEffect } from 'react';

export const useFileMention = (inputRef, inputTextProp, setInputText) => {
  const [isMentionMode, setIsMentionMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          inputRef.current && !inputRef.current.contains(event.target)) {
        closeDropdown();
      }
    };
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, inputRef]);
  
  const closeDropdown = () => {
    setIsDropdownOpen(false);
    if (isMentionMode) {
      setIsMentionMode(false);
      setSearchTerm('');
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
    
    setCursorPosition(atPosition);
    setIsMentionMode(true);
    setIsDropdownOpen(true);
    setSearchTerm('');
  };
  
  const insertFileMention = (fullPath) => {
    const fileName = fullPath.split(/[\/\\]/).pop();
    const textToInsert = `${fileName} `;
    
    const textBeforeAt = inputTextProp.substring(0, cursorPosition);
    const lengthOfReplacedText = 1 + searchTerm.length;
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
    if (isMentionMode && caretPositionInInput >= cursorPosition) {
      if (currentTextValue[cursorPosition] === '@') {
        const textAfterAt = currentTextValue.substring(cursorPosition + 1, caretPositionInInput);
        setSearchTerm(textAfterAt);

        if (!isDropdownOpen) {
          setIsDropdownOpen(true); 
        }
      } else {
        closeDropdown();
      }
    } else if (isMentionMode && caretPositionInInput < cursorPosition) {
      closeDropdown();
    }
  };
  
  const startMentionByButton = () => {
    if (!inputRef.current) return;
    
    const currentCaret = inputRef.current.selectionStart;
    const textBefore = inputTextProp.substring(0, currentCaret);
    const textAfter = inputTextProp.substring(currentCaret);
    
    const tempTextWithAt = `${textBefore}@${textAfter}`;
    setInputText(tempTextWithAt);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(currentCaret + 1, currentCaret + 1); 
      }
      openMentionDropdown(currentCaret); 
    }, 0);
  };
  
  return {
    isMentionMode,
    isDropdownOpen,
    dropdownPosition,
    searchTerm,
    selectedFiles,
    dropdownRef,
    setSelectedFiles,
    openMentionDropdown,
    closeDropdown,
    insertFileMention,
    updateSearchTerm,
    // completeMention, // Eliminado
    startMentionByButton
  };
};