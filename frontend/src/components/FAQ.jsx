import { useState } from 'react'
import { FaChevronDown } from 'react-icons/fa6'
import SectionHeading from './SectionHeading'
import { faqs } from '../data/siteData'

function FAQItem({ faq, number, isOpen, onToggle }) {
  const buttonId = `faq-button-${number}`
  const panelId = `faq-panel-${number}`

  return (
    <li className="border-b border-gray-200">
      <h3>
        <button
          type="button"
          id={buttonId}
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex w-full cursor-pointer items-center gap-4 py-5 text-left"
        >
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold transition-colors ${
              isOpen ? 'bg-brand text-white' : 'bg-brand-soft text-brand'
            }`}
            aria-hidden="true"
          >
            {number}
          </span>
          <span className="flex-1 text-base font-semibold text-ink sm:text-lg">{faq.question}</span>
          <FaChevronDown
            aria-hidden="true"
            className={`shrink-0 text-brand transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </h3>

      {/* Animating grid rows gives a smooth height transition without measuring content */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        inert={!isOpen}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-6 pl-[3.75rem] text-gray-600">
            {faq.steps ? (
              <ul className="list-disc space-y-1.5 pl-5 marker:text-brand">
                {faq.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            ) : (
              <p>{faq.answer}</p>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

function FAQ() {
  // Index of the open question; null when all are collapsed
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="bg-white py-16 sm:py-20">
      <div className="container-page">
        <SectionHeading title="Frequently Asked Questions" />
        <ul className="mx-auto max-w-4xl border-t border-gray-200">
          {faqs.map((faq, index) => (
            <FAQItem
              key={faq.question}
              faq={faq}
              number={index + 1}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </ul>
        <p className="mx-auto mt-6 max-w-4xl text-center text-sm text-gray-500">
          This information is a general guide only. Please confirm current requirements with the
          Department of Motor Traffic or contact us.
        </p>
      </div>
    </section>
  )
}

export default FAQ
