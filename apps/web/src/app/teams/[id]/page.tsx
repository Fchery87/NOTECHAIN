'use client';

import { useState, use } from 'react';
import { TeamSettings } from '../../../components/TeamSettings';
import type { Team } from '../../../components/TeamSwitcher';
import type { TeamMember } from '../../../components/MemberList';

interface TeamDashboardProps {
  params: Promise<{ id: string }>;
}

export default function TeamDashboardPage({ params }: TeamDashboardProps) {
  const { id } = use(params);

  const [activeTab, setActiveTab] = useState<'notes' | 'settings'>('notes');
  const [currentTeam, setCurrentTeam] = useState<Team>({
    id,
    name: 'Work Projects',
    description: 'Collaborative work documents and notes',
    role: 'admin',
    memberCount: 5,
    createdAt: new Date('2024-06-20'),
  });
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'owner',
      joinedAt: new Date('2024-06-20'),
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'admin',
      joinedAt: new Date('2024-07-01'),
    },
    {
      id: '3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      role: 'member',
      joinedAt: new Date('2024-08-15'),
    },
    {
      id: 'current-user',
      name: 'Alice Brown',
      email: 'alice@example.com',
      role: 'admin',
      joinedAt: new Date('2024-07-10'),
    },
  ]);

  const [notes] = useState([
    {
      id: '1',
      title: 'Q4 Planning Document',
      preview: 'Key objectives and deliverables for Q4 2024...',
      updatedAt: new Date('2024-12-01'),
      folder: 'Planning',
    },
    {
      id: '2',
      title: 'Team Meeting Notes - Nov 28',
      preview: 'Attendees: John, Jane, Bob, Alice...',
      updatedAt: new Date('2024-11-28'),
      folder: 'Meetings',
    },
    {
      id: '3',
      title: 'Project Roadmap 2025',
      preview: 'Vision and strategic initiatives for 2025...',
      updatedAt: new Date('2024-11-25'),
      folder: 'Planning',
    },
  ]);

  const [folders] = useState([
    { id: '1', name: 'Planning', noteCount: 12 },
    { id: '2', name: 'Meetings', noteCount: 24 },
    { id: '3', name: 'Research', noteCount: 8 },
    { id: '4', name: 'Archive', noteCount: 45 },
  ]);

  const handleUpdateTeam = (updates: Partial<Team>) => {
    setCurrentTeam((prev: Team) => ({ ...prev, ...updates }));
  };

  const handleInviteMember = (email: string, role: TeamMember['role']) => {
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: email.split('@')[0],
      email,
      role,
      joinedAt: new Date(),
    };
    setMembers([...members, newMember]);
    setCurrentTeam((prev: Team) => ({ ...prev, memberCount: prev.memberCount + 1 }));
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter(m => m.id !== memberId));
    setCurrentTeam((prev: Team) => ({ ...prev, memberCount: prev.memberCount - 1 }));
  };

  const handleUpdateMemberRole = (memberId: string, role: TeamMember['role']) => {
    setMembers(members.map(m => (m.id === memberId ? { ...m, role } : m)));
  };

  const handleDeleteTeam = () => {
    window.location.href = '/teams';
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <a href="/dashboard" className="font-serif text-2xl font-medium text-stone-900">
                NoteChain
              </a>
              <span className="text-stone-300">/</span>
              <a
                href="/teams"
                className="text-lg text-stone-600 hover:text-stone-900 transition-colors"
              >
                Teams
              </a>
              <span className="text-stone-300">/</span>
              <span className="text-lg text-stone-900 font-medium">{currentTeam.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 px-3 py-1.5 bg-green-100 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700">Synced</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>AES-256</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <nav className="flex gap-1">
            {[
              {
                id: 'notes',
                label: 'Notes & Folders',
                icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
              },
              {
                id: 'settings',
                label: 'Settings',
                icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
              },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`
                  flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-700'
                      : 'border-transparent text-stone-600 hover:text-stone-900 hover:border-stone-300'
                  }
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Folders Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
                <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-3">
                  Folders
                </h3>
                <div className="space-y-1">
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      className="
                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                        text-stone-700 hover:bg-stone-50 hover:text-stone-900
                        transition-colors
                      "
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className="w-4 h-4 text-stone-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                          />
                        </svg>
                        <span className="font-medium">{folder.name}</span>
                      </div>
                      <span className="text-xs text-stone-400">{folder.noteCount}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes Grid */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-stone-900">All Notes</h2>
                <button className="px-4 py-2 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 transition-colors">
                  New Note
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes.map(note => (
                  <a
                    key={note.id}
                    href={`/notes/${note.id}`}
                    className="
                      group bg-white rounded-xl shadow-sm border border-stone-200
                      hover:border-amber-300 hover:shadow-md
                      transition-all duration-200 p-5
                    "
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        {note.folder}
                      </span>
                      <span className="text-xs text-stone-400">
                        {note.updatedAt.toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-base font-medium text-stone-900 group-hover:text-amber-700 transition-colors mb-2">
                      {note.title}
                    </h3>
                    <p className="text-sm text-stone-500 line-clamp-2">{note.preview}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <TeamSettings
            team={currentTeam}
            members={members}
            currentUserRole={currentTeam.role}
            onUpdateTeam={handleUpdateTeam}
            onInviteMember={handleInviteMember}
            onRemoveMember={handleRemoveMember}
            onUpdateMemberRole={handleUpdateMemberRole}
            onDeleteTeam={handleDeleteTeam}
          />
        )}
      </main>
    </div>
  );
}
