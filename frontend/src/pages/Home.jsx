import Header from '../components/Header'
import Hero from '../components/Hero'
import FeatureStrip from '../components/FeatureStrip'
import DigitalResources from '../components/DigitalResources'
import FAQ from '../components/FAQ'
import LocationSection from '../components/LocationSection'
import Testimonials from '../components/Testimonials'
import Footer from '../components/Footer'

function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <FeatureStrip />
        <DigitalResources />
        <FAQ />
        <LocationSection />
        <Testimonials />
      </main>
      <Footer />
    </>
  )
}

export default Home
