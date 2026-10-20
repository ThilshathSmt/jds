import { useEffect, useRef } from 'react'
import winter1 from '../assets/images/Winter_1.png'
import winter2 from '../assets/images/Winter_2.png'
import winter3 from '../assets/images/Winter_3.png'
import winter4 from '../assets/images/Winter_4.png'

const winterImages = [winter1, winter2, winter3, winter4]
const imageOpacity = 0.5

const clamp = (value) => Math.max(0, Math.min(1, value))
const fade = (progress, start, end) => clamp((progress - start) / (end - start))

function applyProgress(layer, progress, viewportWidth) {
  const firstFade = fade(progress, 0.25, 0.5)
  const secondFade = fade(progress, 0.5, 0.75)
  const thirdFade = fade(progress, 0.75, 1)
  const weights = [
    1 - firstFade,
    firstFade * (1 - secondFade),
    secondFade * (1 - thirdFade),
    thirdFade,
  ]

  layer.style.setProperty('--winter-progress', progress.toFixed(4))
  layer.style.setProperty('--winter-drift', `${(-progress * Math.min(viewportWidth * 0.008, 12)).toFixed(2)}px`)
  layer.style.setProperty('--winter-scale', (1.035 + progress * 0.018).toFixed(4))
  weights.forEach((weight, index) => {
    layer.style.setProperty(`--winter-${index + 1}-opacity`, (weight * imageOpacity).toFixed(4))
  })
}

function HomePageBackground({ children }) {
  const pageRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    const page = pageRef.current
    const layer = layerRef.current
    if (!page || !layer) return undefined

    // Warm all four exact local assets before a scroll can reveal their layers.
    winterImages.forEach((src) => {
      const image = new Image()
      image.decoding = 'async'
      image.src = src
    })

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let frame = null
    let active = false
    const update = () => {
      if (!active || reducedMotion?.matches || frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        const bounds = page.getBoundingClientRect()
        const maxScroll = Math.max(1, page.offsetHeight - window.innerHeight)
        applyProgress(layer, clamp(-bounds.top / maxScroll), window.innerWidth)
      })
    }
    const pageObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    pageObserver?.observe(page)

    const stop = () => {
      if (!active) return
      active = false
      window.removeEventListener('scroll', update)
      if (frame !== null) window.cancelAnimationFrame(frame)
      frame = null
      applyProgress(layer, 0, window.innerWidth)
    }

    const start = () => {
      if (active) return
      active = true
      window.addEventListener('scroll', update, { passive: true })
      update()
    }

    const syncMotionPreference = () => {
      if (reducedMotion?.matches) stop()
      else {
        start()
        update()
      }
    }

    window.addEventListener('resize', update, { passive: true })
    reducedMotion?.addEventListener?.('change', syncMotionPreference)
    syncMotionPreference()

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
      reducedMotion?.removeEventListener?.('change', syncMotionPreference)
      pageObserver?.disconnect()
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div ref={pageRef} className="home-background">
      <div ref={layerRef} className="home-background__scene" aria-hidden="true">
        {winterImages.map((src, index) => (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            draggable="false"
            decoding="async"
            fetchPriority={index === 0 ? 'high' : 'auto'}
            className={`home-background__image home-background__image--${index + 1}`}
          />
        ))}
        <span className="home-background__wash" />
      </div>
      <div className="home-background__content">{children}</div>
    </div>
  )
}

export default HomePageBackground
