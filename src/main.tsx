import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global Error Handler for Unhandled Rejections and Runtime Errors
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason || event);
  // Optionally, you can send this error to your monitoring service
});

window.addEventListener('error', (event) => {
  console.error('Uncaught Exception:', event.error || event.message);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
