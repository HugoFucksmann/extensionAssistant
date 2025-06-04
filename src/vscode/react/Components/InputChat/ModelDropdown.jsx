import React from 'react';

const ModelDropdown = ({ 
  options,
  currentModel,
  onSelect,
  position,
  theme
}) => {
  return (
    <div style={{
      position: 'fixed', // Changed from absolute to fixed for better layering
      top: position.top,
      left: position.left,
      width: position.width,
      backgroundColor: theme.colors.background,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)', // Enhanced shadow
      zIndex: 9999, // Much higher z-index
      overflow: 'hidden'
    }}>
      {options.map(option => (
        <div 
          key={option.value}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            color: theme.colors.text,
            backgroundColor: option.value === currentModel 
              ? theme.colors.chatInputBg 
              : 'transparent',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (option.value !== currentModel) {
              e.target.style.backgroundColor = theme.colors.chatInputBg || theme.colors.secondary;
            }
          }}
          onMouseLeave={(e) => {
            if (option.value !== currentModel) {
              e.target.style.backgroundColor = 'transparent';
            }
          }}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </div>
      ))}
    </div>
  );
};

export default ModelDropdown;