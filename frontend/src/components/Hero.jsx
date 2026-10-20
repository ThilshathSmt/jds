import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { FaArrowRight, FaCircleCheck } from 'react-icons/fa6'
// TODO: Replace with an official Jeslan Driving School image if available
import heroImage from '../assets/images/hero-driving.svg'

const highlights = ['Experienced instructors', 'Theory & practical lessons', 'Cars & motorcycles']

function Hero() {
  const heroRef = useRef(null)

  useEffect(() => {
    const section = heroRef.current
    if (!section || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    let frame = null
    const update = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        const rect = section.getBoundingClientRect()
        const progress = Math.max(-1, Math.min(1, -rect.top / Math.max(rect.height, 1)))
        section.style.setProperty('--hero-parallax', `${progress * 24}px`)
        section.style.setProperty('--hero-copy-parallax', `${progress * 10}px`)
      })
    }
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', update)
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section
      ref={heroRef}
      id="home"
      className="hero-parallax relative isolate overflow-hidden bg-gradient-to-b from-white to-brand-soft/60"
    >
      <span className="hero-parallax__shape hero-parallax__shape--one" aria-hidden="true" />
      <span className="hero-parallax__shape hero-parallax__shape--two" aria-hidden="true" />
      <div className="container-page relative z-10 grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:py-20">
        <div className="hero-parallax__copy text-center lg:text-left">
          <p className="mb-4 inline-block rounded-full bg-brand-soft px-4 py-1.5 text-sm font-semibold text-brand">
            Jeslan Driving School
          </p>
          <h1 className="text-4xl leading-tight font-extrabold text-ink sm:text-5xl xl:text-6xl">
            Drive With <span className="text-brand">Confidence</span>, Learn With Us!
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-gray-600 sm:text-lg lg:mx-0">
            Start your journey to becoming a safe, confident and responsible driver with Jeslan
            Driving School.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
            <Link to="/apply" className="btn btn-primary">
              Apply Now
              <FaArrowRight aria-hidden="true" />
            </Link>
            <a href="#resources" className="btn btn-outline">
              Explore Courses
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-gray-700 lg:justify-start">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <FaCircleCheck className="text-brand" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <img
          src={heroImage}
          alt="Learner car with an L plate driving past road signs"
          className="hero-parallax__illustration mx-auto w-full max-w-xl"
        />
      </div>
    </section>
  )
}

export default Hero
