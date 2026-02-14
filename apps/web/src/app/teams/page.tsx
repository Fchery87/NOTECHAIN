'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import type { Team } from '../../components/TeamSwitcher';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([
    {
      id: '1',
      name: 'Personal',
      description: 'My personal notes',
      role: 'owner',
      memberCount: 1,
      createdAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      name: 'Work Projects',
      description: 'Collaborative work documents',
      role: 'admin',
      memberCount: 5,
      createdAt: new Date('2024-06-20'),
    },
    {
      id: '3',
      name: 'Research Team',
      description: 'Academic research collaboration',
      role: 'member',
      memberCount: 8,
      createdAt: new Date('2024-09-10'),
    },
  ]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const newTeam: Team = {
      id: Date.now().toString(),
      name: newTeamName.trim(),
      description: newTeamDescription.trim(),
      role: 'owner',
      memberCount: 1,
      createdAt: new Date(),
    };

    setTeams([...teams, newTeam]);
    setNewTeamName('');
    setNewTeamDescription('');
    setShowCreateModal(false);
  };

  const getRoleBadge = (role: Team['role']) => {
    const styles = {
      owner: 'bg-amber-100 text-amber-700 border-amber-200',
      admin: 'bg-rose-100 text-rose-700 border-rose-200',
      member: 'bg-stone-200 text-stone-700 border-stone-300',
      viewer: 'bg-stone-100 text-stone-500 border-stone-200',
    };
    return styles[role];
  };

  const headerActions = (
    <button
      onClick={() => setShowCreateModal(true)}
      className="
        px-5 py-2.5 bg-stone-900 text-stone-50 font-medium rounded-lg
        hover:bg-stone-800 transition-all duration-300
        hover:shadow-lg hover:shadow-stone-900/20
      "
    >
      Create Team
    </button>
  );

  return (
    <AppLayout pageTitle="Teams" actions={headerActions}>
      <div className="py-6">
        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => (
            <a
              key={team.id}
              href={`/teams/${team.id}`}
              className="
                group bg-white rounded-2xl shadow-sm border border-stone-200
                hover:border-stone-300 hover:shadow-lg
                transition-all duration-300 p-6
              "
            >
              {/* Team Icon */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <span className="text-xl font-medium text-amber-700">
                    {team.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full border ${getRoleBadge(team.role)}`}
                >
                  {team.role.charAt(0).toUpperCase() + team.role.slice(1)}
                </span>
              </div>

              {/* Team Info */}
              <h3 className="text-lg font-medium text-stone-900 group-hover:text-amber-700 transition-colors">
                {team.name}
              </h3>
              <p className="text-sm text-stone-500 mt-1 line-clamp-2">
                {team.description || 'No description'}
              </p>

              {/* Meta */}
              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-stone-100">
                <div className="flex items-center gap-1.5 text-sm text-stone-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <span>{team.memberCount} members</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-stone-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{team.createdAt.toLocaleDateString()}</span>
                </div>
              </div>
            </a>
          ))}

          {/* Create New Card */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="
              group flex flex-col items-center justify-center
              bg-stone-50 border-2 border-dashed border-stone-300 rounded-2xl
              hover:border-amber-400 hover:bg-amber-50/30
              transition-all duration-300 p-6 min-h-[200px]
            "
          >
            <div className="w-12 h-12 border-2 border-stone-300 rounded-xl flex items-center justify-center group-hover:border-amber-400 transition-colors">
              <svg
                className="w-6 h-6 text-stone-400 group-hover:text-amber-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <span className="mt-4 font-medium text-stone-600 group-hover:text-amber-700 transition-colors">
              Create New Team
            </span>
          </button>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-stone-900">Create New Team</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
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

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Team Name</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder="Enter team name"
                  autoFocus
                  className="
                    w-full px-4 py-3 bg-white border border-stone-200 rounded-lg
                    text-stone-900 placeholder:text-stone-400
                    focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
                    transition-all duration-200
                  "
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newTeamDescription}
                  onChange={e => setNewTeamDescription(e.target.value)}
                  placeholder="What is this team for?"
                  rows={3}
                  className="
                    w-full px-4 py-3 bg-white border border-stone-200 rounded-lg
                    text-stone-900 placeholder:text-stone-400
                    focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
                    transition-all duration-200 resize-none
                  "
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="
                    flex-1 px-5 py-3 bg-stone-100 text-stone-700 font-medium rounded-lg
                    hover:bg-stone-200 transition-colors
                  "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTeamName.trim()}
                  className="
                    flex-1 px-5 py-3 bg-stone-900 text-stone-50 font-medium rounded-lg
                    hover:bg-stone-800 transition-all duration-300
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
