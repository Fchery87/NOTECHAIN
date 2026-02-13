// src/lib/teams/teamManager.ts

import Dexie, { Table } from 'dexie';
import type {
  Team,
  TeamInvite,
  Workspace,
  TeamRole,
  TeamMember,
  WorkspaceFolder,
  WorkspaceSettings,
} from './types';

class TeamDatabase extends Dexie {
  teams!: Table<Team, string>;
  invites!: Table<TeamInvite, string>;
  workspaces!: Table<Workspace, string>;

  constructor() {
    super('NoteChainTeamsDB');

    this.version(1).stores({
      teams: 'id, name, ownerId, createdAt',
      invites: 'id, teamId, email, token, expiresAt',
      workspaces: 'id, teamId, name, createdAt',
    });
  }
}

const teamDb = new TeamDatabase();

function generateId(): string {
  return crypto.randomUUID();
}

function isRoleAllowed(
  requesterRole: TeamRole,
  targetRole: TeamRole,
  action: 'remove' | 'update'
): boolean {
  const roleHierarchy: Record<TeamRole, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };

  if (action === 'remove') {
    return roleHierarchy[requesterRole] > roleHierarchy[targetRole];
  }

  if (action === 'update') {
    return roleHierarchy[requesterRole] >= roleHierarchy[targetRole];
  }

  return false;
}

