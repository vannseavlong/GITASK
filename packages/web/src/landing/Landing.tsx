import Navbar from "./components/Navbar"
import Hero from "./components/Hero"
import WhyGitask from "./components/WhyGitask"
import HowItWorks from "./components/HowItWorks"
import Views from "./components/Views"
import CommandLine from "./components/CommandLine"
import Download from "./components/Download"
import FinalCta from "./components/FinalCta"
import Footer from "./components/Footer"
import "./theme.css"
import "./landing.css"

export default function Landing() {
  return (
    <div className="landing">
      <Navbar />
      <main>
        <Hero />
        <WhyGitask />
        <HowItWorks />
        <Views />
        <CommandLine />
        <Download />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
