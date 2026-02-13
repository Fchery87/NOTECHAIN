'use client';

import { useState } from 'react';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
}

interface MemberListProps {
  members: TeamMember[];
  currentUserId?: string;
  canManageMembers: boolean;
  onRoleChange: (memberId: string, role: TeamMember['role']) => void;
  onRemoveMember: (memberId: string) => void;
}

export function MemberList({
  members,
  currentUserId,
  canManageMembers,
  onRoleChange,
  onRemoveMember,
}: MemberListProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const getRoleBadgeStyles = (role: TeamMember['role']) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'admin':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'member':
        return 'bg-stone-200 text-stone-700 border-stone-300';
      case 'viewer':
        return 'bg-stone-100 text-stone-500 border-stone-200';
      default:
        return 'bg-stone-100 text-stone-500';
    }
  };

  const canModifyMember = (member: TeamMember) => {
    if (!canManageMembers) return false;
    if (member.role === 'owner') return false;
    if (member.id === currentUserId) return false;
    return true;
  };

  return (
    <div className="space-y-2">
      {members.map(member => (
        <div
          key={member.id}
          className="
            group flex items-center justify-between p-4
            bg-white border border-stone-200 rounded-xl
            hover:border-stone-300 hover:shadow-sm
            transition-all duration-200
          "
        >
          {/* Member Info */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              {member.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-amber-700">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-stone-900">{member.name}</p>
                {member.id === currentUserId && (
                  <span className="text-xs text-stone-400">(you)</span>
                )}
              </div>
              <p className="text-sm text-stone-500">{member.email}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <span
              className={`
                px-3 py-1 text-xs font-medium rounded-full border
                ${getRoleBadgeStyles(member.role)}
              `}
            >
              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
            </span>

            {/* Role Dropdown */}
            {canModifyMember(member) && (
              <div className="relative">
                <button
                  onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                  className="
                    p-2 text-stone-400 hover:text-stone-600
                    hover:bg-stone-100 rounded-lg
                    transition-colors
                  "
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                  </svg>
                </button>

                {expandedMember === member.id && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-stone-200 rounded-lg shadow-lg z-10 overflow-hidden">
                    <div className="p-1">
                      {(['admin', 'member', 'viewer'] as const).map(role => (
                        <button
                          key={role}
                          onClick={() => {
                            onRoleChange(member.id, role);
                            setExpandedMember(null);
                          }}
                          className={`
                            w-full px-3 py-2 text-left text-sm rounded-md
                            transition-colors
                            ${
                              member.role === role
                                ? 'bg-amber-50 text-amber-700 font-medium'
                                : 'text-stone-700 hover:bg-stone-50'
                            }
                          `}
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Remove Button */}
            {canModifyMember(member) && (
              <button
                onClick={() => onRemoveMember(member.id)}
                className="
                  p-2 text-stone-400 hover:text-rose-600
                  hover:bg-rose-50 rounded-lg
                  opacity-0 group-hover:opacity-100
                  transition-all duration-200
                "
                title="Remove member"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MemberList;
