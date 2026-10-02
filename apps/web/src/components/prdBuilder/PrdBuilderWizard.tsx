'use client';

import { useMemo, useState } from 'react';
import { downloadTextFile } from '@/lib/browser/downloadFile';
import { PRD_BUILDER_PUBLIC_CONFIG } from '@/lib/constants';
import type {
  GeneratePrdRouteResponse,
  PrdGenerationMode,
  ResearchBrief,
} from '@/lib/prdBuilder/ai/types';
import {
  buildPrdFilename,
  buildSuggestedResearchQuery,
  createPrdBuilderSession,
  extractPlainText,
  generatePrdMarkdown,
  getReadinessLabel,
  getReadinessScore,
  type GuidedAnswer,
  type PrdSourceNote,
} from '@/lib/prdBuilder/prdBuilder';

interface PrdBuilderWizardProps {
  sourceNotes: PrdSourceNote[];
  onClose: () => void;
  onSaveAsNote?: (title: string, markdown: string) => Promise<void>;
}

type WizardStep = 'brief' | 'questions' | 'enhancement' | 'research' | 'preview';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type CopyState = 'idle' | 'copied' | 'error';

const STEP_LABELS: Record<WizardStep, string> = {
  brief: 'Review Project Brief',
  questions: 'Guided Questions',
  enhancement: 'Enhancement Options',
  research: 'Research Preview',
  preview: 'Preview & Export',
};

const STEP_ORDER: WizardStep[] = ['brief', 'questions', 'enhancement', 'research', 'preview'];

const GENERATION_OPTIONS: Array<{
  id: PrdGenerationMode;
  label: string;
  badge?: string;
  description: string;
}> = [
  {
    id: 'local',
    label: 'Notes-only generation',
    badge: 'Recommended',
    description: 'Private and instant. Uses selected notes and your guided answers only.',
  },
  {
    id: 'ai-enhanced',
    label: 'AI-enhanced PRD',
    description:
      'Sends selected note text, note titles, guided answers, and the generated brief to the configured AI provider.',
  },
  {
    id: 'ai-enhanced-with-research',
    label: 'AI + light web research',
    description:
      'Also sends an editable research query to the configured research provider. Full notes are not sent for research.',
  },
];

