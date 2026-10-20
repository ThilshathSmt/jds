import { useCallback, useEffect, useRef, useState } from 'react'
import useRefetchOnFocus from '../../utils/useRefetchOnFocus'

export default function useDashboardData(load) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const requestId = useRef(0)
  const mounted = useRef(true)
  const refresh = useCallback(async () => {
    const id = ++requestId.current
    setState((current) => ({ ...current, loading: current.data === null, error: '' }))
    try {
      const data = await load()
      if (mounted.current && id === requestId.current) setState({ data, loading: false, error: '' })
    } catch (error) {
      if (mounted.current && id === requestId.current) setState({ data: null, loading: false, error: error.message || 'Could not load dashboard data.' })
    }
  }, [load])
  useEffect(() => {
    mounted.current = true
    refresh()
    return () => { mounted.current = false; requestId.current += 1 }
  }, [refresh])
  useRefetchOnFocus(refresh)
  return { ...state, refresh }
}
