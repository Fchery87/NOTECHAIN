'use client';

import { useState, useEffect } from 'react';

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-stone-50/90 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10">
              <svg
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full transition-transform duration-300 group-hover:scale-105"
              >
                <rect
                  x="2"
                  y="2"
                  width="36"
                  height="36"
                  rx="8"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-stone-800"
                />
                <path
                  d="M12 14C12 12.8954 12.8954 12 14 12H20V20H12V14Z"
                  fill="currentColor"
                  className="text-amber-500"
                />
                <path
                  d="M22 12H26C27.1046 12 28 12.8954 28 14V20H22V12Z"
                  fill="currentColor"
                  className="text-stone-600"
                />
                <path
                  d="M12 22H20V28H14C12.8954 28 12 27.1046 12 26V22Z"
                  fill="currentColor"
                  className="text-stone-600"
                />
                <path
                  d="M22 22H28V26C28 27.1046 27.1046 28 26 28H22V22Z"
                  fill="currentColor"
                  className="text-rose-500"
                />
              </svg>
            </div>
            <span className="font-serif text-xl font-medium text-stone-800">NoteChain</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors relative group"
            >
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-amber-500 transition-all duration-300 group-hover:w-full" />
            </a>
            <a
              href="#privacy"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors relative group"
            >
              Privacy
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-amber-500 transition-all duration-300 group-hover:w-full" />
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors relative group"
            >
              Pricing
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-amber-500 transition-all duration-300 group-hover:w-full" />
            </a>
            <a
              href="/graph"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors relative group"
            >
              Knowledge Graph
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-amber-500 transition-all duration-300 group-hover:w-full" />
            </a>
            <a
              href="/meetings"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors relative group"
            >
              Meetings
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-amber-500 transition-all duration-300 group-hover:w-full" />
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="/auth/login"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              Sign In
            </a>
            <a
              href="/auth/signup"
              className="px-5 py-2.5 bg-stone-900 text-stone-50 text-sm font-medium rounded-lg hover:bg-stone-800 transition-all duration-300 hover:shadow-lg hover:shadow-stone-900/20"
            >
              Get Started
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-stone-600 hover:text-stone-900"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-stone-200 animate-fade-in">
            <div className="flex flex-col gap-4">
              <a
                href="#features"
                className="text-sm font-medium text-stone-600 hover:text-stone-900 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#privacy"
                className="text-sm font-medium text-stone-600 hover:text-stone-900 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Privacy
              </a>
              <a
                href="#pricing"
                className="text-sm font-medium text-stone-600 hover:text-stone-900 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                href="/graph"
                className="text-sm font-medium text-stone-600 hover:text-stone-900 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Knowledge Graph
              </a>
              <a
                href="/meetings"
                className="text-sm font-medium text-stone-600 hover:text-stone-900 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Meetings
              </a>
              <hr className="border-stone-200" />
              <a
                href="/auth/login"
                className="text-sm font-medium text-stone-600 hover:text-stone-900 py-2"
              >
                Sign In
              </a>
              <a
                href="/auth/signup"
                className="px-5 py-2.5 bg-stone-900 text-stone-50 text-sm font-medium rounded-lg text-center"
              >
                Get Started
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
