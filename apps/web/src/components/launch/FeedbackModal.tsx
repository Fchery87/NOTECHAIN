'use client';

import { useState } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState('general');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Send to feedback API
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSubmitted(true);
    setLoading(false);
  };

  const handleClose = () => {
    setFeedback('');
    setCategory('general');
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-fade-in">
        {!submitted ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl font-medium text-stone-900">Send Feedback</h2>
              <button
                onClick={handleClose}
                className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-2">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="general">General Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="ux">User Experience</option>
                  <option value="performance">Performance</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Your Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Tell us what you think..."
                  required
                  rows={5}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 text-stone-600 font-medium rounded-lg hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !feedback.trim()}
                  className="flex-1 px-4 py-2.5 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="font-serif text-xl font-medium text-stone-900 mb-2">Thank You!</h3>
            <p className="text-stone-600 mb-6">Your feedback helps us make NoteChain better.</p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
