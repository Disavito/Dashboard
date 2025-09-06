import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['@tanstack/react-table'], // Forzar a Vite a incluir @tanstack/react-table en la optimización
    exclude: ['lucide-react'],
  },
  build: {
    // Aumenta el límite de la advertencia a 1500 KB (1.5 MB)
    chunkSizeWarningLimit: 1500,
  },
	preview: {
    host: true,
    allowedHosts: ['n8n-dashboard.mv7mvl.easypanel.host']
  }
});
