import { useEffect, useRef } from 'react'

export default function useScrollReveal(enabled = true) {
  const ref = useRef(null)

  useEffect(() => {
    if (!enabled || !ref.current) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const element = ref.current
    let observer
    try {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return
          element.classList.add('is-revealed')
          observer.unobserve(element)
        },
        { threshold: 0.12, rootMargin: '0px 0px -5% 0px' },
      )
      observer.observe(element)
    } catch {
      // Keep content visible if IntersectionObserver is unavailable.
      element.classList.add('is-revealed')
      return undefined
    }
    return () => {
      observer?.disconnect()
    }
  }, [enabled])

  return { ref, className: enabled ? 'scroll-reveal' : '' }
}
