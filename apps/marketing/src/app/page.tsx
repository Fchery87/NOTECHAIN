import Hero from '../components/Hero';
import Features from '../components/Features';
import Pricing from '../components/Pricing';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <main>
      <Navigation />
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </main>
  );
}
