'use client';

import { useState } from 'react';

const plans = [
  {
    name: 'Free',
    description: 'Perfect for getting started',
    price: { monthly: 0, yearly: 0 },
    features: [
      'Unencrypted notes & tasks',
      'Up to 3 projects',
      'Basic calendar sync',
      'PDF viewing',
      'Community support',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    description: 'For privacy-conscious professionals',
    price: { monthly: 12, yearly: 96 },
    features: [
      'Everything in Free, plus:',
      'End-to-end encryption',
      'Unlimited projects',
      'PDF annotation & signing',
      'AI-powered insights',
      'Full-text search',
      'Priority support',
      'Offline sync across devices',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Team',
    description: 'For teams who value privacy',
    price: { monthly: 29, yearly: 290 },
    features: [
      'Everything in Pro, plus:',
      'Up to 10 team members',
      'Shared encrypted workspaces',
      'Team analytics dashboard',
      'SSO integration',
      'Dedicated support',
      'Custom data retention',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <section id="pricing" className="relative py-32 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 bg-amber-100/50 rounded-full text-sm font-medium text-amber-800 mb-6">
            Pricing
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-medium text-stone-900 mb-6 leading-tight">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-stone-600">
            Start free, upgrade when you're ready. No credit card required.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span
            className={`text-sm font-medium ${
              billingCycle === 'monthly' ? 'text-stone-900' : 'text-stone-500'
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-14 h-7 bg-stone-200 rounded-full transition-colors"
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-stone-900 rounded-full transition-all duration-300 ${
                billingCycle === 'yearly' ? 'left-8' : 'left-1'
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${
              billingCycle === 'yearly' ? 'text-stone-900' : 'text-stone-500'
            }`}
          >
            Yearly
          </span>
          <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">
            Save 33%
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl p-8 border transition-all duration-300 hover:shadow-xl ${
                plan.popular
                  ? 'border-amber-400 shadow-lg scale-105 z-10'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-full shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="font-serif text-2xl font-medium text-stone-900 mb-2">{plan.name}</h3>
                <p className="text-stone-500 text-sm">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-serif font-medium text-stone-900">
                    $
                    {billingCycle === 'monthly'
                      ? plan.price.monthly
                      : Math.round(plan.price.yearly / 12)}
                  </span>
                  <span className="text-stone-500">/month</span>
                </div>
                {billingCycle === 'yearly' && plan.price.yearly > 0 && (
                  <p className="text-sm text-stone-500 mt-1">
                    ${plan.price.yearly} billed annually
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        plan.popular ? 'bg-amber-100' : 'bg-stone-100'
                      }`}
                    >
                      <svg
                        className={`w-3 h-3 ${plan.popular ? 'text-amber-600' : 'text-stone-600'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-sm text-stone-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                className={`w-full py-3 rounded-xl font-medium transition-all duration-300 ${
                  plan.popular
                    ? 'bg-stone-900 text-stone-50 hover:bg-stone-800 hover:shadow-lg'
                    : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <p className="text-center text-stone-500 text-sm mt-12">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}
