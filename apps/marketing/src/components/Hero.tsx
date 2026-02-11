export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-stone-50 via-stone-100 to-amber-50/30" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-stone-200 mb-8 animate-fade-in">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-soft" />
          <span className="text-sm text-stone-600">Now in Public Beta</span>
        </div>

        <h1
          className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium text-stone-900 mb-6 leading-tight animate-fade-in"
          style={{ animationDelay: '0.1s' }}
        >
          Your thoughts.
          <br />
          <span className="text-gradient-warm">Encrypted.</span>
          <br />
          Yours alone.
        </h1>

        <p
          className="text-xl md:text-2xl text-stone-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          NoteChain combines end-to-end encryption with AI-powered assistance. The privacy you need,
          the intelligence you want.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in"
          style={{ animationDelay: '0.3s' }}
        >
          <a
            href="/waitlist"
            className="px-8 py-4 bg-stone-900 text-stone-50 font-medium rounded-xl hover:bg-stone-800 transition-all duration-300 hover:shadow-lg hover:shadow-stone-900/20"
          >
            Join Beta Waitlist
          </a>
          <a
            href="#features"
            className="px-8 py-4 bg-stone-100 text-stone-800 font-medium rounded-xl hover:bg-stone-200 transition-all duration-300"
          >
            Explore Features
          </a>
        </div>

        <div
          className="mt-16 flex items-center justify-center gap-8 text-sm text-stone-500 animate-fade-in"
          style={{ animationDelay: '0.4s' }}
        >
          <div className="flex items-center gap-2">
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>AES-256-GCM Encryption</span>
          </div>
          <div className="flex items-center gap-2">
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>Zero-Knowledge</span>
          </div>
          <div className="flex items-center gap-2">
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>AI-Powered</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-stone-50 to-transparent" />
    </section>
  );
}
