'use client';

import { useEffect, useState } from 'react';
import { listMeetingFollowUps, type MeetingFollowUp } from '../lib/meetings/meetingFollowUps';

function priorityLabel(priority: MeetingFollowUp['priority']): string {
  if (!priority) return 'medium';
  return priority;
}

export function MeetingFollowUps() {
  const [followUps, setFollowUps] = useState<MeetingFollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const loadFollowUps = async () => {
      try {
        const items = await listMeetingFollowUps(5);
        if (!isCancelled) {
          setFollowUps(items);
        }
      } catch (error) {
        console.error('Failed to load meeting follow-ups:', error);
        if (!isCancelled) {
          setFollowUps([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadFollowUps();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <section className="mb-8 rounded-3xl border border-stone-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-600">
            Meeting follow-ups
          </p>
          <h2 className="mt-2 font-serif text-2xl font-medium text-stone-900">
            Today&apos;s source-linked work
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Tasks created from meeting action items, with links back to their source meeting and
            transcript segment.
          </p>
        </div>
        <a
          href="/meetings"
          className="hidden rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 sm:inline-flex"
        >
          Meetings
        </a>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">
            Loading follow-ups…
          </div>
        ) : followUps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-5">
            <p className="text-sm font-medium text-stone-700">No meeting follow-ups yet</p>
            <p className="mt-1 text-sm text-stone-500">
              Open a meeting, use “Create task” on an action item, and it will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-100">
            {followUps.map(todo => (
              <a
                key={todo.id}
                href={`/meetings/${todo.sourceMeetingId}`}
                className="block bg-white p-4 transition-colors hover:bg-amber-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-900">{todo.title}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      Meeting {todo.sourceMeetingId}
                      {todo.sourceTranscriptSegmentId ? ` · ${todo.sourceTranscriptSegmentId}` : ''}
                    </p>
                    {todo.sourceText && (
                      <p className="mt-2 line-clamp-2 text-xs text-stone-500">
                        “{todo.sourceText}”
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                    {priorityLabel(todo.priority)}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default MeetingFollowUps;
