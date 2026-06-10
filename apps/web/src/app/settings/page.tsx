'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/supabase/UserProvider';
import { SecuritySettingsPanel } from './_components/SecuritySettingsPanel';

type SettingsSection = 'profile' | 'preferences' | 'security' | 'account';
type ThemePreference = 'light' | 'dark' | 'system';
type DensityPreference = 'comfortable' | 'compact';

type UserPlan = 'free' | 'pro' | 'enterprise';
type UserStatus = 'active' | 'suspended' | 'inactive';

type NotificationPreferences = {
  productUpdates: boolean;
  securityAlerts: boolean;
  weeklyDigest: boolean;
  sharedWorkspaceActivity: boolean;
};

type SettingsPreferences = {
  theme: ThemePreference;
  density: DensityPreference;
  autoSave: boolean;
  privateModeByDefault: boolean;
  notifications: NotificationPreferences;
};

type ProfileRecord = {
  role?: 'user' | 'moderator' | 'admin' | 'owner';
  plan?: UserPlan;
  status?: UserStatus;
  created_at?: string;
  last_active_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type Toast = { tone: 'success' | 'error'; message: string } | null;

const DEFAULT_PREFERENCES: SettingsPreferences = {
  theme: 'system',
  density: 'comfortable',
  autoSave: true,
  privateModeByDefault: false,
  notifications: {
    productUpdates: true,
    securityAlerts: true,
    weeklyDigest: true,
    sharedWorkspaceActivity: false,
  },
};

const STORAGE_KEY = 'notechain:user-settings';

function readStoredPreferences(): Partial<SettingsPreferences> | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<SettingsPreferences>) : null;
  } catch {
    return null;
  }
}

function mergePreferences(...sources: Array<Partial<SettingsPreferences> | null | undefined>) {
  return sources.reduce<SettingsPreferences>((acc, source) => {
    if (!source) return acc;

    return {
      ...acc,
      ...source,
      notifications: {
        ...acc.notifications,
        ...(source.notifications || {}),
      },
    };
  }, DEFAULT_PREFERENCES);
}

