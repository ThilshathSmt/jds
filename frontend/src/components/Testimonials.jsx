import { FaQuoteLeft, FaStar } from 'react-icons/fa6'
import SectionHeading from './SectionHeading'
import { testimonials } from '../data/siteData'

const MAX_RATING = 5

function TestimonialCard({ name, initials, course, rating, quote }) {
  return (
    <figure className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition duration-300 hover:shadow-lg">
      <FaQuoteLeft className="text-2xl text-brand/30" aria-hidden="true" />
      <div
        className="mt-4 flex gap-1"
        role="img"
        aria-label={`Rated ${rating} out of ${MAX_RATING} stars`}
      >
        {Array.from({ length: MAX_RATING }, (_, i) => (
          <FaStar key={i} className={i < rating ? 'text-amber-400' : 'text-gray-200'} />
        ))}
      </div>
      <blockquote className="mt-4 flex-1 text-gray-600">&ldquo;{quote}&rdquo;</blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-white"
          aria-hidden="true"
        >
          {initials}
        </span>
        <span>
          <span className="block font-semibold text-ink">{name}</span>
          <span className="block text-sm text-gray-500">{course}</span>
        </span>
      </figcaption>
    </figure>
  )
}

function Testimonials() {
  return (
    <section id="testimonials" className="bg-white py-16 sm:py-20">
      <div className="container-page">
        <SectionHeading eyebrow="Student Feedback" title="What Our Students Say" />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((testimonial) => (
            <li key={testimonial.initials}>
              <TestimonialCard {...testimonial} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default Testimonials
