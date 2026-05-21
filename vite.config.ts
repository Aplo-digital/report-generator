import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/float': {
          target: 'https://api.float.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/float/, ''),
          headers: {
            Authorization: `Bearer ${env.VITE_FLOAT_API_KEY ?? ''}`,
            'User-Agent': 'project-timeline/1.0',
          },
        },
      },
    },
  }
})
