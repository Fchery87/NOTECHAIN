import { useState, useEffect, useCallback } from 'react';
import {
  FeatureType,
  FeatureGateResult,
  SubscriptionTier,
  UserService,
  FeatureGate,
} from '../lib/featureGate';

/**
 * Hook for feature gating
 * Provides access control and upgrade prompts
 *
 * @param feature Feature to check access for
 * @returns Feature gate result with access status and config
 */
export function useFeatureGate(feature: FeatureType): FeatureGateResult {
  const [userTier, setUserTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);

  // Load user tier on mount
  useEffect(() => {
    let mounted = true;

    const loadTier = async () => {
      setIsLoading(true);
      const tier = await UserService.getUserTier();

      if (mounted) {
        setUserTier(tier);
        setIsLoading(false);
      }
    };

    loadTier();

    return () => {
      mounted = false;
    };
  }, []);

  const canAccess = FeatureGate.canAccessFeature(userTier, feature);
  const config = FeatureGate.getFeatureConfig(feature);
  const requiresUpgrade = FeatureGate.requiresUpgrade(userTier, feature);
  const requiredTier = FeatureGate.getRequiredTier(feature);

  return {
    canAccess,
    config,
    requiresUpgrade,
    requiredTier,
    isLoading,
  };
}

/**
 * Hook for feature gating with multiple features
 *
 * @param features Array of features to check
 * @returns Object mapping features to their gate results
 */
export function useMultiFeatureGate(
  features: FeatureType[]
): Record<FeatureType, FeatureGateResult> {
  const [userTier, setUserTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadTier = async () => {
      setIsLoading(true);
      const tier = await UserService.getUserTier();

      if (mounted) {
        setUserTier(tier);
        setIsLoading(false);
      }
    };

    loadTier();

    return () => {
      mounted = false;
    };
  }, []);

  return features.reduce(
    (results, feature) => {
      const canAccess = FeatureGate.canAccessFeature(userTier, feature);
      const config = FeatureGate.getFeatureConfig(feature);
      const requiresUpgrade = FeatureGate.requiresUpgrade(userTier, feature);
      const requiredTier = FeatureGate.getRequiredTier(feature);

      results[feature] = {
        canAccess,
        config,
        requiresUpgrade,
        requiredTier,
        isLoading,
      };

      return results;
    },
    {} as Record<FeatureType, FeatureGateResult>
  );
}

/**
 * Hook for Pro upgrade actions
 *
 * @returns Object with upgrade actions and loading state
 */
export function useProUpgrade() {
  const [isUpgrading, setIsUpgrading] = useState(false);

  const upgradeToPro = useCallback(async () => {
    setIsUpgrading(true);
    try {
      await UserService.upgradeToPro();
    } finally {
      setIsUpgrading(false);
    }
  }, []);

  const upgradeToPremium = useCallback(async () => {
    setIsUpgrading(true);
    try {
      await UserService.upgradeToPremium();
    } finally {
      setIsUpgrading(false);
    }
  }, []);

  const downgradeToFree = useCallback(async () => {
    setIsUpgrading(true);
    try {
      await UserService.downgradeToFree();
    } finally {
      setIsUpgrading(false);
    }
  }, []);

  return {
    upgradeToPro,
    upgradeToPremium,
    downgradeToFree,
    isUpgrading,
  };
}

/**
 * Hook for checking user's subscription tier
 *
 * @returns Current tier and loading state
 */
export function useUserTier(): {
  tier: SubscriptionTier;
  isLoading: boolean;
  setTier: (tier: SubscriptionTier) => void;
} {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadTier = async () => {
      setIsLoading(true);
      const userTier = await UserService.getUserTier();

      if (mounted) {
        setTier(userTier);
        setIsLoading(false);
      }
    };

    loadTier();

    return () => {
      mounted = false;
    };
  }, []);

  const setTierHandler = useCallback((newTier: SubscriptionTier) => {
    setTier(newTier);
    UserService.setUserTier(newTier);
  }, []);

  return {
    tier,
    isLoading,
    setTier: setTierHandler,
  };
}
