import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import { AppProvider } from '../react/context/AppContext';

declare function acquireVsCodeApi(): any;

const AppWithProvider = () => (
  <AppProvider>
    <App />
  </AppProvider>
);

const root = document.getElementById('root');
ReactDOM.render(<AppWithProvider />, root);