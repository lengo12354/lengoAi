import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Tools from '@/components/Tools'
import HowItWorks from '@/components/HowItWorks'
import Pricing from '@/components/Pricing'
import FAQ from '@/components/FAQ'
import CTABanner from '@/components/CTABanner'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Tools />
        <HowItWorks />
        <Pricing />

        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </>
  )
}
