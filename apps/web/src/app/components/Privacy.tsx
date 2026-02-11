'use client';

export default function Privacy() {
  return (
    <section id="privacy" className="relative py-32 bg-stone-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div>
            <span className="inline-block px-4 py-2 bg-stone-800 rounded-full text-sm font-medium text-stone-400 mb-6">
              Zero-Knowledge Architecture
            </span>

            <h2 className="font-serif text-4xl md:text-5xl font-medium text-stone-50 mb-6 leading-tight">
              We can't read your data.
              <br />
              <span className="text-amber-400">Even if we wanted to.</span>
            </h2>

            <p className="text-lg text-stone-400 mb-8 leading-relaxed">
              NoteChain uses end-to-end encryption. Your data is encrypted on your device before it
              ever reaches our servers. Your encryption keys never leave your hardware-secure
              enclave.
            </p>

            {/* Security Features */}
            <div className="space-y-4">
              {[
                {
                  title: 'AES-256-GCM Encryption',
                  description: 'Military-grade encryption for all your data',
                },
                {
                  title: 'Hardware-Backed Keys',
                  description: 'Keys stored in iOS Keychain / Android Keystore',
                },
                {
                  title: 'Open Source Crypto',
                  description: 'Client-side encryption verified by the community',
                },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3.5 h-3.5 text-amber-400"
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
                  <div>
                    <h4 className="font-medium text-stone-200">{item.title}</h4>
                    <p className="text-sm text-stone-500">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            {/* Encryption Flow Diagram */}
            <div className="relative bg-stone-800 rounded-3xl p-8 border border-stone-700">
              {/* Flow Steps */}
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-700 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-stone-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-stone-300">Your Device</div>
                    <div className="text-xs text-stone-500">Data created here</div>
                  </div>
                  <div className="text-amber-400 font-mono text-xs">Plaintext</div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <svg
                    className="w-6 h-6 text-stone-600 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-amber-400"
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
                  <div className="flex-1">
                    <div className="text-sm font-medium text-stone-300">Encrypted</div>
                    <div className="text-xs text-stone-500">AES-256-GCM on device</div>
                  </div>
                  <div className="text-amber-400 font-mono text-xs">Ciphertext</div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <svg
                    className="w-6 h-6 text-stone-600 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-700 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-stone-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-stone-300">NoteChain Servers</div>
                    <div className="text-xs text-stone-500">Encrypted blobs only</div>
                  </div>
                  <div className="text-stone-500 font-mono text-xs line-through">Plaintext</div>
                </div>
              </div>

              {/* Key Badge */}
              <div className="mt-8 pt-6 border-t border-stone-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-rose-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm text-stone-400">Keys stay on your device</span>
                  </div>
                  <div className="text-xs text-stone-500 font-mono">256-bit</div>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -top-4 -right-4 bg-rose-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              Zero Knowledge
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-24 pt-12 border-t border-stone-800">
          <p className="text-center text-stone-500 text-sm mb-8">
            Trusted by privacy-conscious professionals worldwide
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
            {['Therapists', 'Lawyers', 'Journalists', 'Researchers', 'Developers'].map(
              profession => (
                <span key={profession} className="text-stone-400 font-medium">
                  {profession}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
