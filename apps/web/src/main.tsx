import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from './router';
import { AuthProvider } from './context/AuthContext';
import { RepoProvider } from './context/RepoContext';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider>
      <AuthProvider>
        <RepoProvider>
          <App />
        </RepoProvider>
      </AuthProvider>
    </RouterProvider>
  </React.StrictMode>
);
