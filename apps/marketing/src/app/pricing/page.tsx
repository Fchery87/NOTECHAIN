import Pricing from '../../components/Pricing';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';

export const metadata = {
  title: 'Pricing - NoteChain',
  description: 'Simple, transparent pricing for NoteChain. Start free, upgrade when you need more.',
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <Navigation />
      <div className="pt-24">
        <Pricing />
      </div>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-medium text-stone-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="p-6 bg-stone-50 rounded-xl">
              <h3 className="font-medium text-stone-900 mb-2">Can I switch plans later?</h3>
              <p className="text-stone-600">
                Yes, you can upgrade or downgrade at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="p-6 bg-stone-50 rounded-xl">
              <h3 className="font-medium text-stone-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-stone-600">
                We accept all major credit cards, PayPal, and Apple Pay.
              </p>
            </div>
            <div className="p-6 bg-stone-50 rounded-xl">
              <h3 className="font-medium text-stone-900 mb-2">Is there a free trial?</h3>
              <p className="text-stone-600">
                Yes, Pro plans come with a 14-day free trial. No credit card required.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