export function PrdBuilderWizard({ sourceNotes, onClose, onSaveAsNote }: PrdBuilderWizardProps) {
  const session = useMemo(() => createPrdBuilderSession(sourceNotes), [sourceNotes]);
  const [step, setStep] = useState<WizardStep>('brief');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<GuidedAnswer[]>([]);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [generationStatus, setGenerationStatus] = useState('');
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [downloadedFilename, setDownloadedFilename] = useState('');
  const [generationMode, setGenerationMode] = useState<PrdGenerationMode>('local');
  const [externalAiConsent, setExternalAiConsent] = useState(false);
  const [webResearchConsent, setWebResearchConsent] = useState(false);
  const [researchQuery, setResearchQuery] = useState(() =>
    buildSuggestedResearchQuery(session.brief)
  );
  const [researchBrief, setResearchBrief] = useState<ResearchBrief | null>(null);
  const [finalMarkdown, setFinalMarkdown] = useState('');
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiProviderLabel, setAiProviderLabel] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);

  const readinessScore = getReadinessScore(session.readiness);
  const readinessLabel = getReadinessLabel(readinessScore);
  const strongItems = session.readiness.filter(item => item.status === 'strong');
  const needsClarification = session.readiness.filter(item => item.status !== 'strong');
  const currentQuestion = session.questions[questionIndex];
  const localMarkdown = useMemo(
    () =>
      generatePrdMarkdown({
        session,
        answers,
        includeResearchPlaceholder:
          generationMode === 'ai-enhanced-with-research' && !researchBrief,
        researchBrief: researchBrief ?? undefined,
      }),
    [session, answers, generationMode, researchBrief]
  );
  const markdown = finalMarkdown || localMarkdown;
  const filename = buildPrdFilename(session.brief.projectName);
  const visibleStepOrder = useMemo(
    () =>
      generationMode === 'ai-enhanced-with-research'
        ? STEP_ORDER
        : STEP_ORDER.filter(s => s !== 'research'),
    [generationMode]
  );
  const currentStepIndex = visibleStepOrder.indexOf(step) + 1;
  const externalAiEnabled = PRD_BUILDER_PUBLIC_CONFIG.enableExternalAi;
  const webResearchEnabled = PRD_BUILDER_PUBLIC_CONFIG.enableWebResearch;

  const goToStep = (nextStep: WizardStep) => {
    setGenerationStatus('');
    setStep(nextStep);
  };

  const simulateProgress = async (messages: string[]) => {
    for (const message of messages) {
      setGenerationStatus(message);
      await new Promise(resolve => window.setTimeout(resolve, 180));
    }
  };

  const startQuestions = () => {
    if (session.questions.length === 0) {
      goToStep('enhancement');
      return;
    }

    setQuestionIndex(0);
    setDraftAnswer(session.questions[0]?.recommendedAnswer ?? '');
    goToStep('questions');
  };

  const recordAnswer = (answer: GuidedAnswer) => {
    setFinalMarkdown('');
    setAnswers(prev => {
      const withoutCurrent = prev.filter(existing => existing.questionId !== answer.questionId);
      return [...withoutCurrent, answer];
    });

    const nextIndex = questionIndex + 1;
    if (nextIndex >= session.questions.length) {
      setQuestionIndex(nextIndex);
      goToStep('enhancement');
      return;
    }

    setQuestionIndex(nextIndex);
    setDraftAnswer(session.questions[nextIndex]?.recommendedAnswer ?? '');
  };

  const sourceNotesForAi = () =>
    session.sourceNotes.map(note => ({
      id: note.id,
      title: note.title || 'Untitled note',
      plainText: extractPlainText(note.content),
    }));

  const runResearch = async () => {
    if (!webResearchEnabled) {
      setGenerationStatus('Web research is disabled for this environment.');
      return;
    }

    if (!webResearchConsent) {
      setGenerationStatus('Confirm web research consent before sending the query.');
      return;
    }

    try {
      setIsResearching(true);
      await simulateProgress([
        'Preparing sanitized research query...',
        'Running light web research...',
      ]);
      const response = await fetch('/api/prd-builder/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: researchQuery,
          consent: { webResearch: true, acceptedAt: new Date().toISOString() },
        }),
      });
      const data = (await response.json()) as ResearchBrief | { error?: string };

      if (!response.ok) throw new Error('error' in data ? data.error : 'Research failed.');

      setResearchBrief(data as ResearchBrief);
      setGenerationStatus('Research brief ready. Review citations, then generate the PRD.');
    } catch (error) {
      setGenerationStatus(
        error instanceof Error
          ? `Research failed: ${error.message}`
          : 'Research failed. You can skip research and continue.'
      );
    } finally {
      setIsResearching(false);
    }
  };

  const generatePreview = async (mode: PrdGenerationMode = generationMode) => {
    setFinalMarkdown('');
    setAiWarnings([]);
    setAiProviderLabel('');

    if (mode === 'local') {
      await simulateProgress([
        'Analyzing selected notes...',
        'Extracting project brief...',
        'Preparing guided answers...',
        'Generating notes-only Markdown PRD...',
      ]);
      setGenerationStatus('PRD ready for review.');
      setStep('preview');
      return;
    }

    if (!externalAiEnabled) {
      setGenerationStatus('External AI is disabled. Generated a notes-only PRD instead.');
      setFinalMarkdown(localMarkdown);
      setStep('preview');
      return;
    }

    if (!externalAiConsent) {
      setGenerationStatus('Confirm external AI consent before sending selected notes.');
      return;
    }

    if (mode === 'ai-enhanced-with-research') {
      if (!webResearchConsent) {
        setGenerationStatus(
          'Confirm web research consent or switch to AI-enhanced PRD without research.'
        );
        return;
      }

      if (!researchBrief) {
        setGenerationStatus('Run research first, or skip research and use AI-enhanced PRD.');
        return;
      }
    }

    try {
      setIsGenerating(true);
      await simulateProgress([
        'Preparing selected notes for AI...',
        'Sending consented payload to the configured AI provider...',
        'Generating enhanced Markdown PRD...',
        'Checking source traceability...',
      ]);

      const response = await fetch('/api/prd-builder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          consent: {
            externalAi: true,
            webResearch: mode === 'ai-enhanced-with-research' ? true : undefined,
            acceptedAt: new Date().toISOString(),
          },
          brief: session.brief,
          sourceNotes: sourceNotesForAi(),
          answers,
          researchBrief: mode === 'ai-enhanced-with-research' ? researchBrief : undefined,
          deterministicMarkdown: localMarkdown,
        }),
      });
      const data = (await response.json()) as GeneratePrdRouteResponse | { error?: string };

      if (!response.ok) throw new Error('error' in data ? data.error : 'AI generation failed.');

      const result = data as GeneratePrdRouteResponse;
      setFinalMarkdown(result.markdown);
      setAiWarnings(result.warnings);
      setAiProviderLabel(`${result.provider} ${result.model}`.trim());
      setGenerationStatus('AI-enhanced PRD ready for review.');
      setStep('preview');
    } catch (error) {
      setFinalMarkdown(localMarkdown);
      setGenerationStatus(
        error instanceof Error
          ? `AI enhancement failed: ${error.message}. Showing notes-only fallback.`
          : 'AI enhancement failed. Showing notes-only fallback.'
      );
      setStep('preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEnhancementContinue = () => {
    if (generationMode === 'ai-enhanced-with-research') {
      goToStep('research');
      return;
    }

    void generatePreview(generationMode);
  };

  const handleDownload = () => {
    try {
      downloadTextFile({
        filename,
        content: markdown,
        mimeType: 'text/markdown;charset=utf-8',
      });
      setDownloadedFilename(filename);
    } catch {
      setDownloadedFilename('Download failed. Copy Markdown is still available.');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  const handleSaveAsNote = async () => {
    if (!onSaveAsNote) return;

    try {
      setSaveState('saving');
      await onSaveAsNote(`PRD - ${session.brief.projectName}`, markdown);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prd-builder-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <header className="border-b border-stone-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-700">Create PRD from Notes</p>
              <h2 id="prd-builder-title" className="mt-1 text-2xl font-semibold text-stone-950">
                Guided PRD Builder
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Step {Math.max(1, currentStepIndex)} of {visibleStepOrder.length} —{' '}
                {STEP_LABELS[step]}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              Close
            </button>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-200 motion-reduce:transition-none"
              style={{
                width: `${(Math.max(1, currentStepIndex) / visibleStepOrder.length) * 100}%`,
              }}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          {step === 'brief' && (
            <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-stone-200 p-4">
                  <h3 className="text-lg font-semibold text-stone-950">Detected project</h3>
                  <p className="mt-2 text-2xl font-semibold text-stone-900">
                    {session.brief.projectName}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{session.brief.summary}</p>
                </div>

                <div className="rounded-2xl border border-stone-200 p-4">
                  <h3 className="font-semibold text-stone-950">Selected notes</h3>
                  <ul className="mt-3 space-y-2 text-sm text-stone-600">
                    {session.sourceNotes.map(note => (
                      <li key={note.id} className="flex items-start gap-2">
                        <span className="mt-0.5 text-amber-600" aria-hidden="true">
                          ✓
                        </span>
                        <span>{note.title || 'Untitled note'}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-stone-200 p-4">
                  <h3 className="font-semibold text-stone-950">Known from notes</h3>
                  {session.brief.knownFeatures.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-stone-600">
                      {session.brief.knownFeatures.slice(0, 6).map(feature => (
                        <li key={feature} className="flex gap-2">
                          <span className="text-stone-400">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-stone-500">
                      The notes contain high-level context, but feature details are thin.
                    </p>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-800">PRD Readiness</p>
                  <p className="mt-2 text-3xl font-semibold text-stone-950">
                    {readinessLabel}{' '}
                    <span className="text-lg text-stone-500">({readinessScore}%)</span>
                  </p>
                  <p className="mt-2 text-sm text-stone-600">
                    Answer {session.questions.length || 0} key question
                    {session.questions.length === 1 ? '' : 's'} to improve this draft.
                  </p>
                </div>

                <ReadinessList
                  title="Strong"
                  items={strongItems}
                  empty="No strong areas detected yet."
                />
                <ReadinessList
                  title="Needs clarification"
                  items={needsClarification}
                  empty="No major gaps detected."
                />
              </aside>
            </section>
          )}

          {step === 'questions' && currentQuestion && (
            <section className="mx-auto max-w-3xl">
              <p className="text-sm font-medium text-amber-700">
                Question {questionIndex + 1} of {session.questions.length}
              </p>
              <div className="mt-3 rounded-3xl border border-stone-200 p-6">
                <p className="text-sm font-medium text-stone-500">{currentQuestion.category}</p>
                <h3 className="mt-2 text-2xl font-semibold text-stone-950">
                  {currentQuestion.question}
                </h3>

                <div className="mt-5 rounded-2xl bg-stone-50 p-4">
                  <p className="text-sm font-medium text-stone-700">Recommended answer</p>
                  <textarea
                    value={draftAnswer}
                    onChange={event => setDraftAnswer(event.target.value)}
                    className="mt-3 min-h-32 w-full resize-y rounded-xl border border-stone-200 bg-white p-3 text-sm leading-6 text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="mt-2 text-xs text-stone-500">
                    Rough edits are okay. NoteChain will polish the language in the PRD.
                  </p>
                </div>

                <div className="mt-5 rounded-2xl border border-stone-200 p-4">
                  <p className="text-sm font-medium text-stone-700">Why this matters</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    {currentQuestion.whyItMatters}
                  </p>
                </div>
              </div>
            </section>
          )}

          {step === 'enhancement' && (
            <section className="mx-auto max-w-3xl space-y-4">
              <div className="rounded-3xl border border-stone-200 p-6">
                <h3 className="text-2xl font-semibold text-stone-950">
                  How would you like to generate this PRD?
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Notes-only generation remains the default. External AI and web research only run
                  after explicit consent.
                </p>

                <div className="mt-5 space-y-3">
                  {GENERATION_OPTIONS.map(option => {
                    const disabled =
                      (option.id === 'ai-enhanced' && !externalAiEnabled) ||
                      (option.id === 'ai-enhanced-with-research' &&
                        (!externalAiEnabled || !webResearchEnabled));

                    return (
                      <label
                        key={option.id}
                        className={`block rounded-2xl border p-4 transition-colors ${
                          generationMode === option.id
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-stone-200 bg-white'
                        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-stone-50'}`}
                      >
                        <span className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="prd-generation-mode"
                            value={option.id}
                            checked={generationMode === option.id}
                            disabled={disabled}
                            onChange={() => {
                              setGenerationMode(option.id);
                              setFinalMarkdown('');
                            }}
                            className="mt-1"
                          />
                          <span>
                            <span className="font-medium text-stone-950">
                              {option.label}{' '}
                              {option.badge && (
                                <span className="rounded-full bg-stone-900 px-2 py-0.5 text-xs text-white">
                                  {option.badge}
                                </span>
                              )}
                            </span>
                            <span className="mt-1 block text-sm leading-6 text-stone-600">
                              {option.description}
                              {disabled && ' This option is disabled in the current environment.'}
                            </span>
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {generationMode !== 'local' && (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <h4 className="font-semibold text-stone-950">External AI consent</h4>
                  <p className="mt-2 text-sm leading-6 text-stone-700">
                    NoteChain will send selected note titles, selected note text, guided answers,
                    and the generated project brief. It will not send locked notes, unrelated notes,
                    your full workspace, encryption keys, account credentials, or recovery keys.
                  </p>
                  <label className="mt-4 flex gap-3 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={externalAiConsent}
                      onChange={event => setExternalAiConsent(event.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      I understand and consent to sending selected PRD context to external AI.
                    </span>
                  </label>
                </div>
              )}
            </section>
          )}

          {step === 'research' && (
            <section className="mx-auto max-w-3xl space-y-4">
              <div className="rounded-3xl border border-stone-200 p-6">
                <h3 className="text-2xl font-semibold text-stone-950">Research query preview</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Optional web research sends only this editable query to the configured research
                  provider. Your full notes are not sent for research.
                </p>
                <textarea
                  value={researchQuery}
                  onChange={event => {
                    setResearchQuery(event.target.value);
                    setResearchBrief(null);
                    setFinalMarkdown('');
                  }}
                  maxLength={240}
                  className="mt-4 min-h-28 w-full resize-y rounded-xl border border-stone-200 p-3 text-sm leading-6 text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="mt-2 text-xs text-stone-500">{researchQuery.length}/240 characters</p>
                <label className="mt-4 flex gap-3 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={webResearchConsent}
                    onChange={event => setWebResearchConsent(event.target.checked)}
                    className="mt-1"
                  />
                  <span>I consent to sending this query to the configured research provider.</span>
                </label>
              </div>

              {researchBrief && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                  <h4 className="font-semibold text-emerald-950">Research brief ready</h4>
                  <p className="mt-2 text-sm leading-6 text-emerald-900">{researchBrief.summary}</p>
                  <ul className="mt-3 space-y-2 text-sm text-emerald-900">
                    {researchBrief.citations.map(citation => (
                      <li key={citation.id}>
                        <span className="font-medium">{citation.title}</span> — {citation.url}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {step === 'preview' && (
            <section className="space-y-4">
              <div className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold text-emerald-900">PRD ready</p>
                  <p className="mt-1 text-sm text-emerald-800">
                    Preview the Markdown, then download, copy, or save it as a NoteChain note.
                    {aiProviderLabel && ` Enhanced by ${aiProviderLabel}.`}
                  </p>
                </div>
                {downloadedFilename && (
                  <p className="text-sm font-medium text-emerald-900" role="status">
                    {downloadedFilename.startsWith('Download failed')
                      ? downloadedFilename
                      : `Downloaded: ${downloadedFilename}`}
                  </p>
                )}
              </div>

              {aiWarnings.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-medium">AI safety notes</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {aiWarnings.map(warning => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <pre className="max-h-[52vh] overflow-auto rounded-2xl border border-stone-200 bg-stone-950 p-5 text-sm leading-6 text-stone-100">
                <code>{markdown}</code>
              </pre>
            </section>
          )}
        </main>

        <footer className="flex flex-col gap-3 border-t border-stone-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-stone-500" role="status" aria-live="polite">
            {generationStatus && generationStatus}
            {copyState === 'copied' && ' Markdown copied.'}
            {copyState === 'error' &&
              ' Clipboard failed. You can still select and copy the preview.'}
            {saveState === 'saving' && ' Saving PRD as a note...'}
            {saveState === 'saved' && ` Saved as note: PRD - ${session.brief.projectName}.`}
            {saveState === 'error' &&
              ' Could not save as note, but your Markdown download is still available.'}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {step !== 'brief' && (
              <button
                type="button"
                onClick={() => {
                  const index = visibleStepOrder.indexOf(step);
                  goToStep(visibleStepOrder[Math.max(0, index - 1)]);
                }}
                disabled={isGenerating || isResearching}
                className="min-h-10 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                Back
              </button>
            )}

            {step === 'brief' && (
              <>
                <button
                  type="button"
                  onClick={() => generatePreview('local')}
                  className="min-h-10 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  Generate draft with gaps
                </button>
                <button
                  type="button"
                  onClick={startQuestions}
                  className="min-h-10 rounded-xl bg-stone-950 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  Answer key questions
                </button>
              </>
            )}

            {step === 'questions' && currentQuestion && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    recordAnswer({
                      questionId: currentQuestion.id,
                      answer: '',
                      status: 'skipped',
                    })
                  }
                  className="min-h-10 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() =>
                    recordAnswer({
                      questionId: currentQuestion.id,
                      answer: '',
                      status: 'open',
                    })
                  }
                  className="min-h-10 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  Mark as open question
                </button>
                <button
                  type="button"
                  onClick={() =>
                    recordAnswer({
                      questionId: currentQuestion.id,
                      answer: draftAnswer,
                      status: 'answered',
                    })
                  }
                  className="min-h-10 rounded-xl bg-stone-950 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  Use recommended answer
                </button>
              </>
            )}

            {step === 'enhancement' && (
              <button
                type="button"
                onClick={handleEnhancementContinue}
                disabled={isGenerating}
                className="min-h-10 rounded-xl bg-stone-950 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {generationMode === 'local' ? 'Generate notes-only PRD' : 'Continue'}
              </button>
            )}

            {step === 'research' && (
              <>
                <button
                  type="button"
                  onClick={() => generatePreview('ai-enhanced')}
                  disabled={isGenerating || isResearching}
                  className="min-h-10 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  Skip research
                </button>
                <button
                  type="button"
                  onClick={runResearch}
                  disabled={isResearching || isGenerating}
                  className="min-h-10 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  Run research
                </button>
                <button
                  type="button"
                  onClick={() => generatePreview('ai-enhanced-with-research')}
                  disabled={isGenerating || isResearching || !researchBrief}
                  className="min-h-10 rounded-xl bg-stone-950 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  Generate with research
                </button>
              </>
            )}

            {step === 'preview' && (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="min-h-10 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  Copy Markdown
                </button>
                {onSaveAsNote && (
                  <button
                    type="button"
                    onClick={handleSaveAsNote}
                    disabled={saveState === 'saving'}
                    className="min-h-10 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    Save as Note
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="min-h-10 rounded-xl bg-stone-950 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  Download .md
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function ReadinessList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ id: string; label: string; detail: string; status: string }>;
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 p-4">
      <h3 className="font-semibold text-stone-950">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3 text-sm text-stone-600">
          {items.map(item => (
            <li key={item.id} className="flex gap-2">
              <span
                aria-hidden="true"
                className={item.status === 'strong' ? 'text-emerald-600' : 'text-amber-600'}
              >
                {item.status === 'strong' ? '✓' : '○'}
              </span>
              <span>
                <span className="font-medium text-stone-800">{item.label}</span>: {item.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
