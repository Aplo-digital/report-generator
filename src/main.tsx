import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@aplo/ui/styles'
import './index.css'
import { AploProvider } from '@aplo/ui'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AploProvider>
      <App />
    </AploProvider>
  </StrictMode>,
)
