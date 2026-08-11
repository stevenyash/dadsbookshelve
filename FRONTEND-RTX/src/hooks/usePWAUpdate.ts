import { useEffect, useState } from 'react'

export function usePWAUpdate() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })

      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', (event) => {
          const newWorker = (event.target as ServiceWorkerRegistration).installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker)
                setShowUpdateDialog(true)
              }
            })
          }
        })
      })
    }
  }, [])

  const updateApp = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' })
    setShowUpdateDialog(false)
  }

  const dismissUpdate = () => {
    setShowUpdateDialog(false)
    setWaitingWorker(null)
  }

  return { showUpdateDialog, updateApp, dismissUpdate }
}