export async function createTeam(
  name: string,
  ownerId: string,
  description?: string
): Promise<Team> {
  const now = new Date();
  const team: Team = {
    id: generateId(),
    name,
    description,
    ownerId,
    members: [
      {
        userId: ownerId,
        role: 'owner',
        joinedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  await teamDb.teams.add(team);
  return team;
}

export async function getTeam(teamId: string): Promise<Team | undefined> {
  return await teamDb.teams.get(teamId);
}

export async function updateTeam(
  teamId: string,
  updates: Partial<Pick<Team, 'name' | 'description'>>
): Promise<Team | undefined> {
  const team = await teamDb.teams.get(teamId);
  if (!team) return undefined;

  const updatedTeam: Team = {
    ...team,
    ...updates,
    updatedAt: new Date(),
  };

  await teamDb.teams.put(updatedTeam);
  return updatedTeam;
}

export async function deleteTeam(teamId: string): Promise<boolean> {
  const workspaces = await teamDb.workspaces.where('teamId').equals(teamId).toArray();

  for (const workspace of workspaces) {
    await teamDb.workspaces.delete(workspace.id);
  }

  const invites = await teamDb.invites.where('teamId').equals(teamId).toArray();

  for (const invite of invites) {
    await teamDb.invites.delete(invite.id);
  }

  await teamDb.teams.delete(teamId);
  return true;
}

export async function inviteMember(
  teamId: string,
  email: string,
  role: TeamRole,
  invitedBy: string
): Promise<TeamInvite> {
  const team = await teamDb.teams.get(teamId);
  if (!team) throw new Error('Team not found');

  const inviter = team.members.find(m => m.userId === invitedBy);
  if (!inviter || !['owner', 'admin'].includes(inviter.role)) {
    throw new Error('Only owners and admins can invite members');
  }

  const existingInvite = await teamDb.invites.where({ teamId, email }).first();

  if (existingInvite && new Date(existingInvite.expiresAt) > new Date()) {
    throw new Error('Invite already exists for this email');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const invite: TeamInvite = {
    id: generateId(),
    teamId,
    email,
    role,
    invitedBy,
    token: generateId(),
    expiresAt,
    createdAt: now,
  };

  await teamDb.invites.add(invite);
  return invite;
}

export async function acceptInvite(token: string): Promise<Team | undefined> {
  const invite = await teamDb.invites.where('token').equals(token).first();

  if (!invite) {
    throw new Error('Invalid invite token');
  }

  if (new Date(invite.expiresAt) < new Date()) {
    throw new Error('Invite has expired');
  }

  const team = await teamDb.teams.get(invite.teamId);
  if (!team) throw new Error('Team not found');

  const existingMember = team.members.find(m => m.userId === invite.email);
  if (existingMember) {
    throw new Error('User is already a member');
  }

  const newMember: TeamMember = {
    userId: invite.email,
    role: invite.role,
    joinedAt: new Date(),
  };

  team.members.push(newMember);
  team.updatedAt = new Date();

  await teamDb.teams.put(team);
  await teamDb.invites.delete(invite.id);

  return team;
}

export async function removeMember(
  teamId: string,
  userId: string,
  requesterId: string
): Promise<Team | undefined> {
  const team = await teamDb.teams.get(teamId);
  if (!team) return undefined;

  const requester = team.members.find(m => m.userId === requesterId);
  if (!requester || !['owner', 'admin'].includes(requester.role)) {
    throw new Error('Only owners and admins can remove members');
  }

  const targetMember = team.members.find(m => m.userId === userId);
  if (!targetMember) {
    throw new Error('Member not found');
  }

  if (targetMember.role === 'owner') {
    throw new Error('Cannot remove the owner');
  }

  if (!isRoleAllowed(requester.role, targetMember.role, 'remove')) {
    throw new Error('Cannot remove member with higher or equal role');
  }

  team.members = team.members.filter(m => m.userId !== userId);
  team.updatedAt = new Date();

  await teamDb.teams.put(team);
  return team;
}

export async function updateMemberRole(
  teamId: string,
  userId: string,
  newRole: TeamRole,
  requesterId: string
): Promise<Team | undefined> {
  const team = await teamDb.teams.get(teamId);
  if (!team) return undefined;

  const requester = team.members.find(m => m.userId === requesterId);
  if (!requester || requester.role !== 'owner') {
    throw new Error('Only the owner can change member roles');
  }

  if (userId === requesterId) {
    throw new Error('Cannot change your own role');
  }

  const targetMember = team.members.find(m => m.userId === userId);
  if (!targetMember) {
    throw new Error('Member not found');
  }

  targetMember.role = newRole;
  team.updatedAt = new Date();

  await teamDb.teams.put(team);
  return team;
}

export async function getUserTeams(userId: string): Promise<Team[]> {
  const allTeams = await teamDb.teams.toArray();

  return allTeams.filter(team => team.members.some(m => m.userId === userId));
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const team = await teamDb.teams.get(teamId);
  return team?.members ?? [];
}

export async function createWorkspace(
  teamId: string,
  name: string,
  settings?: Partial<WorkspaceSettings>
): Promise<Workspace> {
  const team = await teamDb.teams.get(teamId);
  if (!team) throw new Error('Team not found');

  const now = new Date();

  const defaultSettings: WorkspaceSettings = {
    notificationsEnabled: true,
    ...settings,
  };

  const workspace: Workspace = {
    id: generateId(),
    teamId,
    name,
    folders: [],
    settings: defaultSettings,
    createdAt: now,
    updatedAt: now,
  };

  await teamDb.workspaces.add(workspace);
  return workspace;
}

export async function getWorkspace(workspaceId: string): Promise<Workspace | undefined> {
  return await teamDb.workspaces.get(workspaceId);
}

export async function updateWorkspace(
  workspaceId: string,
  updates: Partial<Pick<Workspace, 'name' | 'settings'>>
): Promise<Workspace | undefined> {
  const workspace = await teamDb.workspaces.get(workspaceId);
  if (!workspace) return undefined;

  const updatedWorkspace: Workspace = {
    ...workspace,
    ...updates,
    updatedAt: new Date(),
  };

  await teamDb.workspaces.put(updatedWorkspace);
  return updatedWorkspace;
}

export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  await teamDb.workspaces.delete(workspaceId);
  return true;
}

export async function getTeamWorkspaces(teamId: string): Promise<Workspace[]> {
  return await teamDb.workspaces.where('teamId').equals(teamId).toArray();
}

export async function addWorkspaceFolder(
  workspaceId: string,
  folder: Omit<WorkspaceFolder, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Workspace | undefined> {
  const workspace = await teamDb.workspaces.get(workspaceId);
  if (!workspace) return undefined;

  const now = new Date();
  const newFolder: WorkspaceFolder = {
    ...folder,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  workspace.folders.push(newFolder);
  workspace.updatedAt = now;

  await teamDb.workspaces.put(workspace);
  return workspace;
}
