import { describe, it, expect } from '@jest/globals';
import { FeatureGate, UserService } from '../featureGate';
import type { FeatureType } from '../featureGate';

describe('Feature Gate', () => {
  beforeEach(() => {
    UserService.setUserTier('free');
  });

  describe('Access Control', () => {
    it('should allow free tier access to basic features', () => {
      const freeFeatures: FeatureType[] = [
        'basic_notes',
        'basic_todos',
        'basic_folders',
        'basic_tags',
        'basic_search',
      ];

      freeFeatures.forEach(feature => {
        expect(FeatureGate.canAccessFeature('free', feature)).toBe(true);
      });
    });

    it('should deny free tier access to Pro features', () => {
      const proFeatures: FeatureType[] = [
        'unlimited_folders',
        'unlimited_tags',
        'pdf_signing',
        'pdf_annotations',
        'advanced_search',
        'multi_device_sync',
        'recurring_todos',
        'calendar_integration',
        'full_text_search',
      ];

      proFeatures.forEach(feature => {
        expect(FeatureGate.canAccessFeature('free', feature)).toBe(false);
      });
    });

    it('should allow Pro tier access to all Pro features', () => {
      const proFeatures: FeatureType[] = [
        'unlimited_folders',
        'unlimited_tags',
        'pdf_signing',
        'pdf_annotations',
        'advanced_search',
        'multi_device_sync',
        'recurring_todos',
        'calendar_integration',
        'full_text_search',
      ];

      proFeatures.forEach(feature => {
        expect(FeatureGate.canAccessFeature('pro', feature)).toBe(true);
      });
    });

    it('should allow Premium tier access to all features', () => {
      const allFeatures: FeatureType[] = [
        'basic_notes',
        'basic_todos',
        'basic_folders',
        'basic_tags',
        'basic_search',
        'unlimited_folders',
        'unlimited_tags',
        'pdf_signing',
        'pdf_annotations',
        'advanced_search',
        'multi_device_sync',
        'recurring_todos',
        'calendar_integration',
        'full_text_search',
        'templates',
        'custom_themes',
        'weekly_analytics',
        'export_import',
      ];

      allFeatures.forEach(feature => {
        expect(FeatureGate.canAccessFeature('premium', feature)).toBe(true);
      });
    });
  });

  describe('Feature Requirements', () => {
    it('should return correct required tier for free features', () => {
      expect(FeatureGate.getRequiredTier('basic_notes')).toBe('free');
      expect(FeatureGate.getRequiredTier('basic_todos')).toBe('free');
    });

    it('should return correct required tier for Pro features', () => {
      expect(FeatureGate.getRequiredTier('unlimited_folders')).toBe('pro');
      expect(FeatureGate.getRequiredTier('pdf_signing')).toBe('pro');
    });

    it('should return correct required tier for Premium features', () => {
      expect(FeatureGate.getRequiredTier('templates')).toBe('premium');
      expect(FeatureGate.getRequiredTier('weekly_analytics')).toBe('premium');
    });
  });

  describe('Upgrade Detection', () => {
    it('should detect free users need upgrade for Pro features', () => {
      expect(FeatureGate.requiresUpgrade('free', 'pdf_signing')).toBe(true);
      expect(FeatureGate.requiresUpgrade('free', 'unlimited_folders')).toBe(true);
    });

    it('should detect free users do not need upgrade for basic features', () => {
      expect(FeatureGate.requiresUpgrade('free', 'basic_notes')).toBe(false);
      expect(FeatureGate.requiresUpgrade('free', 'basic_todos')).toBe(false);
    });

    it('should detect Pro users do not need upgrade for Pro features', () => {
      expect(FeatureGate.requiresUpgrade('pro', 'pdf_signing')).toBe(false);
      expect(FeatureGate.requiresUpgrade('pro', 'unlimited_folders')).toBe(false);
    });
  });

  describe('Feature Configuration', () => {
    it('should return feature config', () => {
      const config = FeatureGate.getFeatureConfig('pdf_signing');

      expect(config.name).toBe('PDF Signing');
      expect(config.description).toBe('Digitally sign PDF documents');
      expect(config.requiredTier).toBe('pro');
    });

    it('should return all Pro features', () => {
      const proFeatures = FeatureGate.getProFeatures();

      expect(proFeatures).toContain('pdf_signing');
      expect(proFeatures).toContain('unlimited_folders');
      expect(proFeatures).toContain('calendar_integration');
    });

    it('should return all Premium add-ons', () => {
      const premiumAddOns = FeatureGate.getPremiumAddOns();

      expect(premiumAddOns).toContain('templates');
      expect(premiumAddOns).toContain('custom_themes');
      expect(premiumAddOns).toContain('weekly_analytics');
    });
  });

  describe('User Service', () => {
    it('should get user tier', async () => {
      UserService.setUserTier('pro');
      const tier = await UserService.getUserTier();

      expect(tier).toBe('pro');
    });

    it('should upgrade user to Pro', async () => {
      await UserService.upgradeToPro();
      const tier = await UserService.getUserTier();

      expect(tier).toBe('pro');
    });

    it('should upgrade user to Premium', async () => {
      await UserService.upgradeToPremium();
      const tier = await UserService.getUserTier();

      expect(tier).toBe('premium');
    });

    it('should downgrade user to Free', async () => {
      await UserService.downgradeToFree();
      const tier = await UserService.getUserTier();

      expect(tier).toBe('free');
    });

    it('should check feature access for user', async () => {
      UserService.setUserTier('free');
      const canAccess = await UserService.canAccessFeature('pdf_signing');

      expect(canAccess).toBe(false);
    });
  });
});
