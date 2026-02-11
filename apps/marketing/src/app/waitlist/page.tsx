import WaitlistForm from '../../components/WaitlistForm';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';

export const metadata = {
  title: 'Join Waitlist - NoteChain',
  description:
    'Join the NoteChain beta waitlist. Be among the first to experience encrypted note-taking with AI assistance.',
};

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <Navigation />

      <section className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-amber-600 font-medium text-sm uppercase tracking-wider">
              Beta Access
            </span>
            <h1 className="font-serif text-4xl md:text-5xl font-medium text-stone-900 mt-4 mb-6">
              Join the waitlist
            </h1>
            <p className="text-xl text-stone-600 max-w-2xl mx-auto">
              Be among the first to experience NoteChain. We&apos;re rolling out invites gradually
              to ensure the best experience.
            </p>
          </div>

          <WaitlistForm />

          <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-amber-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="font-medium text-stone-900 mb-2">Get Notified</h3>
              <p className="text-stone-600 text-sm">We&apos;ll email you when your spot is ready</p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-amber-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="font-medium text-stone-900 mb-2">Priority Access</h3>
              <p className="text-stone-600 text-sm">Early adopters get lifetime benefits</p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-amber-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                  />
                </svg>
              </div>
              <h3 className="font-medium text-stone-900 mb-2">Shape the Future</h3>
              <p className="text-stone-600 text-sm">Your feedback helps us improve</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
