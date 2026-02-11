'use client';

import { useEffect, useRef, useState } from 'react';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    title: 'Encrypted Notes',
    description:
      'Rich-text editor with Markdown support. Your thoughts encrypted with AES-256-GCM before they leave your device.',
    color: 'amber',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
    title: 'Smart Tasks',
    description:
      'AI-powered task prioritization with automated calendar syncing. Never miss what matters most.',
    color: 'rose',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    title: 'PDF Studio',
    description:
      'View, annotate, and sign documents securely. Perfect for contracts and sensitive documents.',
    color: 'stone',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    title: 'Unified Calendar',
    description:
      'Sync with Google, Outlook, and Apple Calendar. All your events in one secure place.',
    color: 'amber',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    title: 'Private Analytics',
    description:
      'Weekly productivity insights generated on-device. Your usage patterns never leave your machine.',
    color: 'rose',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
        />
      </svg>
    ),
    title: 'Offline First',
    description:
      "Full functionality without internet. Work on planes, in transit, anywhere. Sync when you're back online.",
    color: 'stone',
  },
];

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-600',
    border: 'border-amber-200',
  },
  rose: { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
  stone: {
    bg: 'bg-stone-100',
    text: 'text-stone-600',
    border: 'border-stone-200',
  },
};

export default function Features() {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setVisibleItems(prev => (prev.includes(index) ? prev : [...prev, index]));
          }
        });
      },
      { threshold: 0.2, rootMargin: '-50px' }
    );

    const items = sectionRef.current?.querySelectorAll('[data-index]');
    items?.forEach(item => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" ref={sectionRef} className="relative py-32 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-20">
          <span className="inline-block px-4 py-2 bg-stone-200/50 rounded-full text-sm font-medium text-stone-600 mb-6">
            Features
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium text-stone-900 mb-6 leading-tight">
            Everything you need.
            <br />
            <span className="text-stone-400">Nothing you don't.</span>
          </h2>
          <p className="text-lg text-stone-600 leading-relaxed">
            Five essential tools, unified into one seamless experience. No more context switching
            between apps. No more worrying about data privacy.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const colors = colorClasses[feature.color];
            const isVisible = visibleItems.includes(index);

            return (
              <div
                key={index}
                data-index={index}
                className={`group relative bg-white rounded-2xl p-8 border border-stone-100 shadow-sm hover:shadow-xl transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center ${colors.text} mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  {feature.icon}
                </div>

                {/* Content */}
                <h3 className="font-serif text-xl font-medium text-stone-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-stone-600 leading-relaxed">{feature.description}</p>

                {/* Hover Effect */}
                <div
                  className={`absolute inset-0 rounded-2xl border-2 ${colors.border} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <p className="text-stone-500 mb-6">And much more coming soon...</p>
          <a
            href="#"
            className="inline-flex items-center gap-2 text-stone-900 font-medium hover:text-amber-600 transition-colors"
          >
            View full feature list
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
