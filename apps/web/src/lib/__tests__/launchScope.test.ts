import { describe, expect, it } from 'vitest';
import {
  assertHeavyExperimentalFeaturesDisabledByDefault,
  getDisabledLaunchFeatures,
  getEnabledLaunchFeatures,
  isLaunchFeatureEnabled,
  isSharedSpacesSurfaceEnabled,
  LAUNCH_FEATURES,
} from '../launchScope';

describe('launch scope feature matrix', () => {
  it('keeps core trust-first wedge enabled by default', () => {
    expect(isLaunchFeatureEnabled('encrypted_notes', {})).toBe(true);
    expect(isLaunchFeatureEnabled('local_first_sync', {})).toBe(true);
    expect(isLaunchFeatureEnabled('recovery_keys', {})).toBe(true);
    expect(isLaunchFeatureEnabled('import_export', {})).toBe(true);
    expect(isLaunchFeatureEnabled('local_search', {})).toBe(true);
  });

  it('keeps heavy experimental features disabled by default', () => {
    assertHeavyExperimentalFeaturesDisabledByDefault();

    expect(isLaunchFeatureEnabled('pdf_signing', {})).toBe(false);
    expect(isLaunchFeatureEnabled('calendar_sync', {})).toBe(false);
    expect(isLaunchFeatureEnabled('local_ai_models', {})).toBe(false);
    expect(isLaunchFeatureEnabled('custom_realtime_collaboration', {})).toBe(false);
    expect(isLaunchFeatureEnabled('blockchain_storage', {})).toBe(false);
  });

  it('hides Shared Spaces from public beta surfaces by default', () => {
    expect(isLaunchFeatureEnabled('shared_spaces', {})).toBe(false);
    expect(isSharedSpacesSurfaceEnabled({})).toBe(false);
  });

  it('allows explicit environment overrides', () => {
    expect(
      isLaunchFeatureEnabled('local_ai_models', {
        NEXT_PUBLIC_FEATURE_LOCAL_AI_MODELS: 'true',
      })
    ).toBe(true);
    expect(
      isLaunchFeatureEnabled('encrypted_notes', {
        NEXT_PUBLIC_FEATURE_ENCRYPTED_NOTES: 'false',
      })
    ).toBe(false);
    expect(
      isLaunchFeatureEnabled('shared_spaces', {
        NEXT_PUBLIC_FEATURE_SHARED_SPACES: 'true',
      })
    ).toBe(true);
    expect(
      isSharedSpacesSurfaceEnabled({
        NEXT_PUBLIC_FEATURE_SHARED_SPACES: 'true',
      })
    ).toBe(true);
  });

  it('returns enabled and disabled feature lists', () => {
    const enabled = getEnabledLaunchFeatures({}).map(feature => feature.key);
    const disabled = getDisabledLaunchFeatures({}).map(feature => feature.key);

    expect(enabled).toContain('encrypted_notes');
    expect(disabled).toContain('pdf_signing');
    expect(disabled).toContain('shared_spaces');
    expect(Object.keys(LAUNCH_FEATURES).sort()).toEqual([...enabled, ...disabled].sort());
  });
});
