/**
 * Feature types supported by NoteChain
 */
export type FeatureType =
  // Core features (Free)
  | 'basic_notes'
  | 'basic_todos'
  | 'basic_folders'
  | 'basic_tags'
  | 'basic_search'

  // Pro features
  | 'unlimited_folders'
  | 'unlimited_tags'
  | 'pdf_signing'
  | 'pdf_annotations'
  | 'advanced_search'
  | 'multi_device_sync'
  | 'recurring_todos'
  | 'calendar_integration'
  | 'full_text_search'

  // Premium add-ons
  | 'templates'
  | 'custom_themes'
  | 'weekly_analytics'
  | 'export_import';

/**
 * User subscription tier
 */
export type SubscriptionTier = 'free' | 'pro' | 'premium';

/**
 * Feature configuration with tier requirements
 */
export interface FeatureConfig {
  name: string;
  description: string;
  requiredTier: SubscriptionTier;
  premiumAddOn?: boolean;
}

/**
 * Feature definitions
 */
export const FEATURES: Record<FeatureType, FeatureConfig> = {
  // Core features (Free tier)
  basic_notes: {
    name: 'Basic Notes',
    description: 'Create and edit basic notes',
    requiredTier: 'free',
  },
  basic_todos: {
    name: 'Basic Todos',
    description: 'Create and manage simple tasks',
    requiredTier: 'free',
  },
  basic_folders: {
    name: 'Basic Folders',
    description: 'Organize notes in up to 1 folder',
    requiredTier: 'free',
  },
  basic_tags: {
    name: 'Basic Tags',
    description: 'Add up to 5 tags to notes',
    requiredTier: 'free',
  },
  basic_search: {
    name: 'Basic Search',
    description: 'Search notes by title',
    requiredTier: 'free',
  },

  // Pro features
  unlimited_folders: {
    name: 'Unlimited Folders',
    description: 'Create unlimited folders for notes',
    requiredTier: 'pro',
  },
  unlimited_tags: {
    name: 'Unlimited Tags',
    description: 'Add unlimited tags to notes',
    requiredTier: 'pro',
  },
  pdf_signing: {
    name: 'PDF Signing',
    description: 'Digitally sign PDF documents',
    requiredTier: 'pro',
  },
  pdf_annotations: {
    name: 'PDF Annotations',
    description: 'Highlight, underline, and annotate PDFs',
    requiredTier: 'pro',
  },
  advanced_search: {
    name: 'Advanced Search',
    description: 'Full-text search across all content',
    requiredTier: 'pro',
  },
  multi_device_sync: {
    name: 'Multi-Device Sync',
    description: 'Sync across multiple devices',
    requiredTier: 'pro',
  },
  recurring_todos: {
    name: 'Recurring Tasks',
    description: 'Create recurring todo items',
    requiredTier: 'pro',
  },
  calendar_integration: {
    name: 'Calendar Integration',
    description: 'Sync with Google, Outlook, and Apple Calendar',
    requiredTier: 'pro',
  },
  full_text_search: {
    name: 'Full-Text Search',
    description: 'Search across notes, todos, and PDF content',
    requiredTier: 'pro',
  },

  // Premium add-ons
  templates: {
    name: 'Note Templates',
    description: 'Use pre-made note templates',
    requiredTier: 'premium',
    premiumAddOn: true,
  },
  custom_themes: {
    name: 'Custom Themes',
    description: 'Personalize app appearance',
    requiredTier: 'premium',
    premiumAddOn: true,
  },
  weekly_analytics: {
    name: 'Weekly Analytics',
    description: 'View productivity insights and reports',
    requiredTier: 'premium',
    premiumAddOn: true,
  },
  export_import: {
    name: 'Export/Import',
    description: 'Migrate data to/from other apps',
    requiredTier: 'premium',
    premiumAddOn: true,
  },
};

/**
 * FeatureGate class for checking feature access
 */
export class FeatureGate {
  /**
   * Checks if user can access a specific feature
   * @param userTier User's current subscription tier
   * @param feature Feature to check access for
   * @returns True if user can access the feature
   */
  static canAccessFeature(userTier: SubscriptionTier, feature: FeatureType): boolean {
    const config = FEATURES[feature];

    if (config.requiredTier === 'free') {
      return true;
    }

    if (config.requiredTier === 'premium' && config.premiumAddOn) {
      return userTier === 'premium';
    }

    return userTier === 'pro' || userTier === 'premium';
  }

  /**
   * Gets feature configuration
   * @param feature Feature to get config for
   * @returns Feature configuration object
   */
  static getFeatureConfig(feature: FeatureType): FeatureConfig {
    return FEATURES[feature];
  }

  /**
   * Checks if feature requires upgrade
   * @param userTier User's current subscription tier
   * @param feature Feature to check
   * @returns True if feature requires upgrade
   */
  static requiresUpgrade(userTier: SubscriptionTier, feature: FeatureType): boolean {
    return !this.canAccessFeature(userTier, feature);
  }

  /**
   * Gets required tier for feature
   * @param feature Feature to check
   * @returns Required subscription tier
   */
  static getRequiredTier(feature: FeatureType): SubscriptionTier {
    return FEATURES[feature].requiredTier;
  }

  /**
   * Gets list of Pro features
   * @returns Array of Pro feature types
   */
  static getProFeatures(): FeatureType[] {
    return Object.entries(FEATURES)
      .filter(([_, config]) => config.requiredTier === 'pro')
      .map(([type]) => type as FeatureType);
  }

  /**
   * Gets list of Premium add-ons
   * @returns Array of Premium feature types
   */
  static getPremiumAddOns(): FeatureType[] {
    return Object.entries(FEATURES)
      .filter(([_, config]) => config.requiredTier === 'premium' && config.premiumAddOn)
      .map(([type]) => type as FeatureType);
  }
}

/**
 * FeatureGateResult for useFeatureGate hook
 */
export interface FeatureGateResult {
  canAccess: boolean;
  config: FeatureConfig;
  requiresUpgrade: boolean;
  requiredTier: SubscriptionTier;
  isLoading: boolean;
}

/**
 * Mock user service for demo purposes
 * In production, this would fetch from Supabase auth/user table
 */
export class UserService {
  private static tier: SubscriptionTier = 'free';

  /**
   * Gets current user's subscription tier
   */
  static async getUserTier(): Promise<SubscriptionTier> {
    // In production, fetch from Supabase
    // const { data } = await supabase.from('users').select('tier').single();
    // return data?.tier || 'free';

    return this.tier;
  }

  /**
   * Sets user's subscription tier (for testing/demo)
   */
  static setUserTier(tier: SubscriptionTier): void {
    this.tier = tier;
  }

  /**
   * Checks if user can access feature
   */
  static async canAccessFeature(feature: FeatureType): Promise<boolean> {
    const tier = await this.getUserTier();
    return FeatureGate.canAccessFeature(tier, feature);
  }

  /**
   * Upgrades user to Pro tier
   */
  static async upgradeToPro(): Promise<void> {
    // In production, process Stripe payment
    // const session = await stripe.checkout.sessions.create({...});
    // await supabase.from('users').update({ tier: 'pro' }).eq('id', userId);

    this.tier = 'pro';
  }

  /**
   * Upgrades user to Premium tier
   */
  static async upgradeToPremium(): Promise<void> {
    // In production, process Stripe payment
    this.tier = 'premium';
  }

  /**
   * Downgrades user to Free tier
   */
  static async downgradeToFree(): Promise<void> {
    this.tier = 'free';
  }
}
