import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useAuthStore } from './store/store'

const initAuth = useAuthStore.getState().checkAuth
initAuth()

const cleared = sessionStorage.getItem('dbs-cleared')
if (cleared !== 'yes') {
  sessionStorage.setItem('dbs-cleared', 'yes')
  if ('caches' in window) {
    caches.keys().then((names: string) => names.forEach((name: string) => caches.delete(name)))
  }
  if (navigator.serviceWorker) {
    navigator.serviceWorker.getRegistrations().then((regs: ServiceWorkerRegistration[]) => 
      regs.forEach((reg: ServiceWorkerRegistration) => reg.unregister())
    )
  }
  window.location.reload()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)