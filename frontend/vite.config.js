import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import mkcert from 'vite-plugin-mkcert'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    base: env.VITE_BASE_URL,
    server: {
      middlewareMode: false,
      setupMiddlewares(middlewares, devServer) {
        middlewares.use((req, res, next) => {
          const rawBase = (env.VITE_BASE_URL || '/').replace(/\/+$/, '');
          if (rawBase && rawBase !== '') {
            const url = req.url ? req.url.split('?')[0] : '';
            const search = req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
            if (url === rawBase) {
              res.writeHead(301, { Location: `${rawBase}/${search}` });
              
              return res.end();
            }
          }
          next();
        });
        return middlewares;
      },
      proxy: {
        '/backend': {
          target: 'https://webscape.co.in',
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: "localhost"
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
  }
})
