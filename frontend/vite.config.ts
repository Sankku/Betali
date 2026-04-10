import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Bundle visualizer: solo activo con ANALYZE=true para no afectar builds normales
// Uso: ANALYZE=true bun run build
let visualizer: any = null;
if (process.env.ANALYZE === 'true') {
  try {
    const { visualizer: v } = await import('rollup-plugin-visualizer');
    visualizer = v({ open: true, gzipSize: true, brotliSize: true, filename: 'dist/bundle-stats.html' });
  } catch (_) {}
}

export default defineConfig({
  plugins: [react(), ...(visualizer ? [visualizer] : [])],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
  },
  build: {
    // Advertir sobre chunks > 500KB
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cargado en TODAS las páginas
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase — cargado en TODAS las páginas (auth)
          'vendor-supabase': ['@supabase/supabase-js'],
          // TanStack Query — cargado en TODAS las páginas
          'vendor-query': ['@tanstack/react-query'],
          // Recharts — solo cargado en dashboard con gráficos (lazy)
          'vendor-recharts': ['recharts'],
          // Form libraries — solo páginas con formularios
          'vendor-forms': ['react-hook-form', 'yup', '@hookform/resolvers'],
          // date-fns — utilities de fecha
          'vendor-date': ['date-fns'],
          // Tablas — componente compartido pesado
          'vendor-table': ['@tanstack/react-table'],
        },
      },
    },
  },
});