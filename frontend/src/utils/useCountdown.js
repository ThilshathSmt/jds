import { useEffect, useState } from 'react'

// Whole seconds left, counting down from what the backend last reported.
// `remainingSeconds` and `syncedAt` come from a backend response: the count restarts from
// them whenever a new response arrives. The time left is worked out from how long ago
// that was, not by subtracting one each tick, so a sleeping tab or a slow timer cannot
// make it drift. It is for display only: the backend enforces the real deadline.
function useCountdown(remainingSeconds, syncedAt) {
  const [left, setLeft] = useState(remainingSeconds)

  useEffect(() => {
    const receivedAt = Date.now()
    const update = () =>
      setLeft(Math.max(0, remainingSeconds - Math.floor((Date.now() - receivedAt) / 1000)))
    update()
    const timer = setInterval(update, 250)
    return () => clearInterval(timer)
  }, [remainingSeconds, syncedAt])

  return left
}

export default useCountdown
