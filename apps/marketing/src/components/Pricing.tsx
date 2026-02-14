import PricingCard from './PricingCard';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for personal use',
    features: [
      'Unlimited notes',
      'End-to-end encryption',
      'Web access',
      'Basic AI assistance',
      '1GB storage',
      'Community support',
      'Knowledge Graph (limited)',
      'Calendar sync',
      'Basic search',
    ],
    cta: 'Get Started Free',
    href: '/waitlist',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$8',
    period: 'per month',
    description: 'For power users who want more',
    features: [
      'Everything in Free',
      'Advanced AI features',
      'Priority sync',
      'Unlimited storage',
      'API access',
      'Priority support',
      'Meeting transcription',
      'OCR & document processing',
      'PDF annotation & signing',
      'Voice input',
      'Version history',
      'Advanced search & tags',
      'Full Knowledge Graph',
      'Team collaboration',
    ],
    cta: 'Join Pro Waitlist',
    href: '/waitlist?plan=pro',
    popular: true,
  },
  {
    name: 'Team',
    price: '$19',
    period: 'per user/month',
    description: 'For teams who value privacy',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Shared encrypted workspaces',
      'Admin controls',
      'Team analytics',
      'SSO integration',
      'Custom data retention',
      'Dedicated support',
      'Audit logs',
      'Advanced permissions',
    ],
    cta: 'Contact Sales',
    href: '/waitlist?plan=team',
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-32 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-amber-600 font-medium text-sm uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-medium text-stone-900 mt-4 mb-6">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-stone-600 max-w-2xl mx-auto">
            Start free, upgrade when you need more. No surprises, no hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map(plan => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-stone-500 text-sm">
            All plans include 30-day money-back guarantee. Questions?{' '}
            <a href="/faq" className="text-amber-600 hover:text-amber-700 underline">
              Check our FAQ
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
