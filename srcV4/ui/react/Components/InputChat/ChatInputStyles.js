export const getStyles = (theme) => ({
  container: {
    width: '100%',
    maxWidth: 'calc(100% - 24px)',
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.medium,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    boxSizing: 'border-box'
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative'
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '38px',
    padding: '0 52px 0 16px',
    border: 'none',
    borderRadius: theme.borderRadius.small,
    backgroundColor: theme.colors.chatInputBg,
    color: theme.colors.text,
    outline: 'none',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    lineHeight: '38px'
  },
  sendButton: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-40%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px'
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing.medium,
    padding: `${theme.spacing.small}`
  },
  leftControls: {
    display: 'flex',
    gap: theme.spacing.medium
  },
  rightControls: {
    display: 'flex',
    gap: theme.spacing.medium
  },
  modelSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
    cursor: 'pointer',
    color: theme.colors.text,
    position: 'relative'
  },
  modelSelectorArrow: {
    marginLeft: theme.spacing.small,
    transition: 'transform 0.2s',
    fontSize: '0.8em'
  },
  mentionDropdown: {
    position: 'absolute',
    zIndex: 1000,
    width: '250px',
    maxHeight: '300px',
    backgroundColor: theme.colors.dropdownBg || theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.small,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  searchContainer: {
    padding: theme.spacing.small,
    borderBottom: `1px solid ${theme.colors.border}`
  },
  searchInput: {
    width: '100%',
    padding: `${theme.spacing.small} ${theme.spacing.medium}`,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.small,
    backgroundColor: theme.colors.inputBg || theme.colors.background,
    color: theme.colors.text,
    fontSize: '12px',
    outline: 'none'
  },
  fileList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    overflowY: 'auto',
    maxHeight: '250px'
  },
  fileItem: {
    padding: `${theme.spacing.small} ${theme.spacing.medium}`,
    cursor: 'pointer',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    borderBottom: `1px solid ${theme.colors.border}`,
    color: theme.colors.text
  },
  noFiles: {
    padding: theme.spacing.medium,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: '12px'
  },
  header: {
    padding: `${theme.spacing.small} ${theme.spacing.medium}`,
    borderBottom: `1px solid ${theme.colors.border}`,
    fontWeight: 'bold',
    fontSize: '12px',
    color: theme.colors.text
  },
  fileButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: theme.colors.text,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
});