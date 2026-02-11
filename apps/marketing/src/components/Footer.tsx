import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-rose-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="font-serif text-xl font-medium text-stone-50">NoteChain</span>
            </Link>
            <p className="text-sm text-stone-400">
              Privacy-first, encrypted note-taking with AI assistance.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-stone-50 mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/" className="hover:text-stone-50 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-stone-50 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-stone-50 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/waitlist" className="hover:text-stone-50 transition-colors">
                  Join Waitlist
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-stone-50 mb-4">Resources</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/faq" className="hover:text-stone-50 transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-stone-50 transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-stone-50 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-stone-50 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-stone-50 mb-4">Connect</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="https://twitter.com/notechain"
                  className="hover:text-stone-50 transition-colors"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/notechain"
                  className="hover:text-stone-50 transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@notechain.app"
                  className="hover:text-stone-50 transition-colors"
                >
                  Email
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-stone-500">
            © {new Date().getFullYear()} NoteChain. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
