import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { InstallPrompt } from './components/ui/InstallPrompt.tsx'
import { InstallNotification } from './components/ui/InstallNotification.tsx'
import { OfflineIndicator } from './components/ui/OfflineIndicator.tsx'
import { initPWA } from './utils/pwa.ts'
import { useNotesStore } from './store/notesStore.ts'
import { initializeAnalytics } from './utils/analytics.ts'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import './highlightjs-theme.css'
import App from './App.tsx'

// Initialize PWA
initPWA();

// Initialize analytics (respects consent)
initializeAnalytics();

// Set up offline/online event listeners
if (typeof window !== 'undefined') {
  const setIsOnline = useNotesStore.getState().setIsOnline;
  
  // Set initial online state
  setIsOnline(navigator.onLine);
  
  // Listen for online/offline events
  window.addEventListener('online', () => {
    setIsOnline(true);
  });
  
  window.addEventListener('offline', () => {
    setIsOnline(false);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <InstallPrompt />
      <InstallNotification />
      <OfflineIndicator />
      <Toaster position="top-right" />
    </ErrorBoundary>
  </StrictMode>,
)
