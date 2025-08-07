import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import awsexports from '../../src/amplifyconfiguration.json';
import { Amplify } from 'aws-amplify';
import { ThemeProvider } from '@aws-amplify/ui-react';

Amplify.configure(awsexports);


ReactDOM.createRoot(document.getElementById('root')).render(
    <ThemeProvider>
          <App />
    </ThemeProvider>
);