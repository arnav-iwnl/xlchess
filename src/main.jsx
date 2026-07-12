import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
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
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#8b7bf0',
          colorBackground: '#121a3a',
          colorInputBackground: '#1b2550',
          colorInputText: '#f5f4ef',
          colorText: '#ffffff',
          colorTextSecondary: '#9aa3c7',
          colorDanger: '#e05a4e',
          borderRadius: '10px',
        },
        elements: {
          card: 'bg-[#121a3a] border border-[#1b2550] shadow-2xl',
          formButtonPrimary: 'bg-[#8b7bf0] hover:bg-[#6f5be0]',
          footerActionLink: 'text-[#b6a9ff] hover:text-[#8b7bf0]',
          headerTitle: 'text-[#f5f4ef]',
          headerSubtitle: 'text-[#9aa3c7]',
          socialButtonsBlockButton: 'bg-[#1b2550] border-[#1b2550] !text-[#f5f4ef] hover:bg-[#252f5a]',
          socialButtonsBlockButtonText: '!text-[#f5f4ef]',
          dividerLine: 'bg-[#1b2550]',
          dividerText: 'text-[#9aa3c7]',
          formFieldLabel: 'text-[#9aa3c7]',
          formFieldInput: 'bg-[#1b2550] border-[#1b2550] text-[#f5f4ef]',
          identityPreview: 'bg-[#1b2550] border-[#1b2550]',
          userButtonPopoverCard: 'bg-[#121a3a] border border-[#1b2550] shadow-2xl !text-[#f5f4ef]',
          userButtonPopoverActionButton: 'hover:bg-[#1b2550] !text-[#f5f4ef]',
          userButtonPopoverActionButtonText: '!text-[#f5f4ef]',
          userButtonPopoverActionButtonIcon: '!text-[#9aa3c7]',
          userPreviewMainIdentifier: '!text-[#f5f4ef]',
          userPreviewSecondaryIdentifier: '!text-[#9aa3c7]',
          userButtonPopoverFooter: 'bg-[#121a3a]',
        },
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
