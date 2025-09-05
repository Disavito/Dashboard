import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from '@/components/ui-custom/theme-provider'; // Import your ThemeProvider

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </StrictMode>
);
