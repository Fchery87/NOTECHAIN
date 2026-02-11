'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'general' | 'security' | 'account'>('general');
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weekly: true,
  });
  const [theme, setTheme] = useState('light');

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <a href="/dashboard" className="font-serif text-2xl font-medium text-stone-900">
                NoteChain
              </a>
              <span className="text-stone-300">/</span>
              <span className="text-lg text-stone-700">Settings</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <nav className="space-y-1">
              {[
                { id: 'general', label: 'General', icon: '⚙️' },
                { id: 'security', label: 'Security', icon: '🔒' },
                { id: 'account', label: 'Account', icon: '👤' },
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <span>{section.icon}</span>
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200">
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

              {activeSection === 'security' && (
                <div className="p-6">
                  <h2 className="text-xl font-medium text-stone-900 mb-6">Security Settings</h2>

                  {/* Encryption Status */}
                  <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-green-900">End-to-End Encryption Active</p>
                        <p className="text-sm text-green-700">
                          Your data is encrypted with XSalsa20-Poly1305
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Encryption Key */}
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-stone-700 mb-3">
                      Encryption Key
                    </label>
                    <div className="flex gap-3">
                      <div className="flex-1 px-4 py-3 bg-stone-100 rounded-lg font-mono text-sm text-stone-600 truncate">
                        ••••••••••••••••••••••••••••••••
                      </div>
                      <button className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors">
                        Export
                      </button>
                    </div>
                    <p className="text-xs text-stone-500 mt-2">
                      Never share your encryption key. Keep it safe.
                    </p>
                  </div>

                  {/* Two Factor Auth */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                      <div>
                        <p className="font-medium text-stone-900">Two-Factor Authentication</p>
                        <p className="text-sm text-stone-500">Add an extra layer of security</p>
                      </div>
                      <button className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors">
                        Enable
                      </button>
                    </div>
                  </div>

                  {/* Session Management */}
                  <div>
                    <h3 className="font-medium text-stone-900 mb-3">Active Sessions</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-stone-200 rounded-full flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-stone-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-stone-900">Current Session</p>
                            <p className="text-sm text-stone-500">MacBook Pro • Chrome • Now</p>
                          </div>
                        </div>
                        <span className="text-xs text-green-600 font-medium">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
      </main>
    </div>
  );
}
