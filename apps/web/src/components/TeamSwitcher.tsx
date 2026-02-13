'use client';

import { useState, useRef, useEffect } from 'react';

export interface Team {
  id: string;
  name: string;
  description?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  memberCount: number;
  createdAt: Date;
}

interface TeamSwitcherProps {
  teams: Team[];
  currentTeam?: Team;
  onTeamSelect: (team: Team) => void;
  onCreateTeam?: () => void;
}

export function TeamSwitcher({
  teams,
  currentTeam,
  onTeamSelect,
  onCreateTeam,
}: TeamSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-3 px-4 py-2.5
          bg-white border border-stone-200 rounded-lg
          text-stone-700 font-medium
          hover:bg-stone-50 hover:border-stone-300
          transition-all duration-200
          shadow-sm
        "
      >
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
          <span className="text-sm font-medium text-amber-700">
            {(currentTeam?.name || 'Select Team').charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="max-w-[150px] truncate">{currentTeam?.name || 'Select Team'}</span>
        <svg
          className={`w-4 h-4 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-64 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
          <div className="p-2">
            <p className="px-3 py-2 text-xs font-medium text-stone-400 uppercase tracking-wider">
              Your Teams
            </p>
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => {
                  onTeamSelect(team);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                  ${
                    currentTeam?.id === team.id
                      ? 'bg-amber-50 text-amber-900'
                      : 'text-stone-700 hover:bg-stone-50'
                  }
                `}
              >
                <div
                  className={`
                  w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  ${currentTeam?.id === team.id ? 'bg-amber-200' : 'bg-stone-100'}
                `}
                >
                  <span
                    className={`text-sm font-medium ${currentTeam?.id === team.id ? 'text-amber-700' : 'text-stone-600'}`}
                  >
                    {team.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{team.name}</p>
                  <p className="text-xs text-stone-400">{team.memberCount} members</p>
                </div>
                {currentTeam?.id === team.id && (
                  <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {onCreateTeam && (
            <div className="border-t border-stone-200 p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCreateTeam();
                }}
                className="
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-stone-600 hover:bg-stone-50 hover:text-stone-900
                  transition-colors
                "
              >
                <div className="w-8 h-8 border-2 border-dashed border-stone-300 rounded-lg flex items-center justify-center">
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <span className="font-medium">Create New Team</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TeamSwitcher;
