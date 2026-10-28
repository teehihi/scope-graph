import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from './router';
import { AuthProvider } from './context/AuthContext';
import { RepoProvider } from './context/RepoContext';
import { LanguageProvider } from './context/LanguageContext';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider>
      <LanguageProvider>
        <AuthProvider>
          <RepoProvider>
            <App />
          </RepoProvider>
        </AuthProvider>
      </LanguageProvider>
    </RouterProvider>
  </React.StrictMode>
);
