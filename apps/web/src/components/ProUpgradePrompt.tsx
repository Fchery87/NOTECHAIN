import React from 'react';
import type { FeatureType, FeatureConfig, SubscriptionTier } from '../lib/featureGate';

/**
 * Props for ProUpgradePrompt component
 */
export interface ProUpgradePromptProps {
  feature: FeatureType;
  config?: FeatureConfig;
  requiredTier?: SubscriptionTier;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

/**
 * Pro upgrade prompt component
 * Displays when user tries to access Pro feature
 * Shows feature details and upgrade CTA
 * FR-MON-01: Free tier with Pro upgrades
 */
export function ProUpgradePrompt({
  feature,
  config,
  requiredTier = 'pro',
  onUpgrade,
  onDismiss,
  compact = false,
}: ProUpgradePromptProps) {
  if (!config) {
    const { FeatureGate } = require('../lib/featureGate');
    config = FeatureGate.getFeatureConfig(feature);
  }

  const isPremium = requiredTier === 'premium';

  return (
    <div
      className={`
        bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200
        rounded-2xl ${compact ? 'p-6' : 'p-8'}
        animate-in fade-in slide-in-from-bottom-4 duration-300
      `}
    >
      {compact ? (
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-stone-900">
              {isPremium ? 'Premium Feature' : 'Pro Feature'}
            </h3>
            <p className="text-sm text-stone-600 mt-1">
              {config?.name} requires {isPremium ? 'Premium' : 'Pro'} subscription
            </p>
            <p className="text-xs text-stone-500 mt-2 line-clamp-2">{config?.description}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-stone-900">Unlock {config?.name}</h2>
              <p className="text-stone-600 mt-2">
                {isPremium
                  ? 'This is a Premium add-on feature'
                  : 'This feature requires Pro subscription'}
              </p>
            </div>
          </div>

          {/* Feature details */}
          <div className="bg-white rounded-xl p-6 border border-stone-200">
            <div className="flex items-center gap-3 mb-4">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <div>
                <h3 className="font-bold text-stone-900">{config?.name}</h3>
                <p className="text-sm text-stone-500 mt-1">{config?.description}</p>
              </div>
            </div>

            {/* Included features */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-stone-700">
                {isPremium ? 'Premium includes:' : 'Pro includes:'}
              </h4>
              <ul className="space-y-2 text-sm text-stone-600">
                {isPremium ? (
                  <>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      All Pro features
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Weekly analytics reports
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Note templates & custom themes
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Unlimited folders & tags
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      PDF signing & annotations
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Advanced full-text search
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Multi-device sync
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Calendar integration
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      2GB encrypted storage
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl p-6 border border-stone-200">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="text-3xl font-bold text-stone-900">
                  ${isPremium ? '14.99' : '4.99'}
                </span>
                <span className="text-lg text-stone-500">/mo</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-stone-500 line-through">
                  ${isPremium ? '49.99' : '9.99'}
                </span>
                <span className="ml-2 text-sm font-bold text-green-600">
                  Save ${isPremium ? '35' : '50'}%
                </span>
              </div>
            </div>

            {/* Annual billing */}
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-amber-600"
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
                  <span className="font-semibold text-stone-900">Annual billing</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-stone-900">
                    ${isPremium ? '149.99' : '49.99'}
                  </span>
                  <span className="text-sm text-stone-500">/yr</span>
                </div>
              </div>
              <p className="text-xs text-stone-600 mt-2">Save 17% with annual billing</p>
            </div>

            {/* CTA buttons */}
            <div className="mt-6 space-y-3">
              <button
                onClick={onUpgrade}
                className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Upgrade to {isPremium ? 'Premium' : 'Pro'}
              </button>

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="w-full py-3 px-6 bg-white text-stone-600 font-medium rounded-xl hover:bg-stone-50 border border-stone-200 transition-all duration-200"
                >
                  Maybe later
                </button>
              )}
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-stone-400">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>Encrypted</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Audited</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProUpgradePrompt;
