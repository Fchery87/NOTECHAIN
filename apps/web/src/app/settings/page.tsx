'use client';

import { useState, type ReactNode } from 'react';
import AppLayout from '@/components/AppLayout';
import { SecuritySettingsPanel } from './_components/SecuritySettingsPanel';

type SettingsSection = 'general' | 'security' | 'account';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weekly: true,
  });
  const [theme, setTheme] = useState('light');

  return (
    <AppLayout>
      <div className="py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <nav className="space-y-1">
              {(
                [
                  {
                    id: 'general',
                    label: 'General',
                    icon: (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    ),
                  },
                  {
                    id: 'security',
                    label: 'Security',
                    icon: (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    ),
                  },
                  {
                    id: 'account',
                    label: 'Account',
                    icon: (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    ),
                  },
                ] satisfies Array<{ id: SettingsSection; label: string; icon: ReactNode }>
              ).map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    activeSection === section.id
                      ? 'bg-stone-900 text-stone-50 shadow-sm'
                      : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  <span
                    className={`${activeSection === section.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} transition-opacity`}
                  >
                    {section.icon}
                  </span>
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-3xl border border-stone-100 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              {activeSection === 'general' && (
                <div className="p-6">
                  <h2 className="text-xl font-medium text-stone-900 mb-6">General Settings</h2>

                  {/* Theme */}
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-stone-700 mb-3">Theme</label>
                    <div className="flex gap-3">
                      {['light', 'dark', 'system'].map(t => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                            theme === t
                              ? 'bg-stone-900 text-stone-50'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-stone-700 mb-3">
                      Notifications
                    </label>

                    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                      <div>
                        <p className="font-medium text-stone-900">Email Notifications</p>
                        <p className="text-sm text-stone-500">Receive updates about your account</p>
                      </div>
                      <button
                        onClick={() => setNotifications(prev => ({ ...prev, email: !prev.email }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notifications.email ? 'bg-amber-600' : 'bg-stone-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications.email ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                      <div>
                        <p className="font-medium text-stone-900">Push Notifications</p>
                        <p className="text-sm text-stone-500">
                          Get notified about important events
                        </p>
                      </div>
                      <button
                        onClick={() => setNotifications(prev => ({ ...prev, push: !prev.push }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notifications.push ? 'bg-amber-600' : 'bg-stone-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications.push ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                      <div>
                        <p className="font-medium text-stone-900">Weekly Digest</p>
                        <p className="text-sm text-stone-500">Get a summary of your week</p>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications(prev => ({ ...prev, weekly: !prev.weekly }))
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notifications.weekly ? 'bg-amber-600' : 'bg-stone-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications.weekly ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'security' && <SecuritySettingsPanel />}

              {activeSection === 'account' && (
                <div className="p-6">
                  <h2 className="text-xl font-medium text-stone-900 mb-6">Account Settings</h2>

                  {/* Profile */}
                  <div className="mb-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl font-medium text-amber-700">JD</span>
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">John Doe</p>
                        <p className="text-sm text-stone-500">john.doe@example.com</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          defaultValue="John Doe"
                          className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          defaultValue="john.doe@example.com"
                          className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>

                      <button className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors">
                        Save Changes
                      </button>
                    </div>
                  </div>

                  {/* Plan */}
                  <div className="mb-8 pt-8 border-t border-stone-200">
                    <h3 className="font-medium text-stone-900 mb-4">Subscription</h3>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-amber-900">Pro Plan</p>
                          <p className="text-sm text-amber-700">
                            $9.99/month • Renews Jan 15, 2025
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-amber-200 text-amber-800 text-xs font-medium rounded-full">
                          Active
                        </span>
                      </div>
                      <div className="mt-4 flex gap-3">
                        <button className="text-sm text-amber-700 hover:text-amber-800 font-medium">
                          Manage Subscription
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-8 border-t border-stone-200">
                    <h3 className="font-medium text-red-600 mb-4">Danger Zone</h3>
                    <div className="space-y-3">
                      <button className="w-full flex items-center justify-between p-4 border border-red-200 rounded-lg text-left hover:bg-red-50 transition-colors">
                        <div>
                          <p className="font-medium text-red-900">Delete Account</p>
                          <p className="text-sm text-red-600">
                            Permanently delete your account and all data
                          </p>
                        </div>
                        <svg
                          className="w-5 h-5 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
