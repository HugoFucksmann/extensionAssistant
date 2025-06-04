// src/vscode/react/context/constants.ts

export const DEFAULT_LOADING_TEXT = 'AI is thinking...';

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
export const body = isBrowser ? document.body : null;
export const initialIsDarkMode = isBrowser && body ? body.classList.contains('vscode-dark') : false;