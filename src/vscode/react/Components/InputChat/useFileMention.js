import { useState, useRef, useEffect } from 'react';

export const useFileMention = (inputRef, inputTextProp, setInputText) => {
  const [isMentionMode, setIsMentionMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileNamePositions, setFileNamePositions] = useState([]); // Track file name positions
  
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

  // Monitor text changes to detect file name modifications
  useEffect(() => {
    if (!isMentionMode && fileNamePositions.length > 0) {
      checkForModifiedFileNames(inputTextProp);
    }
  }, [inputTextProp, isMentionMode, fileNamePositions.length]);

  // Check if any file names in the text have been modified or deleted
  const checkForModifiedFileNames = (newText) => {
    if (fileNamePositions.length === 0) return;
    
    const filesToRemove = [];
    let modifiedText = newText;
    
    // Process from right to left to avoid position shifting issues
    const sortedPositions = [...fileNamePositions].sort((a, b) => b.startPos - a.startPos);
    
    for (const { fileName, filePath, startPos, endPos } of sortedPositions) {
      const actualText = modifiedText.substring(startPos, endPos);
      
      // If filename is intact, continue
      if (actualText === fileName) continue;
      
      // Check if filename was partially modified
      const partialText = modifiedText.substring(startPos, Math.min(startPos + fileName.length, modifiedText.length));
      
      if (partialText && fileName.startsWith(partialText) && partialText !== fileName) {
        // Partial deletion detected - remove entire filename
        const before = modifiedText.substring(0, startPos);
        const after = modifiedText.substring(Math.min(startPos + fileName.length, modifiedText.length));
        
        // Remove trailing space if present
        const cleanAfter = after.startsWith(' ') ? after.substring(1) : after;
        modifiedText = before + cleanAfter;
        
        filesToRemove.push(filePath);
      } else if (!modifiedText.includes(fileName)) {
        // Filename completely removed
        filesToRemove.push(filePath);
      }
    }
    
    // Update text if changes were made
    if (modifiedText !== newText) {
      setInputText(modifiedText);
    }
    
    // Remove files and update positions
    if (filesToRemove.length > 0) {
      setSelectedFiles(prev => prev.filter(path => !filesToRemove.includes(path)));
      updateFileNamePositions(modifiedText);
    }
  };

  // Update file name positions when text changes
  const updateFileNamePositions = (newText) => {
    const updatedPositions = [];
    
    selectedFiles.forEach(filePath => {
      const fileName = filePath.split(/[\/\\]/).pop();
      const index = newText.indexOf(fileName);
      
      if (index !== -1) {
        updatedPositions.push({
          fileName,
          filePath,
          startPos: index,
          endPos: index + fileName.length
        });
      }
    });
    
    setFileNamePositions(updatedPositions);
  };
  
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
      
      // Add position tracking for the new file
      const startPos = textBeforeAt.length;
      const endPos = startPos + fileName.length;
      setFileNamePositions(prev => [...prev, {
        fileName,
        filePath: fullPath,
        startPos,
        endPos
      }]);
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
    // Always check for modified file names first when NOT in mention mode
    if (!isMentionMode) {
      checkForModifiedFileNames(currentTextValue);
      return;
    }
    
    // Handle mention mode logic
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

  // Function to manually remove a file (called from chip removal)
  const removeFile = (filePathToRemove) => {
    // Remove from selected files
    setSelectedFiles(prev => prev.filter(f => f !== filePathToRemove));
    
    // Find and remove the file name from text
    const fileToRemove = fileNamePositions.find(f => f.filePath === filePathToRemove);
    if (fileToRemove) {
      const { fileName, startPos, endPos } = fileToRemove;
      const currentText = inputTextProp;
      
      // Remove the file name and any trailing space
      let newText = currentText.substring(0, startPos) + currentText.substring(endPos);
      if (newText[startPos] === ' ') {
        newText = newText.substring(0, startPos) + newText.substring(startPos + 1);
      }
      
      setInputText(newText);
      
      // Update positions for remaining files
      const updatedPositions = fileNamePositions
        .filter(f => f.filePath !== filePathToRemove)
        .map(f => {
          if (f.startPos > endPos) {
            const adjustment = endPos - startPos + (currentText[endPos] === ' ' ? 1 : 0);
            return {
              ...f,
              startPos: f.startPos - adjustment,
              endPos: f.endPos - adjustment
            };
          }
          return f;
        });
      
      setFileNamePositions(updatedPositions);
    }
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
    startMentionByButton,
    removeFile,
    fileNamePositions // Expose for debugging if needed
  };
};