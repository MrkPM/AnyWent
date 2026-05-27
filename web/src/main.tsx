import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './hooks/useAuth.js'
import { App } from './App.js'
import './styles/global.css'

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider publishableKey={clerkKey}>
      <App />
    </AuthProvider>
  </StrictMode>
)
