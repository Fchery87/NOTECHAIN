// src/lib/teams/types.ts

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface TeamMember {
  userId: string;
  role: TeamRole;
  joinedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceSettings {
  defaultFolderId?: string;
  theme?: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
}

export interface Workspace {
  id: string;
  teamId: string;
  name: string;
  folders: WorkspaceFolder[];
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}
