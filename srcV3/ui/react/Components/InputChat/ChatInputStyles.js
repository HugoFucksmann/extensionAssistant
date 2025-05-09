// Estilos separados en un archivo para mejor mantenibilidad
export const getStyles = (theme) => ({
  container: {
    width: '100%',
    background: theme.colors.background,
    padding: '12px',
    borderTop: `1px solid ${theme.colors.border}`,
    boxSizing: 'border-box'
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: '8px',
    width: '100%'
  },
  input: {
    flex: '1',
    background: theme.colors.inputBg || theme.colors.background,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.small,
    padding: '8px 12px',
    fontSize: '14px',
    lineHeight: '1.4',
    minHeight: '36px',
    maxHeight: '150px',
    overflowY: 'auto',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit'
  },
  sendButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px'
  },
  leftControls: {
    display: 'flex',
    position: 'relative'
  },
  rightControls: {
    display: 'flex'
  },
  modelSelector: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: theme.borderRadius.small,
    background: theme.colors.buttonBg || theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    fontSize: '12px',
    color: theme.colors.text,
    cursor: 'pointer'
  },
  modelSelectorArrow: {
    marginLeft: '4px',
    fontSize: '8px'
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