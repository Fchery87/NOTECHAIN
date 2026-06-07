'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { KnowledgeGraphView } from '@/components/KnowledgeGraphView';
import { getKnowledgeGraphGenerator } from '@/lib/ai/notes';
import { listNotes, listTodos } from '@/lib/db';
import { buildContextGraph } from '@/lib/graph/contextGraph';
import { createNoteRepository } from '@/lib/repositories';
import { getMeetingEncryptionKey } from '@/lib/storage/meetingEncryptionKey';
import { createMeetingStorage } from '@/lib/storage/meetingStorage';
import { useUser } from '@/lib/supabase/UserProvider';
import type { KnowledgeGraph } from '@/lib/ai/notes/types';
import type { Note } from '@notechain/data-models';

/**
 * Knowledge Graph Page
 *
 * Displays an interactive visualization of all notes and their connections.
 * Uses the KnowledgeGraphView component to render the graph with Cytoscape.js.
 *
 * Features:
 * - Loads all notes from the repository
 * - Generates graph data with tags and similarity connections
 * - Interactive node clicking to navigate to notes
 * - Loading and error states
 * - Tips section for users
 */
export default function KnowledgeGraphPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useUser();
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGraph() {
      if (isAuthLoading || !user) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const userId = user.id;
        const encryptionKey = new Uint8Array(32);

        const noteRepository = createNoteRepository(userId, encryptionKey);
        const notes: Note[] = await noteRepository.getAll();

        // Generate graph data
        const generator = getKnowledgeGraphGenerator();
        const graphData = await generator.generateGraph(notes, {
          includeTags: true,
          includeSimilarity: true,
          maxNodes: 200,
        });

        const meetingStorage = createMeetingStorage();
        const meetingKey = await getMeetingEncryptionKey();
        const [localNotes, meetings, todos] = await Promise.all([
          listNotes(),
          meetingStorage.getAllMeetings(meetingKey),
          listTodos(),
        ]);

        setGraph(
          buildContextGraph({
            baseGraph: graphData,
            notes: localNotes,
            meetings,
            todos,
          })
        );
      } catch (err) {
        console.error('Failed to load knowledge graph:', err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : err && typeof err === 'object'
                ? JSON.stringify(err)
                : 'Failed to load knowledge graph';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    loadGraph();
  }, [user, isAuthLoading]);

  /**
   * Handle node click - navigate to note detail page
   */
  const handleNodeClick = (nodeId: string, nodeData: any) => {
    if (nodeData?.type === 'note') {
      router.push(`/notes/${nodeId}`);
      return;
    }

    if (nodeData?.type === 'meeting') {
      router.push(`/meetings/${nodeData.metadata?.sourceId ?? nodeId.replace('meeting:', '')}`);
      return;
    }

    if (nodeData?.type === 'transcript_segment') {
      const [, meetingId] = nodeId.split(':');
      if (meetingId) {
        router.push(`/meetings/${meetingId}`);
      }
      return;
    }

    if (nodeData?.type === 'task') {
      router.push('/tasks');
    }
  };

  return (
    <AppLayout pageTitle="Knowledge Map">
      <div className="py-6">
        <div className="mb-6">
          <p className="text-stone-600">
            Visualize source-cited connections between notes, meetings, transcript segments, and
            tasks.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-6 bg-rose-50/50 border border-rose-100 rounded-3xl">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-medium text-rose-900">Error loading graph</h3>
                <p className="text-sm text-rose-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Map View */}
        <div className="bg-white rounded-3xl border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <KnowledgeGraphView
            graph={graph || { nodes: [], edges: [], clusters: [] }}
            isLoading={isLoading}
            onNodeClick={handleNodeClick}
            height="600px"
            showControls={true}
          />
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-stone-50/50 rounded-3xl p-8 border border-stone-100">
          <h2 className="font-serif text-xl font-medium text-stone-900 mb-4 tracking-tight">
            Tips
          </h2>
          <ul className="space-y-3 text-stone-600">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                1
              </span>
              <span>
                <strong className="text-stone-900">Click on any note node</strong> to open that note
                and see its full content.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                2
              </span>
              <span>
                <strong className="text-stone-900">Use the layout selector</strong> to change how
                nodes are arranged — try Force Directed, Circle, or Hierarchical views.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                3
              </span>
              <span>
                <strong className="text-stone-900">Toggle node types</strong> to show or hide notes,
                meetings, transcript segments, tasks, and tags.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                4
              </span>
              <span>
                <strong className="text-stone-900">Zoom and pan</strong> to explore large graphs —
                use the zoom controls or scroll to navigate.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                5
              </span>
              <span>
                <strong className="text-stone-900">Source edges</strong> show what was created from
                a meeting, note, or transcript segment. Citation edges show the evidence a task
                cites.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
