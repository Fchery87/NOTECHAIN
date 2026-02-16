'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminProtectedLayout from '@/components/AdminProtectedLayout';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Types
interface User {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'inactive';
  created_at: string;
  last_active_at: string | null;
  storage_bytes: number;
  suspended_at: string | null;
  suspended_reason: string | null;
}

interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  severity: 'info' | 'warning' | 'critical';
  status: 'success' | 'failure';
  created_at: string;
}

interface UserSession {
  session_id: string;
  ip_address: string;
  user_agent: string;
  device_info: Record<string, unknown>;
  created_at: string;
  last_active_at: string;
  expires_at: string;
  is_current_session: boolean;
}

interface UserActivityDetails {
  profile: {
    id: string;
    role: string;
    plan: string;
    status: string;
    created_at: string;
    updated_at: string;
    last_active_at: string | null;
    suspended_at: string | null;
    suspended_reason: string | null;
    metadata: Record<string, unknown>;
  };
  auth: {
    email: string;
    email_confirmed_at: string;
    last_sign_in_at: string;
    created_at: string;
  } | null;
  storage: {
    total_blobs: number;
    total_bytes: number;
    total_mb: number;
    oldest_blob: string;
    newest_blob: string;
  };
  sync_history: Array<{
    device_id: string;
    last_sync_version: number;
    sync_status: string;
    last_synced_at: string;
  }>;
  audit_history: Array<{
    id: string;
    action: string;
    actor_email: string;
    old_value: Record<string, unknown>;
    new_value: Record<string, unknown>;
    severity: string;
    created_at: string;
  }>;
  devices: Array<{
    id: string;
    device_name: string;
    device_type: string;
    last_synced_at: string;
  }>;
}

