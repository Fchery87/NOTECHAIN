import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Calendar - NoteChain',
  description: 'Your encrypted calendar with external sync.',
};

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <a href="/dashboard" className="font-serif text-2xl font-medium text-stone-900">
                NoteChain
              </a>
              <span className="text-stone-300">/</span>
              <span className="text-lg text-stone-700">Calendar</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-amber-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-stone-900 mb-2">Calendar</h2>
            <p className="text-stone-600 max-w-md mx-auto">
              Calendar view is being set up. Connect your Google, Outlook, or Apple calendar to get
              started.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
