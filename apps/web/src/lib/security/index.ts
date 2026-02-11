/**
 * Security Module Exports
 * Centralized exports for all security utilities
 */

// Security Audit
export {
  performSecurityAudit,
  isSecureContext,
  checkTLSVersion,
  checkCSP,
  checkSecureStorage,
  checkXSSProtection,
  checkCSRFProtection,
  checkSecurityHeaders,
  checkInputValidation,
  checkErrorHandling,
  checkRateLimiting,
  verifyEncryption,
  checkAuthentication,
  getSecurityRecommendations,
  exportAuditReport,
  type SecurityCheck,
  type SecurityAuditReport,
  type EncryptionCheck,
} from './securityAudit';

// Input Validation
export {
  validateEmail,
  validatePassword,
  validateNoteTitle,
  validateNoteContent,
  validateUsername,
  validateSearchQuery,
  validateFileName,
  sanitizeHtml,
  sanitizeText,
  validateAndSanitize,
  detectInjection,
  validationRateLimiter,
  validateWithRateLimit,
  validateFile,
  InputValidator,
  schemas,
  type ValidationResult,
  type FileValidationOptions,
} from './inputValidator';

// Rate Limiting
export {
  RateLimiter,
  rateLimiters,
  ExponentialBackoff,
  authBackoff,
  CircuitBreaker,
  CircuitState,
  SuspiciousActivityDetector,
  suspiciousActivityDetector,
  checkRequestSize,
  BruteForceProtection,
  bruteForceProtection,
  getClientIdentifier,
  RateLimit,
  type RateLimitConfig,
  type RateLimitState,
  type RateLimitResult,
  type SuspiciousActivity,
  type CircuitBreakerConfig,
} from './rateLimiter';

// Encryption Verification
export {
  verifyEncryptionAlgorithm,
  verifyDataIntegrity,
  calculateHash,
  verifySecureConnection,
  checkKeyRotationStatus,
  verifyKeyDerivation,
  runEncryptionAudit,
  verifyEncryptedDataFormat,
  testEncryptionRoundtrip,
  EncryptionVerification,
  type EncryptionVerificationResult,
  type KeyRotationStatus,
} from './encryptionVerification';

// CSP
export {
  strictCSP,
  developmentCSP,
  buildCSPHeader,
  getCSP,
  getMetaTagCSP,
  getSecurityHeaders,
  generateNonce,
  handleCSPViolation,
  createCSPMiddleware,
  CSP,
  type CSPDirectives,
  type SecurityHeaders,
  type CSPViolationReport,
} from './csp';
