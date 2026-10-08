// TODO: Replace with an official Jeslan Driving School illustration if available
import examImage from '../../assets/images/exam-papers.svg'

function ExamHero({ text }) {
  return (
    <section className="bg-gradient-to-b from-white to-brand-soft/60">
      <div className="container-page grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[3fr_2fr] lg:py-16">
        <div className="text-center lg:text-left">
          <p className="mb-4 inline-block rounded-full bg-brand-soft px-4 py-1.5 text-sm font-semibold text-brand">
            {text.eyebrow}
          </p>
          <h1 className="text-3xl leading-tight font-extrabold text-ink sm:text-4xl xl:text-5xl">
            {text.title}
          </h1>
          <span
            className="mx-auto mt-5 block h-1 w-16 rounded-full bg-brand lg:mx-0"
            aria-hidden="true"
          />
          <p className="mx-auto mt-5 max-w-2xl text-base font-semibold text-gray-800 sm:text-lg lg:mx-0">
            {text.subtitle}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600 lg:mx-0">{text.description}</p>
        </div>

        <img src={examImage} alt="" className="mx-auto w-full max-w-xs sm:max-w-sm lg:max-w-md" />
      </div>
    </section>
  )
}

export default ExamHero
