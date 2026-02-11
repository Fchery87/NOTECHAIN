'use client';

import React, { useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-lg border border-stone-100">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-serif text-2xl font-medium text-stone-900 mb-4">
          You&apos;re on the list!
        </h3>
        <p className="text-stone-600 mb-6">
          We&apos;ll send you an invite as soon as spots open up. Thanks for your interest in
          NoteChain!
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-stone-100 text-stone-800 font-medium rounded-xl hover:bg-stone-200 transition-all duration-300"
        >
          Back to Home
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="flex-1 px-5 py-4 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-4 bg-stone-900 text-stone-50 font-medium rounded-xl hover:bg-stone-800 transition-all duration-300 hover:shadow-lg hover:shadow-stone-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Joining...' : 'Join Waitlist'}
        </button>
      </div>
      <p className="mt-4 text-sm text-stone-500 text-center">
        We respect your privacy. No spam, ever.
      </p>
    </form>
  );
}
