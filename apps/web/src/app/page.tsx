import Navigation from './components/Navigation';
import Hero from './components/Hero';
import Features from './components/Features';
import Privacy from './components/Privacy';
import Pricing from './components/Pricing';
import Footer from './components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <Hero />
      <Features />
      <Privacy />
      <Pricing />
      <Footer />
    </main>
  );
}
