import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import './i18n'
import App from './App.tsx'
import { AuthProvider } from './lib/auth'
import { AppThemeProvider } from './components/appdemo/theme'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      {/* persist: the member's display mode and language survive navigation and
          reloads. The /app demo nests its own throwaway provider. */}
      <AppThemeProvider persist>
        <App />
      </AppThemeProvider>
    </AuthProvider>
  </BrowserRouter>,
)
