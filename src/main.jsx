import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Note: StrictMode removed intentionally — it double-invokes effects in dev
// which causes Supabase navigator.locks race conditions ("lock stolen" error)
createRoot(document.getElementById('root')).render(<App />)
