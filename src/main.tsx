import './styles.css'
import { mountApp } from './app/main'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found.')
}

mountApp(rootElement)
