import { useEffect } from 'react'

// Calls `refetch()` when the user comes back to the tab or window, so a page left open shows
// what others changed meanwhile (for example attendance marked by an instructor). The data
// always comes from the backend; nothing is changed locally.
function useRefetchOnFocus(refetch) {
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    window.addEventListener('focus', refetch)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', refetch)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refetch])
}

export default useRefetchOnFocus