function initialsFor(nameOrEmail: string) {
  const label = nameOrEmail.trim();
  if (!label) return 'U';

  const parts = label.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function formatDate(dateString?: string | null) {
  if (!dateString) return 'Not recorded';
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="font-serif text-xl font-medium text-stone-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-stone-50 p-4">
      <div>
        <p className="font-medium text-stone-900">{label}</p>
        <p className="text-sm text-stone-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-amber-600' : 'bg-stone-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function Badge({
  children,
  tone = 'stone',
}: {
  children: ReactNode;
  tone?: 'stone' | 'amber' | 'green' | 'rose' | 'blue' | 'purple';
}) {
  const tones = {
    stone: 'bg-stone-100 text-stone-700 border-stone-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    rose: 'bg-rose-100 text-rose-800 border-rose-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export default function SettingsPage() {
  const { user, role, signOut } = useUser();
  const supabase = useMemo(() => createClient(), []);

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [preferences, setPreferences] = useState<SettingsPreferences>(DEFAULT_PREFERENCES);
  const [toast, setToast] = useState<Toast>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const fallbackName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.given_name ||
    user?.email?.split('@')[0] ||
    'User';

  useEffect(() => {
    setDisplayName(String(fallbackName || ''));
  }, [fallbackName]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) {
        setIsProfileLoading(false);
        return;
      }

      setIsProfileLoading(true);
      const stored = readStoredPreferences();

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, plan, status, created_at, last_active_at, metadata')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn('[Settings] Failed to load profile metadata:', error);
          setToast({
            tone: 'error',
            message: 'Could not load profile details. Showing account defaults.',
          });
          setPreferences(mergePreferences(stored));
          return;
        }

        const typedProfile = (data || null) as ProfileRecord | null;
        const metadata = typedProfile?.metadata || {};
        const storedSettings = metadata.settings as Partial<SettingsPreferences> | undefined;
        const metadataDisplayName = metadata.display_name;

        setProfile(typedProfile);
        setPreferences(mergePreferences(storedSettings, stored));

        if (typeof metadataDisplayName === 'string' && metadataDisplayName.trim()) {
          setDisplayName(metadataDisplayName);
        }
      } finally {
        if (!cancelled) setIsProfileLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const nextName = displayName.trim();
    if (!nextName) {
      setToast({ tone: 'error', message: 'Display name cannot be empty.' });
      return;
    }

    setIsSavingProfile(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          full_name: nextName,
          name: nextName,
        },
      });

      if (authError) throw authError;

      if (profile) {
        const nextMetadata = {
          ...(profile.metadata || {}),
          display_name: nextName,
          settings: preferences,
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ metadata: nextMetadata })
          .eq('id', user.id);

        if (profileError) {
          console.warn('[Settings] Profile metadata update failed:', profileError);
        } else {
          setProfile({ ...profile, metadata: nextMetadata });
        }
      }

      setToast({ tone: 'success', message: 'Profile updated.' });
    } catch (error) {
      setToast({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to update profile.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setIsSavingPreferences(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

      if (profile) {
        const nextMetadata = {
          ...(profile.metadata || {}),
          settings: preferences,
          display_name: displayName.trim() || fallbackName,
        };

        const { error } = await supabase
          .from('profiles')
          .update({ metadata: nextMetadata })
          .eq('id', user.id);
        if (error) {
          console.warn('[Settings] Could not persist preferences to profile metadata:', error);
        } else {
          setProfile({ ...profile, metadata: nextMetadata });
        }
      }

      setToast({ tone: 'success', message: 'Preferences saved on this device.' });
    } catch (error) {
      setToast({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to save preferences.',
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const updatePreference = <K extends keyof SettingsPreferences>(
    key: K,
    value: SettingsPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const updateNotification = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    window.location.href = '/auth/login';
  };

  const planTone =
    profile?.plan === 'enterprise' ? 'blue' : profile?.plan === 'pro' ? 'amber' : 'stone';
  const statusTone =
    profile?.status === 'suspended' ? 'rose' : profile?.status === 'active' ? 'green' : 'stone';
  const effectiveRole = profile?.role || role || 'user';

  const sections: Array<{
    id: SettingsSection;
    label: string;
    description: string;
    icon: ReactNode;
  }> = [
    {
      id: 'profile',
      label: 'Profile',
      description: 'Identity and workspace details',
      icon: <UserIcon className="h-5 w-5" />,
    },
    {
      id: 'preferences',
      label: 'Preferences',
      description: 'Interface and notifications',
      icon: <SlidersIcon className="h-5 w-5" />,
    },
    {
      id: 'security',
      label: 'Security',
      description: 'Encryption, backups and sessions',
      icon: <ShieldIcon className="h-5 w-5" />,
    },
    {
      id: 'account',
      label: 'Account',
      description: 'Plan, access and danger zone',
      icon: <CreditCardIcon className="h-5 w-5" />,
    },
  ];

  return (
    <AppLayout pageTitle="Settings">
      <div className="space-y-6">
        <div className="rounded-3xl border border-stone-100 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-800 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-xl font-semibold text-white shadow-lg shadow-black/20">
                {initialsFor(displayName || user?.email || 'User')}
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-amber-200/80">
                  Personal Settings
                </p>
                <h1 className="mt-1 font-serif text-3xl font-medium">
                  {displayName || fallbackName}
                </h1>
                <p className="mt-1 text-sm text-stone-300">{user?.email || 'No email on file'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                tone={
                  effectiveRole === 'owner'
                    ? 'purple'
                    : effectiveRole === 'admin'
                      ? 'rose'
                      : effectiveRole === 'moderator'
                        ? 'amber'
                        : 'stone'
                }
              >
                {effectiveRole}
              </Badge>
              <Badge tone={planTone}>{profile?.plan || 'free'} plan</Badge>
              <Badge tone={statusTone}>{profile?.status || 'active'}</Badge>
            </div>
          </div>
        </div>

        {toast && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              toast.tone === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <nav className="space-y-2 rounded-2xl border border-stone-100 bg-white p-2 shadow-sm">
              {sections.map(section => (
                <button
                  type="button"
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                    activeSection === section.id
                      ? 'bg-stone-900 text-stone-50 shadow-sm'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <span
                    className={activeSection === section.id ? 'text-amber-300' : 'text-stone-400'}
                  >
                    {section.icon}
                  </span>
                  <span>
                    <span className="block font-medium">{section.label}</span>
                    <span
                      className={`mt-0.5 block text-xs ${
                        activeSection === section.id ? 'text-stone-300' : 'text-stone-500'
                      }`}
                    >
                      {section.description}
                    </span>
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="space-y-6">
            {activeSection === 'profile' && (
              <SectionCard
                title="Profile"
                description="Keep your visible account information accurate across NoteChain."
              >
                {isProfileLoading ? (
                  <div className="flex items-center justify-center py-16 text-stone-500">
                    <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
                    Loading profile…
                  </div>
                ) : (
                  <form onSubmit={saveProfile} className="space-y-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-stone-700">Display name</span>
                        <input
                          value={displayName}
                          onChange={event => setDisplayName(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                          placeholder="Your name"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-stone-700">Email</span>
                        <input
                          value={user?.email || ''}
                          readOnly
                          className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-500 outline-none"
                        />
                        <span className="mt-1 block text-xs text-stone-400">
                          Email changes are handled through your authentication provider.
                        </span>
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-xl bg-stone-50 p-4">
                        <p className="text-xs uppercase tracking-wider text-stone-500">Joined</p>
                        <p className="mt-1 font-medium text-stone-900">
                          {formatDate(profile?.created_at || user?.created_at)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-stone-50 p-4">
                        <p className="text-xs uppercase tracking-wider text-stone-500">
                          Last active
                        </p>
                        <p className="mt-1 font-medium text-stone-900">
                          {formatDate(profile?.last_active_at || user?.last_sign_in_at)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-stone-50 p-4">
                        <p className="text-xs uppercase tracking-wider text-stone-500">Access</p>
                        <p className="mt-1 font-medium capitalize text-stone-900">
                          {effectiveRole}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-stone-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-stone-500">
                        Profile metadata is non-sensitive. Notes and workspace content remain
                        encrypted.
                      </p>
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingProfile ? 'Saving…' : 'Save profile'}
                      </button>
                    </div>
                  </form>
                )}
              </SectionCard>
            )}

            {activeSection === 'preferences' && (
              <SectionCard
                title="Preferences"
                description="Set defaults for the app experience. Saved locally and mirrored to profile metadata when available."
              >
                <div className="space-y-8">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-stone-700">Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['light', 'dark', 'system'] as const).map(theme => (
                        <button
                          type="button"
                          key={theme}
                          onClick={() => updatePreference('theme', theme)}
                          className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                            preferences.theme === theme
                              ? 'border-stone-900 bg-stone-900 text-stone-50'
                              : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-medium text-stone-700">Density</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['comfortable', 'compact'] as const).map(density => (
                        <button
                          type="button"
                          key={density}
                          onClick={() => updatePreference('density', density)}
                          className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                            preferences.density === density
                              ? 'border-amber-500 bg-amber-50 text-amber-900'
                              : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          {density}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <Toggle
                      checked={preferences.autoSave}
                      onChange={value => updatePreference('autoSave', value)}
                      label="Autosave edits"
                      description="Save drafts automatically as you write."
                    />
                    <Toggle
                      checked={preferences.privateModeByDefault}
                      onChange={value => updatePreference('privateModeByDefault', value)}
                      label="Prefer private mode"
                      description="Default privacy-sensitive workflows to local-first mode when supported."
                    />
                    <Toggle
                      checked={preferences.notifications.securityAlerts}
                      onChange={value => updateNotification('securityAlerts', value)}
                      label="Security alerts"
                      description="Receive important security and account access notices."
                    />
                    <Toggle
                      checked={preferences.notifications.weeklyDigest}
                      onChange={value => updateNotification('weeklyDigest', value)}
                      label="Weekly digest"
                      description="Get a summary of completed tasks, meetings and notes."
                    />
                    <Toggle
                      checked={preferences.notifications.productUpdates}
                      onChange={value => updateNotification('productUpdates', value)}
                      label="Product updates"
                      description="Learn about new NoteChain features and improvements."
                    />
                    <Toggle
                      checked={preferences.notifications.sharedWorkspaceActivity}
                      onChange={value => updateNotification('sharedWorkspaceActivity', value)}
                      label="Shared workspace activity"
                      description="Notify me when teammates update shared spaces."
                    />
                  </div>

                  <div className="flex justify-end border-t border-stone-100 pt-6">
                    <button
                      type="button"
                      onClick={savePreferences}
                      disabled={isSavingPreferences}
                      className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingPreferences ? 'Saving…' : 'Save preferences'}
                    </button>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'security' && (
              <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
                <SecuritySettingsPanel />
              </div>
            )}

            {activeSection === 'account' && (
              <div className="space-y-6">
                <SectionCard
                  title="Plan and access"
                  description="Understand the account state admins and billing integrations use."
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-stone-100 bg-stone-50 p-5">
                      <p className="text-xs uppercase tracking-wider text-stone-500">Plan</p>
                      <p className="mt-2 text-2xl font-serif font-medium capitalize text-stone-900">
                        {profile?.plan || 'free'}
                      </p>
                      <p className="mt-1 text-sm text-stone-500">
                        Billing controls will appear here once Stripe is connected.
                      </p>
                    </div>
                    <div className="rounded-xl border border-stone-100 bg-stone-50 p-5">
                      <p className="text-xs uppercase tracking-wider text-stone-500">Status</p>
                      <p className="mt-2 text-2xl font-serif font-medium capitalize text-stone-900">
                        {profile?.status || 'active'}
                      </p>
                      <p className="mt-1 text-sm text-stone-500">
                        Suspensions and reactivation are admin-managed.
                      </p>
                    </div>
                    <div className="rounded-xl border border-stone-100 bg-stone-50 p-5">
                      <p className="text-xs uppercase tracking-wider text-stone-500">Role</p>
                      <p className="mt-2 text-2xl font-serif font-medium capitalize text-stone-900">
                        {effectiveRole}
                      </p>
                      <p className="mt-1 text-sm text-stone-500">
                        Controls admin dashboard visibility and permissions.
                      </p>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Account actions"
                  description="Session and data lifecycle controls."
                >
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="flex w-full items-center justify-between rounded-xl border border-stone-200 p-4 text-left transition hover:bg-stone-50 disabled:opacity-60"
                    >
                      <span>
                        <span className="block font-medium text-stone-900">Sign out</span>
                        <span className="text-sm text-stone-500">End this browser session.</span>
                      </span>
                      <span className="text-sm font-medium text-stone-700">
                        {isSigningOut ? 'Signing out…' : 'Sign out'}
                      </span>
                    </button>

                    <Link
                      href="mailto:support@notechain.app?subject=Account%20deletion%20request"
                      className="flex w-full items-center justify-between rounded-xl border border-rose-200 p-4 text-left transition hover:bg-rose-50"
                    >
                      <span>
                        <span className="block font-medium text-rose-900">
                          Request account deletion
                        </span>
                        <span className="text-sm text-rose-600">
                          Contact support to permanently delete your account and encrypted workspace
                          records.
                        </span>
                      </span>
                      <TrashIcon className="h-5 w-5 text-rose-600" />
                    </Link>
                  </div>
                </SectionCard>
              </div>
            )}
          </main>
        </div>
      </div>
    </AppLayout>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 12v4m0-4a2 2 0 100-4m0 4a2 2 0 100 4m6-10a2 2 0 100-4m0 4a2 2 0 100 4m0-4v10"
      />
    </svg>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
