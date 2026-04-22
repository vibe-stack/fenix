import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

export function mountApp(container: HTMLElement) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
