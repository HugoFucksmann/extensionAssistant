export const getStyles = (theme) => ({
  // Main container
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    padding: '4px',
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.medium,
  },

  // Input section
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  inputWrapper: {
    flex: 1,
    padding: '8px',
    fontSize: theme.typography.text,
    fontFamily: 'inherit',
    color: theme.colors.text,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
  },
  input: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    width: '100%',
    color: theme.colors.text,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    padding: 0,
    margin: 0,
    '::placeholder': {
      color: theme.colors.textSecondary || theme.colors.text,
      opacity: 0.6,
    }
  },

  // Buttons
  sendButton: {
    padding: '8px',
    fontSize: theme.typography.text,
    fontFamily: 'inherit',
    color: theme.colors.primary,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    transition: theme.transitions.fast,
    borderRadius: theme.borderRadius.small,
    ':hover': {
      backgroundColor: theme.colors.glassBackgroundHover,
    },
    ':disabled': {
      cursor: 'not-allowed',
      opacity: 0.5,
    }
  },
  fileButton: {
    padding: '4px',
    fontSize: theme.typography.text,
    fontFamily: 'inherit',
    color: theme.colors.primary,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    transition: theme.transitions.fast,
    borderRadius: theme.borderRadius.small,
    ':hover': {
      backgroundColor: theme.colors.glassBackgroundHover,
    }
  },

  // Controls section
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px',
  },
  leftControls: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  rightControls: {
    display: 'flex',
    alignItems: 'center',
  },
  modelSelector: {
    padding: '4px 8px',
    fontSize: theme.typography.small,
    fontFamily: 'inherit',
    color: theme.colors.text,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    borderRadius: theme.borderRadius.small,
    transition: theme.transitions.fast,
    ':hover': {
      backgroundColor: theme.colors.glassBackgroundHover,
    }
  },

  // File chips section
  fileChipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    padding: '8px 8px 0px 8px',
    borderBottom: `1px solid ${theme.colors.border}`,
    gap: '4px'
  },

  // File chip component styles
  fileChip: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
    color: theme.colors.text,
    padding: '6px 12px',
    borderRadius: theme.borderRadius.large,
    marginRight: '8px',
    marginBottom: '8px',
    fontSize: theme.typography.small,
    cursor: 'default',
    boxShadow: theme.shadows.small,
    border: `1px solid ${theme.colors.border}`,
    transition: theme.transitions.fast,
  },
  fileChipText: {
    maxWidth: '150px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileChipRemoveButton: {
    marginLeft: '8px',
    background: 'transparent',
    border: 'none',
    color: theme.colors.text,
    cursor: 'pointer',
    padding: '0',
    fontSize: '16px',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: theme.transitions.fast,
    ':hover': {
      backgroundColor: theme.colors.error,
      color: theme.colors.background,
    }
  },

  // Dropdown styles
  dropdown: {
    position: 'fixed',
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.medium,
    boxShadow: theme.shadows.medium,
    zIndex: 9999,
    overflow: 'hidden',
  },
  
  // File dropdown specific
  fileDropdown: {
    position: 'fixed',
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.medium,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '250px',
    boxShadow: theme.shadows.medium,
  },
  fileDropdownHeader: {
    padding: '8px 12px',
    borderBottom: `1px solid ${theme.colors.border}`,
    fontWeight: 'bold',
    fontSize: theme.typography.small,
    color: theme.colors.text,
    backgroundColor: theme.colors.secondary,
  },
  fileDropdownList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    overflowY: 'auto',
    flexGrow: 1,
  },
  fileDropdownEmptyState: {
    padding: '12px',
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: theme.typography.small,
    opacity: 0.6,
  },

  // File item in dropdown
  fileItem: {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: theme.typography.small,
    backgroundColor: 'transparent',
    color: theme.colors.text,
    borderBottom: `1px solid ${theme.colors.border}`,
    transition: theme.transitions.fast,
    ':hover': {
      backgroundColor: theme.colors.glassBackgroundHover,
    }
  },
  fileItemActive: {
    backgroundColor: theme.colors.primary,
    color: theme.colors.background,
  },
  fileItemName: {
    fontWeight: 'bold',
    marginBottom: '2px',
  },
  fileItemPath: {
    fontSize: theme.typography.small,
    opacity: 0.7,
    fontStyle: 'italic',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  // Model dropdown
  modelDropdown: {
    position: 'fixed',
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.medium,
    boxShadow: theme.shadows.medium,
    zIndex: 9999,
    overflow: 'hidden'
  },
  modelDropdownItem: {
    padding: '8px 16px',
    cursor: 'pointer',
    color: theme.colors.text,
    backgroundColor: 'transparent',
    fontSize: theme.typography.text,
    transition: theme.transitions.fast,
    ':hover': {
      backgroundColor: theme.colors.glassBackgroundHover,
    }
  },
  modelDropdownItemActive: {
    backgroundColor: theme.colors.secondary,
  },

  // Icons
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: theme.borderRadius.small,
    transition: theme.transitions.fast,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: theme.colors.glassBackgroundHover,
    }
  },

  // Loading states
  loadingText: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    opacity: 0.6,
    fontStyle: 'italic',
  },

  // Utilities
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flexStart: {
    display: 'flex',
    alignItems: 'center',
  },
  textTruncate: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});