'use client';

import { useEffect, useRef } from 'react';

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const x = (clientX / innerWidth - 0.5) * 20;
      const y = (clientY / innerHeight - 0.5) * 20;

      const elements = heroRef.current.querySelectorAll('.parallax');
      elements.forEach((el, i) => {
        const factor = (i + 1) * 0.5;
        (el as HTMLElement).style.transform = `translate(${x * factor}px, ${y * factor}px)`;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center overflow-hidden bg-stone-50 noise-overlay"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="parallax absolute top-20 left-10 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl transition-transform duration-300 ease-out" />
        <div className="parallax absolute bottom-20 right-10 w-80 h-80 bg-rose-200/30 rounded-full blur-3xl transition-transform duration-300 ease-out" />
        <div className="parallax absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-stone-200/50 rounded-full blur-3xl transition-transform duration-300 ease-out" />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(stone-400 1px, transparent 1px), linear-gradient(90deg, stone-400 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Text */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100/50 rounded-full border border-amber-200/50 animate-fade-in">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-amber-800">Now in Beta</span>
            </div>

            {/* Headline */}
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium text-stone-900 leading-[1.1] tracking-tight">
              Your thoughts.
              <br />
              <span className="text-gradient-warm">Encrypted.</span>
              <br />
              Yours alone.
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-stone-600 max-w-lg leading-relaxed">
              NoteChain is a privacy-first productivity suite. Notes, tasks, documents, and calendar
              — unified and protected with end-to-end encryption. We can't read your data. Ever.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <a
                href="/dashboard"
                className="group px-8 py-4 bg-stone-900 text-stone-50 font-medium rounded-xl hover:bg-stone-800 transition-all duration-300 hover:shadow-xl hover:shadow-stone-900/20 flex items-center gap-2"
              >
                Launch App
                <svg
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </a>
              <a
                href="#features"
                className="px-8 py-4 bg-stone-100 text-stone-800 font-medium rounded-xl hover:bg-stone-200 transition-all duration-300"
              >
                See How It Works
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 border-2 border-stone-50 flex items-center justify-center text-xs font-medium text-white"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="text-sm text-stone-600">
                <span className="font-semibold text-stone-900">2,000+</span> early access users
              </div>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative hidden lg:block">
            {/* Main Card Stack */}
            <div className="relative w-full max-w-md mx-auto">
              {/* Card 3 - Back */}
              <div className="absolute top-8 left-8 right-0 bg-stone-200 rounded-2xl p-6 shadow-lg transform rotate-3 opacity-50">
                <div className="h-4 w-24 bg-stone-300 rounded mb-4" />
                <div className="h-3 w-full bg-stone-300 rounded mb-2" />
                <div className="h-3 w-4/5 bg-stone-300 rounded" />
              </div>

              {/* Card 2 - Middle */}
              <div className="absolute top-4 left-4 right-4 bg-stone-100 rounded-2xl p-6 shadow-xl transform -rotate-2 border border-stone-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-amber-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="h-4 w-32 bg-stone-200 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-stone-200 rounded" />
                  <div className="h-3 w-5/6 bg-stone-200 rounded" />
                </div>
              </div>

              {/* Card 1 - Front (Main) */}
              <div className="relative bg-white rounded-2xl p-8 shadow-2xl border border-stone-100 animate-float">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white font-semibold">
                      N
                    </div>
                    <div>
                      <div className="font-semibold text-stone-900">Project Alpha</div>
                      <div className="text-sm text-stone-500">3 tasks remaining</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs font-medium text-green-700">Synced</span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-3">
                  {[
                    { text: 'Review quarterly report', done: true },
                    { text: 'Meeting with design team', done: true },
                    {
                      text: 'Update encryption keys',
                      done: false,
                      active: true,
                    },
                  ].map((task, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        task.active ? 'bg-amber-50 border border-amber-200' : 'bg-stone-50'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          task.done
                            ? 'bg-amber-500 border-amber-500'
                            : task.active
                              ? 'border-amber-400'
                              : 'border-stone-300'
                        }`}
                      >
                        {task.done && (
                          <svg
                            className="w-3 h-3 text-white"
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
                        )}
                      </div>
                      <span
                        className={`text-sm ${task.done ? 'text-stone-400 line-through' : 'text-stone-700'}`}
                      >
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Encryption Indicator */}
                <div className="mt-6 pt-6 border-t border-stone-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      End-to-end encrypted
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-amber-600">AES-256-GCM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center shadow-lg animate-pulse-soft">
                <svg
                  className="w-8 h-8 text-rose-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>

              <div className="absolute -bottom-4 -left-4 w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-7 h-7 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-stone-400">
        <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
        <div className="w-6 h-10 border-2 border-stone-300 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-stone-400 rounded-full mt-2 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
