import { useCallback, useEffect, useState } from 'react'
import { getRegistrationOptions } from '../services/settingsApi'

// The active packages and the advance payment rule, loaded from the backend for the Apply
// Now and reapplication forms. `reload()` fetches them again (after the server said they
// changed). `options` is null until loaded.
function useRegistrationOptions() {
  const [options, setOptions] = useState(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    getRegistrationOptions()
      .then((loaded) => {
        if (!active) return
        setOptions(loaded)
        setError('')
      })
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [version])

  const reload = useCallback(() => setVersion((current) => current + 1), [])
  return { options, error, reload }
}

export default useRegistrationOptions
