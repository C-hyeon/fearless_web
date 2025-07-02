import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import App from './App.jsx'
import { PlaytimeProvider } from './utils/PlaytimeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PlaytimeProvider>
      <App />
    </PlaytimeProvider>
  </StrictMode>
);