/**
 * Application-wide constants
 * Central place for magic numbers and configuration values
 */

// Timeouts (in milliseconds)
export const TIMEOUTS = {
  DEFAULT: 5_000,
  LONG: 30_000,
  API: 10_000,
} as const;

// Batch sizes
export const BATCH_SIZES = {
  SYNC_DEFAULT: 10,
  SYNC_MAX: 100,
  STORAGE_QUERY: 50,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
} as const;

// Token expiration
export const AUTH = {
  TOKEN_EXPIRY: '24h',
  REFRESH_EXPIRY_DAYS: 7,
} as const;

// Rate limiting
export const RATE_LIMITS = {
  AUTH_WINDOW_MS: 60_000, // 1 minute
  AUTH_MAX_REQUESTS: 5,
  API_WINDOW_MS: 60_000,
  API_MAX_REQUESTS: 100,
  GENERAL_WINDOW_MS: 10 * 60_000, // 10 minutes
  GENERAL_MAX_REQUESTS: 1000,
} as const;

// Validation limits
export const VALIDATION = {
  EMAIL_MIN_LENGTH: 5,
  EMAIL_MAX_LENGTH: 254,
  PASSWORD_MIN_LENGTH: 12,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  NOTE_TITLE_MAX_LENGTH: 200,
  NOTE_CONTENT_MAX_LENGTH: 100_000,
  SEARCH_MAX_LENGTH: 100,
} as const;

// Storage keys
export const STORAGE_KEYS = {
  MASTER_KEY: '@notechain/masterKey',
  SALT: '@notechain/salt',
  EMAIL_HASH: '@notechain/emailHash',
  USER_ID: '@notechain/userId',
  TOKEN: '@notechain/token',
  DEVICE_ID: '@notechain/deviceId',
} as const;

// Feature flags (can be overridden via environment)
export const FEATURES = {
  ENABLE_AI_FEATURES: process.env.NEXT_PUBLIC_ENABLE_AI_FEATURES === 'true',
  ENABLE_PDF_SIGNING: process.env.NEXT_PUBLIC_ENABLE_PDF_SIGNING === 'true',
  ENABLE_CALENDAR_SYNC: process.env.NEXT_PUBLIC_ENABLE_CALENDAR_SYNC === 'true',
} as const;
