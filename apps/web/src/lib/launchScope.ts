export type LaunchFeatureKey =
  | 'encrypted_notes'
  | 'local_first_sync'
  | 'recovery_keys'
  | 'import_export'
  | 'local_search'
  | 'quick_capture'
  | 'pdf_signing'
  | 'calendar_sync'
  | 'local_ai_models'
  | 'admin_analytics'
  | 'custom_realtime_collaboration'
  | 'blockchain_storage';

export interface LaunchFeatureConfig {
  key: LaunchFeatureKey;
  label: string;
  defaultEnabled: boolean;
  heavy: boolean;
  experimental: boolean;
  rationale: string;
}

export const LAUNCH_FEATURES: Record<LaunchFeatureKey, LaunchFeatureConfig> = {
  encrypted_notes: {
    key: 'encrypted_notes',
    label: 'Encrypted notes',
    defaultEnabled: true,
    heavy: false,
    experimental: false,
    rationale: 'Core launch wedge.',
  },
  local_first_sync: {
    key: 'local_first_sync',
    label: 'Local-first sync',
    defaultEnabled: true,
    heavy: false,
    experimental: false,
    rationale: 'Core trust-first behavior.',
  },
  recovery_keys: {
    key: 'recovery_keys',
    label: 'Recovery keys',
    defaultEnabled: true,
    heavy: false,
    experimental: false,
    rationale: 'Required for trustworthy encryption lifecycle.',
  },
  import_export: {
    key: 'import_export',
    label: 'Import/export',
    defaultEnabled: true,
    heavy: false,
    experimental: false,
    rationale: 'Required for portability.',
  },
  local_search: {
    key: 'local_search',
    label: 'Local search',
    defaultEnabled: true,
    heavy: false,
    experimental: false,
    rationale: 'Trustworthy retrieval over local data.',
  },
  quick_capture: {
    key: 'quick_capture',
    label: 'Quick capture',
    defaultEnabled: true,
    heavy: false,
    experimental: false,
    rationale: 'Lightweight capture improvement.',
  },
  pdf_signing: {
    key: 'pdf_signing',
    label: 'PDF signing/workflows',
    defaultEnabled: false,
    heavy: true,
    experimental: true,
    rationale: 'Defer heavy PDF workflows until core trust wedge is stable.',
  },
  calendar_sync: {
    key: 'calendar_sync',
    label: 'Broad calendar sync',
    defaultEnabled: false,
    heavy: true,
    experimental: true,
    rationale: 'OAuth/sync complexity is outside launch wedge.',
  },
  local_ai_models: {
    key: 'local_ai_models',
    label: 'Heavy local AI models',
    defaultEnabled: false,
    heavy: true,
    experimental: true,
    rationale: 'Avoid large model bundles on core routes.',
  },
  admin_analytics: {
    key: 'admin_analytics',
    label: 'Admin analytics',
    defaultEnabled: false,
    heavy: false,
    experimental: true,
    rationale: 'Not needed for user trust-first launch wedge.',
  },
  custom_realtime_collaboration: {
    key: 'custom_realtime_collaboration',
    label: 'Custom realtime collaboration',
    defaultEnabled: false,
    heavy: true,
    experimental: true,
    rationale:
      'Requires database-backed authorization and durable operation history before launch.',
  },
  blockchain_storage: {
    key: 'blockchain_storage',
    label: 'Blockchain/decentralized storage',
    defaultEnabled: false,
    heavy: true,
    experimental: true,
    rationale: 'Outside focused privacy-first notes wedge.',
  },
};

function envFlagName(key: LaunchFeatureKey): string {
  return `NEXT_PUBLIC_FEATURE_${key.toUpperCase()}`;
}

export function isLaunchFeatureEnabled(
  key: LaunchFeatureKey,
  env: Record<string, string | undefined> = process.env
): boolean {
  const override = env[envFlagName(key)];
  if (override === 'true') return true;
  if (override === 'false') return false;
  return LAUNCH_FEATURES[key].defaultEnabled;
}

export function getEnabledLaunchFeatures(
  env: Record<string, string | undefined> = process.env
): LaunchFeatureConfig[] {
  return Object.values(LAUNCH_FEATURES).filter(feature => isLaunchFeatureEnabled(feature.key, env));
}

export function getDisabledLaunchFeatures(
  env: Record<string, string | undefined> = process.env
): LaunchFeatureConfig[] {
  return Object.values(LAUNCH_FEATURES).filter(
    feature => !isLaunchFeatureEnabled(feature.key, env)
  );
}

export function assertHeavyExperimentalFeaturesDisabledByDefault(): void {
  const incorrectlyEnabled = Object.values(LAUNCH_FEATURES).filter(
    feature => feature.heavy && feature.experimental && feature.defaultEnabled
  );

  if (incorrectlyEnabled.length > 0) {
    throw new Error(
      `Heavy experimental features must be disabled by default: ${incorrectlyEnabled
        .map(feature => feature.key)
        .join(', ')}`
    );
  }
}
