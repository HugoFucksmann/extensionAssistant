export type ThemeType = {
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
    border: string;
    chatInputBg: string;
    messageUserBg: string;
    messageAssistantBg: string;
    error: string;
  };
  spacing: {
    small: string;
    medium: string;
    large: string;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  typography: {
    title: string;
    subtitle: string;
    text: string;
  };
};

export const getTheme = (isDarkMode: boolean): ThemeType => ({
  colors: {
    primary: isDarkMode ? '#007acc' : '#006ab1',
    secondary: isDarkMode ? '#252526' : '#e9ebf0',
    text: isDarkMode ? '#e0e0e0' : '#333333',
    background: isDarkMode ? '#1e1e1e' : '#f5fbff',
    border: isDarkMode ? '#454545' : '#cccccc',
    chatInputBg: isDarkMode ? '#2a2d2e' : '#f3f3f3',
    messageUserBg: isDarkMode ? '#0e639c' : '#007acc',
    messageAssistantBg: isDarkMode ? '#2d2d2d' : '#f0f0f0',
    error: isDarkMode ? '#f14c4c' : '#e51400'
  },
  spacing: {
    small: '4px',
    medium: '8px',
    large: '16px'
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px'
  },
  typography: {
    title: '1.5em',
    subtitle: '1.2em',
    text: '1em'
  }
});