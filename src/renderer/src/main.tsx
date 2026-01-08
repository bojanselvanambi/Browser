import './assets/main.css'

import { createRoot } from 'react-dom/client'
import App from './App'

// Note: StrictMode removed because it causes double-execution of setState
// updaters which corrupts drag-drop state operations
createRoot(document.getElementById('root')!).render(<App />)
