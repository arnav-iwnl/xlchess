import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY — add it to your .env file')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider
      telemetry={false}
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={{ baseTheme: dark }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
