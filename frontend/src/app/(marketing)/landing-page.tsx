import { Navbar } from "./(components)/navbar";
import { Hero } from "./(components)/hero";
import { Features } from "./(components)/features";
import { HowItWorks } from "./(components)/how-it-works";
import { Stats } from "./(components)/stats";
import { CTA } from "./(components)/cta";
import { Footer } from "./(components)/footer";

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main">
        <Hero />
        <Features />
        <HowItWorks />
        <Stats />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
