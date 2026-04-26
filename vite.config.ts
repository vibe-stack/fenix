import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'

const getBasePath = () => {
  if (process.env.GITHUB_PAGES !== 'true') {
    return '/'
  }

  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]

  if (!repositoryName || repositoryName.endsWith('.github.io')) {
    return '/'
  }

  return `/${repositoryName}/`
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const useLocalHttps = command === 'serve'

  return {
    base: getBasePath(),
    plugins: [react(), tailwindcss(), ...(useLocalHttps ? [basicSsl()] : [])],
    ...(useLocalHttps
      ? {
          server: {
            host: true,
            https: {},
          },
          preview: {
            host: true,
            https: {},
          },
        }
      : {}),
  }
})
