/**
 * Note Intelligence System - Usage Examples
 *
 * This file demonstrates how to use the Note Intelligence & Auto-Linking System
 * in your React components.
 *
 * @example Complete Integration Example
 */

import React, { useState, useEffect } from 'react';
import type { Note } from '@notechain/data-models';

// Hooks
import { useNoteAnalysis, useLinkSuggestions, useRelatedNotes } from '../../../hooks';

// Components
import {
  LinkSuggestions,
  AutoTags,
  RelatedNotes,
  NoteSummary as NoteSummaryComponent,
} from '../../../components';

// AI Services
import { getNoteIntelligence } from './NoteIntelligence';

// Types
import type { LinkSuggestion, AutoTag, NoteAnalysis, KnowledgeGraph, NoteSummary } from './types';

// ============================================================================
// Example 1: Complete Note Editor with AI Intelligence Sidebar
// ============================================================================

export const NoteEditorWithIntelligence: React.FC<{
  note: Note;
  allNotes: Note[];
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void;
}> = ({ note, allNotes, onUpdateNote }) => {
  // AI Intelligence hooks
  const { analysis, isAnalyzing } = useNoteAnalysis(note);
  const {
    suggestions,
    isLoading: isLoadingLinks,
    acceptSuggestion,
    dismissSuggestion,
  } = useLinkSuggestions(note, { allNotes });
  const { relatedNotes } = useRelatedNotes(note, {
    allNotes,
    relatedOptions: { maxResults: 5 },
  });

  // State
  const [summary, setSummary] = useState<NoteSummary | null>(null);
  const [autoTags, setAutoTags] = useState<AutoTag[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Load AI features on mount
  useEffect(() => {
    const loadAIFeatures = async () => {
      const intelligence = getNoteIntelligence();

      // Generate summary
      setIsLoadingSummary(true);
      const noteSummary = await intelligence.summarizeNote(note);
      setSummary(noteSummary);
      setIsLoadingSummary(false);

      // Generate tags
      const tags = await intelligence.generateTags(note, { maxTags: 6 });
      setAutoTags(tags);
    };

    loadAIFeatures();
  }, [note.id]);

  // Handle accepting a link suggestion
  const handleAcceptLink = async (suggestion: LinkSuggestion) => {
    // Add backlink to note
    onUpdateNote(note.id, {
      backlinks: [
        ...note.backlinks,
        {
          sourceNoteId: note.id,
          targetNoteId: suggestion.targetNoteId,
          context: suggestion.context,
          createdAt: new Date(),
        },
      ],
    });
    acceptSuggestion(suggestion);
  };

  // Handle adding an auto-tag
  const handleAddTag = (tagName: string) => {
    if (!note.tags.includes(tagName)) {
      onUpdateNote(note.id, {
        tags: [...note.tags, tagName],
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Editor */}
      <div className="lg:col-span-2">
        <NoteEditor note={note} onUpdate={onUpdateNote} />
      </div>

      {/* AI Intelligence Sidebar */}
      <div className="space-y-4">
        {/* Reading Time & Stats */}
        {!isAnalyzing && analysis && (
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="flex items-center gap-4 text-sm text-stone-600">
              <span>⏱️ {analysis.readingTimeMinutes} min read</span>
              <span>📝 {analysis.contentStructure.wordCount} words</span>
            </div>
          </div>
        )}

        {/* Note Summary */}
        <NoteSummaryComponent summary={summary} isLoading={isLoadingSummary} maxLength="medium" />

        {/* Auto Tags */}
        <AutoTags
          suggestions={autoTags}
          existingTags={note.tags}
          onAddTag={handleAddTag}
          maxVisible={6}
        />

        {/* Link Suggestions */}
        {!isLoadingLinks && suggestions.length > 0 && (
          <LinkSuggestions
            suggestions={suggestions}
            onAccept={handleAcceptLink}
            onDismiss={dismissSuggestion}
            maxVisible={3}
          />
        )}

        {/* Related Notes */}
        <RelatedNotes
          notes={relatedNotes}
          onNoteClick={(noteId: string) => {
            // Navigate to related note
            console.log('Navigate to:', noteId);
          }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Example 2: Batch Processing Multiple Notes
// ============================================================================

export const BatchIntelligenceProcessor: React.FC<{
  notes: Note[];
}> = ({ notes }) => {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<Map<string, NoteAnalysis>>(new Map());

  const processNotes = async () => {
    setIsProcessing(true);
    setProgress(0);

    const intelligence = getNoteIntelligence();

    // Initialize AI services
    await intelligence.initialize((p: number, message: string) => {
      console.log(`[${p}%] ${message}`);
    });

    // Batch analyze all notes
    const batchResult = await intelligence.batchAnalyze(
      notes,
      {
        extractKeywords: true,
        extractEntities: true,
        analyzeSentiment: true,
      },
      (p: number) => setProgress(p)
    );

    setResults(batchResult.results);
    setIsProcessing(false);

    // Batch generate tags
    const allTags = await intelligence.batchGenerateTags(notes);
    console.log('Generated tags for all notes:', allTags);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Batch AI Processing</h2>

      <button
        onClick={processNotes}
        disabled={isProcessing}
        className="px-4 py-2 bg-stone-900 text-white rounded-lg disabled:opacity-50"
      >
        {isProcessing ? `Processing... ${progress}%` : 'Analyze All Notes'}
      </button>

      {results.size > 0 && (
        <div className="mt-4">
          <p className="text-green-600">✓ Processed {results.size} notes successfully</p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Example 3: Semantic Search
// ============================================================================

export const SemanticSearchExample: React.FC<{
  notes: Note[];
}> = ({ notes }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ note: Note; score: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const performSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    const intelligence = getNoteIntelligence();

    // Initialize if not already
    if (!intelligence.isInitialized()) {
      await intelligence.initialize();
    }

    const searchResults = await intelligence.semanticSearch(query, notes, 10, 0.3);
    setResults(searchResults);
    setIsSearching(false);
  };

  return (
    <div className="p-6">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search notes semantically..."
          className="flex-1 px-4 py-2 border border-stone-300 rounded-lg"
          onKeyDown={e => e.key === 'Enter' && performSearch()}
        />
        <button
          onClick={performSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(({ note, score }) => (
            <div key={note.id} className="p-3 bg-white border border-stone-200 rounded-lg">
              <div className="flex justify-between items-start">
                <h3 className="font-medium">{note.title}</h3>
                <span className="text-sm text-amber-600">{Math.round(score * 100)}% match</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Example 4: Knowledge Graph Generation
// ============================================================================

export const KnowledgeGraphExample: React.FC<{
  notes: Note[];
}> = ({ notes }) => {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateGraph = async () => {
    setIsGenerating(true);
    const intelligence = getNoteIntelligence();

    const knowledgeGraph = await intelligence.generateKnowledgeGraph(notes, {
      includeTags: true,
      includeSimilarity: true,
      minSimilarity: 0.3,
    });

    setGraph(knowledgeGraph);
    setIsGenerating(false);

    console.log('Graph Stats:', {
      nodes: knowledgeGraph.nodes.length,
      edges: knowledgeGraph.edges.length,
      clusters: knowledgeGraph.clusters.length,
    });
  };

  return (
    <div className="p-6">
      <button
        onClick={generateGraph}
        disabled={isGenerating}
        className="px-4 py-2 bg-stone-900 text-white rounded-lg"
      >
        {isGenerating ? 'Generating...' : 'Generate Knowledge Graph'}
      </button>

      {graph && (
        <div className="mt-4 p-4 bg-stone-50 rounded-lg">
          <h3 className="font-semibold mb-2">Graph Statistics</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-stone-900">{graph.nodes.length}</div>
              <div className="text-sm text-stone-500">Nodes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-900">{graph.edges.length}</div>
              <div className="text-sm text-stone-500">Edges</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-900">{graph.clusters.length}</div>
              <div className="text-sm text-stone-500">Clusters</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Example 5: Using Note Intelligence Service Directly
// ============================================================================

export const DirectServiceExample: React.FC = () => {
  const [intelligence] = useState(() => getNoteIntelligence());

  const _analyzeNoteDirectly = async (note: Note) => {
    // Get full intelligence report
    const fullIntelligence = await intelligence.getFullIntelligence(note, [], {
      includeTags: true,
      includeLinks: true,
      includeRelated: false, // Skip if no other notes
      includeSummary: true,
    });

    console.log('Analysis:', fullIntelligence.analysis);
    console.log('Tags:', fullIntelligence.tags);
    console.log('Link Suggestions:', fullIntelligence.linkSuggestions);
    console.log('Summary:', fullIntelligence.summary);
  };

  const _findUnlinkedMentions = async (content: string, notes: Note[]) => {
    const mentions = await intelligence.findUnlinkedMentions(content, notes);

    mentions.forEach((mention: { title: string; position: number; context: string }) => {
      console.log(`Found mention of "${mention.title}" at position ${mention.position}`);
      console.log(`Context: ${mention.context}`);
    });
  };

  return (
    <div>
      <p>See console for direct service usage examples</p>
    </div>
  );
};

// Mock NoteEditor for examples
const NoteEditor: React.FC<{
  note: Note;
  onUpdate: (noteId: string, updates: Partial<Note>) => void;
}> = () => <div>Note Editor Component</div>;