interface AdminStats {
  total_users: number;
  active_users_7d: number;
  total_storage_bytes: number;
  total_storage_mb: number;
  total_sync_operations: number;
  successful_syncs_24h: number;
  failed_syncs: number;
  sync_success_rate: number;
  suspended_users: number;
  recent_audit_logs_24h: number;
  active_user_percentage: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ActivityMetrics {
  dau: number;
  wau: number;
  mau: number;
  dau_wau_ratio: number;
  wau_mau_ratio: number;
}

interface StorageAnalytics {
  total_bytes: number;
  total_mb: number;
  total_gb: number;
  avg_per_user_bytes: number;
  avg_per_user_mb: number;
  top_consumers: Array<{
    user_id: string;
    bytes: number;
    mb: number;
  }>;
}

interface GrowthData {
  date: string;
  new_users: number;
  total_users: number;
}

const CHART_COLORS = {
  amber: '#f59e0b',
  rose: '#f43f5e',
  stone: '#78716c',
  green: '#22c55e',
  blue: '#3b82f6',
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activityMetrics, setActivityMetrics] = useState<ActivityMetrics | null>(null);
  const [storageAnalytics, setStorageAnalytics] = useState<StorageAnalytics | null>(null);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userActivityDetails, setUserActivityDetails] = useState<UserActivityDetails | null>(null);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'activity' | 'sessions'>(
    'overview'
  );
  const [showUserModal, setShowUserModal] = useState(false);

  // Pagination
  const [usersPagination, setUsersPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [logsPagination, setLogsPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [userFilters, setUserFilters] = useState({
    status: '',
    role: '',
    plan: '',
    search: '',
  });
  const [logFilters, setLogFilters] = useState({
    action: '',
    severity: '',
  });

  // Selection for bulk operations
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Fetch functions
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: usersPagination.page.toString(),
        limit: usersPagination.limit.toString(),
        ...(userFilters.status && { status: userFilters.status }),
        ...(userFilters.role && { role: userFilters.role }),
        ...(userFilters.plan && { plan: userFilters.plan }),
        ...(userFilters.search && { search: userFilters.search }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();

      setUsers(data.users);
      setUsersPagination(data.pagination);
      setSelectedUsers(new Set());
      setSelectAll(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [usersPagination.page, usersPagination.limit, userFilters]);

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: logsPagination.page.toString(),
        limit: logsPagination.limit.toString(),
        ...(logFilters.severity && { severity: logFilters.severity }),
      });

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      const data = await response.json();

      setAuditLogs(data.logs);
      setLogsPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [logsPagination.page, logsPagination.limit, logFilters]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [activityRes, storageRes, growthRes] = await Promise.all([
        fetch('/api/admin/analytics/activity'),
        fetch('/api/admin/analytics/storage'),
        fetch('/api/admin/analytics/growth?days=30'),
      ]);

      if (activityRes.ok) setActivityMetrics(await activityRes.json());
      if (storageRes.ok) setStorageAnalytics(await storageRes.json());
      if (growthRes.ok) {
        const growth = await growthRes.json();
        setGrowthData(growth.growth || []);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  }, []);

  const fetchUserActivityDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/activity`);
      if (!response.ok) throw new Error('Failed to fetch user activity');
      const data = await response.json();
      setUserActivityDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user activity');
    }
  };

  const fetchUserSessions = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/sessions`);
      if (!response.ok) throw new Error('Failed to fetch user sessions');
      const data = await response.json();
      setUserSessions(data.sessions);
    } catch (err) {
      console.error('Failed to load user sessions:', err);
    }
  };

  // User actions
  const openUserModal = async (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
    setActiveModalTab('overview');
    await Promise.all([fetchUserActivityDetails(user.id), fetchUserSessions(user.id)]);
  };

  const updateUserRole = async (userId: string, newRole: string, reason?: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update role');
      }

      await Promise.all([fetchUsers(), fetchStats()]);
      if (selectedUser?.id === userId && userActivityDetails) {
        await fetchUserActivityDetails(userId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const updateUserStatus = async (userId: string, newStatus: string, reason?: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      await Promise.all([fetchUsers(), fetchStats()]);
      if (selectedUser?.id === userId && userActivityDetails) {
        await fetchUserActivityDetails(userId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Revoked by admin' }),
      });

      if (!response.ok) throw new Error('Failed to revoke session');

      if (selectedUser) {
        await fetchUserSessions(selectedUser.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session');
    }
  };

  const revokeAllSessions = async (userId: string) => {
    if (
      !confirm(
        'Are you sure you want to revoke all sessions for this user? They will be logged out everywhere.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/sessions/revoke-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Security action by admin' }),
      });

      if (!response.ok) throw new Error('Failed to revoke all sessions');

      await fetchUserSessions(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke sessions');
    }
  };

  // Bulk operations
  const bulkUpdateRole = async (newRole: string, reason?: string) => {
    if (selectedUsers.size === 0) return;

    try {
      const promises = Array.from(selectedUsers).map(userId =>
        fetch(`/api/admin/users/${userId}/role`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole, reason }),
        })
      );

      await Promise.all(promises);
      await Promise.all([fetchUsers(), fetchStats()]);
      setSelectedUsers(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform bulk update');
    }
  };

  const bulkUpdateStatus = async (newStatus: string, reason?: string) => {
    if (selectedUsers.size === 0) return;

    try {
      const promises = Array.from(selectedUsers).map(userId =>
        fetch(`/api/admin/users/${userId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, reason }),
        })
      );

      await Promise.all(promises);
      await Promise.all([fetchUsers(), fetchStats()]);
      setSelectedUsers(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform bulk update');
    }
  };

  // Export functions
  const exportUsersToCSV = () => {
    const headers = [
      'ID',
      'Email',
      'Role',
      'Plan',
      'Status',
      'Created At',
      'Last Active',
      'Storage (MB)',
    ];
    const rows = users.map(user => [
      user.id,
      user.email,
      user.role,
      user.plan,
      user.status,
      new Date(user.created_at).toISOString(),
      user.last_active_at ? new Date(user.last_active_at).toISOString() : '',
      (user.storage_bytes / 1024 / 1024).toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAuditLogsToCSV = () => {
    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Actor',
      'Resource Type',
      'Resource ID',
      'Severity',
      'Status',
    ];
    const rows = auditLogs.map(log => [
      log.id,
      new Date(log.created_at).toISOString(),
      log.action,
      log.actor_email || log.actor_id || 'System',
      log.resource_type || '',
      log.resource_id || '',
      log.severity,
      log.status,
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Selection helpers
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
    setSelectAll(!selectAll);
  };

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Tab change effects
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab, fetchUsers, fetchAuditLogs, fetchAnalytics]);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'suspended':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'inactive':
        return 'bg-stone-100 text-stone-800 border-stone-200';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'moderator':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-stone-100 text-stone-700 border-stone-200';
      case 'pro':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'enterprise':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'warning':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  // Navigation
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
    },
    {
      id: 'users',
      label: 'Users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
  ];

  // Plan distribution
  const planDistribution = [
    { name: 'Free', value: users.filter(u => u.plan === 'free').length, color: CHART_COLORS.stone },
    { name: 'Pro', value: users.filter(u => u.plan === 'pro').length, color: CHART_COLORS.amber },
    {
      name: 'Enterprise',
      value: users.filter(u => u.plan === 'enterprise').length,
      color: CHART_COLORS.blue,
    },
  ].filter(p => p.value > 0);

  return (
    <AdminProtectedLayout>
      {/* Navigation */}
      <div className="bg-white border-b border-stone-200 sticky top-16 z-30">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between">
            <nav className="flex gap-1 -mb-px">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 sm:px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200 ${
                    activeTab === item.id
                      ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                      : 'border-transparent text-stone-600 hover:text-stone-900 hover:border-stone-300'
                  }`}
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700">System Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Error Toast */}
        {error && (
          <div className="mb-6 p-4 bg-rose-100 border border-rose-200 rounded-xl animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-rose-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-rose-800">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-serif font-medium text-stone-900">
                    {stats.total_users.toLocaleString()}
                  </p>
                  <p className="text-sm text-stone-500 mt-1">Total Users</p>
                  <p className="text-xs text-stone-400 mt-1">
                    {stats.active_user_percentage}% active in last 7 days
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm ${stats.failed_syncs === 0 ? 'text-green-600' : 'text-rose-600'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                          stats.failed_syncs === 0
                            ? 'M5 10l7-7m0 0l7 7m-7-7v18'
                            : 'M19 14l-7 7m0 0l-7-7m7 7V3'
                        }
                      />
                    </svg>
                    <span>
                      {stats.failed_syncs > 0 ? `${stats.failed_syncs} failed` : 'All good'}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-serif font-medium text-stone-900">
                    {stats.sync_success_rate}%
                  </p>
                  <p className="text-sm text-stone-500 mt-1">Sync Health</p>
                  <p className="text-xs text-stone-400 mt-1">
                    {stats.successful_syncs_24h.toLocaleString()} syncs in last 24h
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                      />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-serif font-medium text-stone-900">
                    {stats.total_storage_mb.toFixed(1)} MB
                  </p>
                  <p className="text-sm text-stone-500 mt-1">Storage Used</p>
                  <p className="text-xs text-stone-400 mt-1">
                    {stats.total_sync_operations.toLocaleString()} operations
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm ${stats.suspended_users === 0 ? 'text-green-600' : 'text-rose-600'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                          stats.suspended_users === 0
                            ? 'M5 10l7-7m0 0l7 7m-7-7v18'
                            : 'M19 14l-7 7m0 0l-7-7m7 7V3'
                        }
                      />
                    </svg>
                    <span>
                      {stats.suspended_users > 0
                        ? `${stats.suspended_users} suspended`
                        : 'No issues'}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-serif font-medium text-stone-900">
                    {stats.recent_audit_logs_24h.toLocaleString()}
                  </p>
                  <p className="text-sm text-stone-500 mt-1">Audit Events</p>
                  <p className="text-xs text-stone-400 mt-1">In last 24 hours</p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm">
                <div className="p-6 border-b border-stone-100">
                  <h3 className="font-serif text-lg font-medium text-stone-900">Recent Activity</h3>
                </div>
                <div className="divide-y divide-stone-100">
                  {auditLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="p-4 hover:bg-stone-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-medium border ${getSeverityColor(log.severity)}`}
                        >
                          {log.severity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-stone-900 truncate">{log.action}</p>
                          <p className="text-sm text-stone-500">
                            by {log.actor_email || log.actor_id?.slice(0, 8) || 'System'}
                          </p>
                        </div>
                        <span className="text-xs text-stone-400 whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div className="p-8 text-center text-stone-500">No recent activity</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
                <h3 className="font-serif text-lg font-medium text-stone-900 mb-6">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('users')}
                    className="w-full flex items-center gap-3 p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors text-left group"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">Manage Users</p>
                      <p className="text-xs text-stone-500">View and edit accounts</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="w-full flex items-center gap-3 p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors text-left group"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">View Analytics</p>
                      <p className="text-xs text-stone-500">Usage insights</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('audit')}
                    className="w-full flex items-center gap-3 p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors text-left group"
                  >
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">Audit Logs</p>
                      <p className="text-xs text-stone-500">Security events</p>
                    </div>
                  </button>

                  <button
                    onClick={fetchStats}
                    className="w-full flex items-center gap-3 p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors text-left group"
                  >
                    <div className="w-10 h-10 bg-stone-200 rounded-lg flex items-center justify-center text-stone-600 group-hover:scale-110 transition-transform">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">Refresh Data</p>
                      <p className="text-xs text-stone-500">Update statistics</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fade-in">
            <div className="mb-8">
              <h2 className="font-serif text-2xl font-medium text-stone-900">Analytics Overview</h2>
              <p className="text-stone-500 mt-1">Key metrics and user activity trends</p>
            </div>

            {activityMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-serif font-medium text-stone-900">
                      {activityMetrics.dau.toLocaleString()}
                    </p>
                    <p className="text-sm text-stone-500 mt-1">Daily Active Users</p>
                    <p className="text-xs text-stone-400 mt-1">
                      {activityMetrics.dau_wau_ratio}% of weekly active
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-serif font-medium text-stone-900">
                      {activityMetrics.wau.toLocaleString()}
                    </p>
                    <p className="text-sm text-stone-500 mt-1">Weekly Active Users</p>
                    <p className="text-xs text-stone-400 mt-1">
                      {activityMetrics.wau_mau_ratio}% of monthly active
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-serif font-medium text-stone-900">
                      {activityMetrics.mau.toLocaleString()}
                    </p>
                    <p className="text-sm text-stone-500 mt-1">Monthly Active Users</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
                <h3 className="font-serif text-lg font-medium text-stone-900 mb-6">
                  User Growth (30 Days)
                </h3>
                <div className="h-80">
                  {growthData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={growthData}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.amber} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={CHART_COLORS.amber} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={date =>
                            new Date(date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          }
                          stroke="#a8a29e"
                          fontSize={12}
                        />
                        <YAxis stroke="#a8a29e" fontSize={12} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="total_users"
                          name="Total Users"
                          stroke={CHART_COLORS.amber}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorUsers)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-stone-400">
                      <div className="text-center">
                        <svg
                          className="w-12 h-12 mx-auto mb-3 text-stone-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                          />
                        </svg>
                        <p>No growth data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
                <h3 className="font-serif text-lg font-medium text-stone-900 mb-6">
                  Plan Distribution
                </h3>
                <div className="h-80">
                  {planDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={planDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {planDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-stone-400">
                      <div className="text-center">
                        <svg
                          className="w-12 h-12 mx-auto mb-3 text-stone-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                          />
                        </svg>
                        <p>No plan data available</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  {planDistribution.map(entry => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-stone-600">
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {storageAnalytics && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
                <h3 className="font-serif text-lg font-medium text-stone-900 mb-6">
                  Storage Analytics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-6 bg-stone-50 rounded-xl">
                    <p className="text-sm text-stone-500 mb-1">Total Storage</p>
                    <p className="text-3xl font-serif font-medium text-stone-900">
                      {storageAnalytics.total_gb.toFixed(2)} GB
                    </p>
                  </div>
                  <div className="p-6 bg-stone-50 rounded-xl">
                    <p className="text-sm text-stone-500 mb-1">Average per User</p>
                    <p className="text-3xl font-serif font-medium text-stone-900">
                      {storageAnalytics.avg_per_user_mb.toFixed(2)} MB
                    </p>
                  </div>
                  <div className="p-6 bg-stone-50 rounded-xl">
                    <p className="text-sm text-stone-500 mb-1">Active Storage Users</p>
                    <p className="text-3xl font-serif font-medium text-stone-900">
                      {storageAnalytics.top_consumers.length}
                    </p>
                  </div>
                </div>

                {storageAnalytics.top_consumers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-stone-700 mb-4">
                      Top Storage Consumers
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={storageAnalytics.top_consumers.slice(0, 10)}
                          layout="vertical"
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e7e5e4"
                            horizontal={false}
                          />
                          <XAxis type="number" stroke="#a8a29e" fontSize={12} />
                          <YAxis
                            dataKey="user_id"
                            type="category"
                            width={80}
                            tickFormatter={id => id.slice(0, 8) + '...'}
                            stroke="#a8a29e"
                            fontSize={11}
                          />
                          <Tooltip />
                          <Bar dataKey="mb" fill={CHART_COLORS.amber} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in">
            <div className="mb-8">
              <h2 className="font-serif text-2xl font-medium text-stone-900">User Management</h2>
              <p className="text-stone-500 mt-1">{usersPagination.total} total users</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 flex flex-wrap gap-3">
                  <input
                    type="text"
                    placeholder="Search by email..."
                    value={userFilters.search}
                    onChange={e => setUserFilters({ ...userFilters, search: e.target.value })}
                    onKeyPress={e => e.key === 'Enter' && fetchUsers()}
                    className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all min-w-[200px] flex-1"
                  />
                  <select
                    value={userFilters.role}
                    onChange={e => setUserFilters({ ...userFilters, role: e.target.value })}
                    className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  >
                    <option value="">All Roles</option>
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    value={userFilters.status}
                    onChange={e => setUserFilters({ ...userFilters, status: e.target.value })}
                    className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <select
                    value={userFilters.plan}
                    onChange={e => setUserFilters({ ...userFilters, plan: e.target.value })}
                    className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  >
                    <option value="">All Plans</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <button
                    onClick={fetchUsers}
                    className="px-6 py-2.5 bg-stone-900 text-stone-50 rounded-xl hover:bg-stone-800 transition-all duration-300 text-sm font-medium"
                  >
                    Filter
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {selectedUsers.size > 0 && (
                    <>
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            bulkUpdateRole(e.target.value, 'Bulk role update');
                            e.target.value = '';
                          }
                        }}
                        className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900"
                      >
                        <option value="">Change Role ({selectedUsers.size})</option>
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            bulkUpdateStatus(e.target.value, 'Bulk status update');
                            e.target.value = '';
                          }
                        }}
                        className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900"
                      >
                        <option value="">Change Status ({selectedUsers.size})</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </>
                  )}
                  <button
                    onClick={exportUsersToCSV}
                    className="px-6 py-2.5 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-all duration-300 text-sm font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-stone-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-stone-600">Loading...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200">
                          <th className="px-6 py-4 text-left">
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                            />
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                            Plan
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                            Storage
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                            Last Active
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {users.map(user => (
                          <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedUsers.has(user.id)}
                                onChange={() => toggleUserSelection(user.id)}
                                className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white text-sm font-medium">
                                  {user.email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-stone-900">{user.email}</p>
                                  <p className="text-xs text-stone-500 font-mono">
                                    {user.id.slice(0, 8)}...
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={user.role}
                                onChange={e =>
                                  updateUserRole(user.id, e.target.value, 'Admin update')
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${getRoleColor(user.role)} focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer`}
                              >
                                <option value="user">User</option>
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${getPlanColor(user.plan)}`}
                              >
                                {user.plan}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={user.status}
                                onChange={e =>
                                  updateUserStatus(user.id, e.target.value, 'Admin update')
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${getStatusColor(user.status)} focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer`}
                              >
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-stone-600">
                                {formatBytes(user.storage_bytes)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-stone-500">
                                {formatDate(user.last_active_at)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openUserModal(user)}
                                  className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                                >
                                  View Details
                                </button>
                                <button
                                  onClick={() =>
                                    updateUserStatus(
                                      user.id,
                                      user.status === 'suspended' ? 'active' : 'suspended',
                                      user.status === 'suspended'
                                        ? 'Reactivated by admin'
                                        : 'Suspended by admin'
                                    )
                                  }
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${user.status === 'suspended' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                                >
                                  {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
                    <p className="text-sm text-stone-500">
                      Page {usersPagination.page} of {usersPagination.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setUsersPagination({ ...usersPagination, page: usersPagination.page - 1 })
                        }
                        disabled={usersPagination.page <= 1}
                        className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setUsersPagination({ ...usersPagination, page: usersPagination.page + 1 })
                        }
                        disabled={usersPagination.page >= usersPagination.totalPages}
                        className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-fade-in">
            <div className="mb-8">
              <h2 className="font-serif text-2xl font-medium text-stone-900">Audit Logs</h2>
              <p className="text-stone-500 mt-1">System activity and security events</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
              <div className="flex flex-wrap gap-3">
                <select
                  value={logFilters.severity}
                  onChange={e => setLogFilters({ ...logFilters, severity: e.target.value })}
                  className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                >
                  <option value="">All Severities</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
                <button
                  onClick={fetchAuditLogs}
                  className="px-6 py-2.5 bg-stone-900 text-stone-50 rounded-xl hover:bg-stone-800 transition-all duration-300 text-sm font-medium"
                >
                  Filter
                </button>
                <button
                  onClick={exportAuditLogsToCSV}
                  className="px-6 py-2.5 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-all duration-300 text-sm font-medium flex items-center gap-2 ml-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-stone-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-stone-600">Loading...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-stone-100">
                    {auditLogs.map(log => (
                      <div key={log.id} className="p-6 hover:bg-stone-50 transition-colors">
                        <div className="flex items-start gap-4">
                          <span
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${getSeverityColor(log.severity)}`}
                          >
                            {log.severity}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-stone-900">{log.action}</p>
                            {log.resource_type && (
                              <p className="text-sm text-stone-500">
                                {log.resource_type}: {log.resource_id?.slice(0, 8)}...
                              </p>
                            )}
                            <p className="text-xs text-stone-400 mt-1">
                              by {log.actor_email || log.actor_id?.slice(0, 8) || 'System'}
                            </p>
                            {log.new_value && (
                              <div className="mt-3 p-3 bg-stone-100 rounded-lg">
                                <pre className="text-xs text-stone-600 overflow-x-auto">
                                  {JSON.stringify(log.new_value, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-stone-400 whitespace-nowrap">
                            {formatDateTime(log.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <div className="p-12 text-center text-stone-500">
                        <svg
                          className="w-12 h-12 mx-auto mb-3 text-stone-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        <p>No audit logs found</p>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
                    <p className="text-sm text-stone-500">
                      Page {logsPagination.page} of {logsPagination.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setLogsPagination({ ...logsPagination, page: logsPagination.page - 1 })
                        }
                        disabled={logsPagination.page <= 1}
                        className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setLogsPagination({ ...logsPagination, page: logsPagination.page + 1 })
                        }
                        disabled={logsPagination.page >= logsPagination.totalPages}
                        className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Activity Modal */}
      {showUserModal && selectedUser && userActivityDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-stone-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white text-xl font-medium">
                    {selectedUser.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-medium text-stone-900">
                      {selectedUser.email}
                    </h2>
                    <p className="text-sm text-stone-500 font-mono">{selectedUser.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-stone-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex gap-2 mt-6">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'activity', label: 'Activity Timeline' },
                  { id: 'sessions', label: 'Sessions' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveModalTab(tab.id as typeof activeModalTab)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${activeModalTab === tab.id ? 'bg-amber-100 text-amber-900' : 'text-stone-600 hover:bg-stone-100'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {activeModalTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 bg-stone-50 rounded-xl">
                      <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Role</p>
                      <p className="font-medium text-stone-900 capitalize">
                        {userActivityDetails.profile.role}
                      </p>
                    </div>
                    <div className="p-5 bg-stone-50 rounded-xl">
                      <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Plan</p>
                      <p className="font-medium text-stone-900 capitalize">
                        {userActivityDetails.profile.plan}
                      </p>
                    </div>
                    <div className="p-5 bg-stone-50 rounded-xl">
                      <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Status</p>
                      <p className="font-medium text-stone-900 capitalize">
                        {userActivityDetails.profile.status}
                      </p>
                    </div>
                    <div className="p-5 bg-stone-50 rounded-xl">
                      <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Joined</p>
                      <p className="font-medium text-stone-900">
                        {formatDate(userActivityDetails.profile.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-stone-50 rounded-xl p-6">
                    <h4 className="font-serif text-lg font-medium text-stone-900 mb-4">
                      Storage Usage
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-3xl font-serif font-medium text-stone-900">
                          {userActivityDetails.storage.total_blobs}
                        </p>
                        <p className="text-sm text-stone-500">Total Blobs</p>
                      </div>
                      <div>
                        <p className="text-3xl font-serif font-medium text-stone-900">
                          {userActivityDetails.storage.total_mb.toFixed(2)} MB
                        </p>
                        <p className="text-sm text-stone-500">Storage Used</p>
                      </div>
                      <div>
                        <p className="text-3xl font-serif font-medium text-stone-900">
                          {formatDate(userActivityDetails.storage.oldest_blob)}
                        </p>
                        <p className="text-sm text-stone-500">First Upload</p>
                      </div>
                      <div>
                        <p className="text-3xl font-serif font-medium text-stone-900">
                          {formatDate(userActivityDetails.storage.newest_blob)}
                        </p>
                        <p className="text-sm text-stone-500">Last Upload</p>
                      </div>
                    </div>
                  </div>

                  {userActivityDetails.devices.length > 0 && (
                    <div>
                      <h4 className="font-serif text-lg font-medium text-stone-900 mb-4">
                        Devices ({userActivityDetails.devices.length})
                      </h4>
                      <div className="space-y-3">
                        {userActivityDetails.devices.slice(0, 5).map(device => (
                          <div
                            key={device.id}
                            className="flex items-center justify-between p-4 bg-stone-50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl shadow-sm">
                                {device.device_type === 'mobile' ? '📱' : '💻'}
                              </div>
                              <span className="font-medium text-stone-900">
                                {device.device_name}
                              </span>
                            </div>
                            <span className="text-sm text-stone-500">
                              {formatDateTime(device.last_synced_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-stone-200">
                    <button
                      onClick={() => revokeAllSessions(selectedUser.id)}
                      className="px-5 py-2.5 bg-rose-100 text-rose-700 rounded-xl hover:bg-rose-200 transition-colors text-sm font-medium"
                    >
                      Force Logout All Sessions
                    </button>
                    <button
                      onClick={() =>
                        updateUserStatus(
                          selectedUser.id,
                          selectedUser.status === 'suspended' ? 'active' : 'suspended',
                          'Admin action'
                        )
                      }
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${selectedUser.status === 'suspended' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                    >
                      {selectedUser.status === 'suspended'
                        ? 'Reactivate Account'
                        : 'Suspend Account'}
                    </button>
                  </div>
                </div>
              )}

              {activeModalTab === 'activity' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-serif text-lg font-medium text-stone-900 mb-4">
                      Recent Activity
                    </h4>
                    {userActivityDetails.audit_history.length === 0 ? (
                      <p className="text-stone-500">No recent activity found.</p>
                    ) : (
                      <div className="space-y-3">
                        {userActivityDetails.audit_history.map(log => (
                          <div key={log.id} className="p-5 bg-stone-50 rounded-xl">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-stone-900">{log.action}</p>
                                <p className="text-sm text-stone-500">
                                  by {log.actor_email || 'System'}
                                </p>
                                {log.new_value && Object.keys(log.new_value).length > 0 && (
                                  <div className="mt-3 p-3 bg-white rounded-lg">
                                    <pre className="text-xs text-stone-600 overflow-x-auto">
                                      {JSON.stringify(log.new_value, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                              <span
                                className={`px-3 py-1 rounded-lg text-xs font-medium border ${getSeverityColor(log.severity)}`}
                              >
                                {log.severity}
                              </span>
                            </div>
                            <p className="text-xs text-stone-400 mt-3">
                              {formatDateTime(log.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-serif text-lg font-medium text-stone-900 mb-4">
                      Sync History
                    </h4>
                    {userActivityDetails.sync_history.length === 0 ? (
                      <p className="text-stone-500">No sync history found.</p>
                    ) : (
                      <div className="space-y-3">
                        {userActivityDetails.sync_history.slice(0, 10).map((sync, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 bg-stone-50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-3 h-3 rounded-full ${sync.sync_status === 'idle' ? 'bg-green-500' : 'bg-amber-500'}`}
                              />
                              <span className="text-sm text-stone-700">
                                Version {sync.last_sync_version}
                              </span>
                            </div>
                            <span className="text-sm text-stone-500">
                              {formatDateTime(sync.last_synced_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeModalTab === 'sessions' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif text-lg font-medium text-stone-900">
                      Active Sessions
                    </h4>
                    <button
                      onClick={() => revokeAllSessions(selectedUser.id)}
                      className="px-4 py-2 bg-rose-100 text-rose-700 rounded-xl hover:bg-rose-200 transition-colors text-sm font-medium"
                    >
                      Revoke All
                    </button>
                  </div>

                  {userSessions.length === 0 ? (
                    <p className="text-stone-500">No active sessions found.</p>
                  ) : (
                    <div className="space-y-3">
                      {userSessions.map(session => (
                        <div key={session.session_id} className="p-5 bg-stone-50 rounded-xl">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-stone-900">
                                  {(session.device_info?.device_name as string) || 'Unknown Device'}
                                </p>
                                {session.is_current_session && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-lg border border-amber-200">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-stone-500">IP: {session.ip_address}</p>
                              <p className="text-xs text-stone-400 mt-1">{session.user_agent}</p>
                              <div className="flex gap-4 mt-3 text-xs text-stone-500">
                                <span>Created: {formatDateTime(session.created_at)}</span>
                                <span>Last Active: {formatDateTime(session.last_active_at)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => revokeSession(session.session_id)}
                              className="px-4 py-2 text-rose-600 hover:bg-rose-100 rounded-xl text-sm font-medium transition-colors"
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminProtectedLayout>
  );
}
