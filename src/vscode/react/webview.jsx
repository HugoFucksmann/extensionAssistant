import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import { AppProvider } from './context/AppContext';


const AppWithProvider = () => (
  <AppProvider>
    <App />
  </AppProvider>
);

const root = document.getElementById('root');
ReactDOM.render(<AppWithProvider />, root);