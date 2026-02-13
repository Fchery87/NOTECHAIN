'use client';

import { useState } from 'react';
import type { TeamMember } from './MemberList';

export interface Team {
  id: string;
  name: string;
  description?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  memberCount: number;
  createdAt: Date;
}

interface TeamSettingsProps {
  team: Team;
  members: TeamMember[];
  currentUserRole: 'owner' | 'admin' | 'member' | 'viewer';
  onUpdateTeam: (updates: Partial<Team>) => void;
  onInviteMember: (email: string, role: TeamMember['role']) => void;
  onRemoveMember: (memberId: string) => void;
  onUpdateMemberRole: (memberId: string, role: TeamMember['role']) => void;
  onDeleteTeam: () => void;
}

export function TeamSettings({
  team,
  members,
  currentUserRole,
  onUpdateTeam,
  onInviteMember,
  onRemoveMember,
  onUpdateMemberRole,
  onDeleteTeam,
}: TeamSettingsProps) {
  const [teamName, setTeamName] = useState(team.name);
  const [teamDescription, setTeamDescription] = useState(team.description || '');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('member');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const canManageTeam = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canDeleteTeam = currentUserRole === 'owner';

  const handleSaveTeam = () => {
    onUpdateTeam({ name: teamName, description: teamDescription });
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail.trim()) {
      onInviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setShowInviteForm(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Team Info */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <h3 className="text-lg font-medium text-stone-900 mb-6">Team Information</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              disabled={!canManageTeam}
              className="
                w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg
                text-stone-900 placeholder:text-stone-400
                focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
                disabled:bg-stone-50 disabled:text-stone-500
                transition-all duration-200
              "
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
            <textarea
              value={teamDescription}
              onChange={e => setTeamDescription(e.target.value)}
              disabled={!canManageTeam}
              rows={3}
              className="
                w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg
                text-stone-900 placeholder:text-stone-400
                focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
                disabled:bg-stone-50 disabled:text-stone-500
                transition-all duration-200 resize-none
              "
            />
          </div>

          {canManageTeam && (
            <button
              onClick={handleSaveTeam}
              className="
                px-5 py-2.5 bg-stone-900 text-stone-50 font-medium rounded-lg
                hover:bg-stone-800 transition-all duration-300
                hover:shadow-lg hover:shadow-stone-900/20
              "
            >
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-stone-900">Team Members</h3>
          {canManageTeam && (
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="
                px-4 py-2 bg-amber-600 text-white font-medium rounded-lg
                hover:bg-amber-700 transition-colors
              "
            >
              Invite Member
            </button>
          )}
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <form onSubmit={handleInvite} className="mb-6 p-4 bg-stone-50 rounded-lg">
            <div className="flex gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                className="
                  flex-1 px-4 py-2 bg-white border border-stone-200 rounded-lg
                  text-stone-900 placeholder:text-stone-400
                  focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
                  transition-all duration-200
                "
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as TeamMember['role'])}
                className="
                  px-4 py-2 bg-white border border-stone-200 rounded-lg
                  text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20
                  transition-all duration-200
                "
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                className="
                  px-4 py-2 bg-stone-900 text-stone-50 font-medium rounded-lg
                  hover:bg-stone-800 transition-colors
                "
              >
                Invite
              </button>
            </div>
          </form>
        )}

        {/* Members List */}
        <div className="space-y-3">
          {members.map(member => (
            <div
              key={member.id}
              className="
                flex items-center justify-between p-4
                bg-stone-50 rounded-lg
                hover:bg-stone-100 transition-colors
              "
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-amber-700">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-stone-900">{member.name}</p>
                  <p className="text-sm text-stone-500">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Role Badge */}
                <span
                  className={`
                    px-3 py-1 text-xs font-medium rounded-full
                    ${member.role === 'owner' ? 'bg-amber-100 text-amber-700' : ''}
                    ${member.role === 'admin' ? 'bg-rose-100 text-rose-700' : ''}
                    ${member.role === 'member' ? 'bg-stone-200 text-stone-700' : ''}
                    ${member.role === 'viewer' ? 'bg-stone-100 text-stone-500' : ''}
                  `}
                >
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </span>

                {/* Role Change Dropdown */}
                {canManageTeam && member.role !== 'owner' && member.id !== 'current-user' && (
                  <select
                    value={member.role}
                    onChange={e =>
                      onUpdateMemberRole(member.id, e.target.value as TeamMember['role'])
                    }
                    className="
                      px-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg
                      text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20
                      transition-all duration-200
                    "
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                )}

                {/* Remove Button */}
                {canManageTeam && member.role !== 'owner' && member.id !== 'current-user' && (
                  <button
                    onClick={() => onRemoveMember(member.id)}
                    className="p-2 text-stone-400 hover:text-rose-600 transition-colors"
                    title="Remove member"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      {canDeleteTeam && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <h3 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h3>
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <p className="text-sm text-red-700 mb-4">
              Once you delete a team, there is no going back. All team notes and data will be
              permanently deleted.
            </p>
            <button
              onClick={() => setIsDeleting(!isDeleting)}
              className="
                px-4 py-2 border border-red-300 text-red-600 font-medium rounded-lg
                hover:bg-red-100 transition-colors
              "
            >
              {isDeleting ? 'Cancel' : 'Delete Team'}
            </button>

            {isDeleting && (
              <div className="mt-4 pt-4 border-t border-red-200">
                <p className="text-sm text-red-600 mb-3">
                  Type <strong>{team.name}</strong> to confirm deletion
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Confirm team name"
                    className="
                      flex-1 px-4 py-2 bg-white border border-red-300 rounded-lg
                      text-stone-900 placeholder:text-stone-400
                      focus:outline-none focus:ring-2 focus:ring-red-500/20
                    "
                  />
                  <button
                    onClick={onDeleteTeam}
                    className="
                      px-4 py-2 bg-red-600 text-white font-medium rounded-lg
                      hover:bg-red-700 transition-colors
                    "
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamSettings;
