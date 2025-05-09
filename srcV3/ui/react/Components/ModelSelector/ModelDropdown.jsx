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
      position: 'absolute',
      top: position.top,
      left: position.left,
      width: position.width,
      backgroundColor: theme.colors.background,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      zIndex: 1000,
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
            '&:hover': {
              backgroundColor: theme.colors.chatInputBg
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
