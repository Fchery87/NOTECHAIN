'use client';

import { useState, useEffect } from 'react';

interface TourStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    title: 'Your Notes',
    content:
      'All your encrypted notes are organized here. Click the + button to create a new note.',
    position: 'right',
  },
  {
    target: '[data-tour="editor"]',
    title: 'The Editor',
    content:
      'A beautiful, distraction-free space for your thoughts. Use Markdown or the toolbar for formatting.',
    position: 'left',
  },
  {
    target: '[data-tour="ai-button"]',
    title: 'AI Assistant',
    content: 'Click here for AI-powered suggestions, summaries, and writing help.',
    position: 'bottom',
  },
  {
    target: '[data-tour="sync-status"]',
    title: 'Encrypted Sync',
    content: 'Your notes are automatically encrypted and synced across all your devices.',
    position: 'bottom',
  },
];

export default function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(true);

  useEffect(() => {
    const seen = localStorage.getItem('notechain-tour-seen');
    if (!seen) {
      setHasSeenTour(false);
      setIsActive(true);
    }
  }, []);

  const completeTour = () => {
    localStorage.setItem('notechain-tour-seen', 'true');
    setIsActive(false);
    setHasSeenTour(true);
  };

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const skipTour = () => {
    completeTour();
  };

  const restartTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  if (!isActive) {
    return hasSeenTour ? (
      <button
        onClick={restartTour}
        className="fixed bottom-6 right-6 z-40 px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-lg shadow-lg hover:bg-stone-800 transition-colors"
      >
        Restart Tour
      </button>
    ) : null;
  }

  const step = tourSteps[currentStep];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm" onClick={skipTour} />

      <div className="fixed inset-0 z-50 pointer-events-none">
        <div
          className="absolute bg-white rounded-xl shadow-2xl p-6 max-w-sm pointer-events-auto animate-fade-in"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">
              Step {currentStep + 1} of {tourSteps.length}
            </span>
            <button
              onClick={skipTour}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              Skip
            </button>
          </div>

          <h3 className="font-serif text-xl font-medium text-stone-900 mb-2">{step.title}</h3>
          <p className="text-stone-600 mb-6 leading-relaxed">{step.content}</p>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep ? 'bg-amber-500' : 'bg-stone-200'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-4 py-2 text-stone-600 font-medium rounded-lg hover:bg-stone-100 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 transition-colors"
              >
                {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
