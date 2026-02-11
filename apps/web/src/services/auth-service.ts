// apps/web/src/services/auth-service.ts
import { EncryptionService } from '@notechain/core-crypto';
import { SignJWT } from 'jose';

/**
 * Generate cryptographically secure random bytes using Web Crypto API
 */
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

const MASTER_KEY_STORAGE_KEY = '@notechain/masterKey';
const SALT_STORAGE_KEY = '@notechain/salt';
const EMAIL_HASH_STORAGE_KEY = '@notechain/emailHash';
const USER_ID_STORAGE_KEY = '@notechain/userId';
const TOKEN_STORAGE_KEY = '@notechain/token';

/**
 * User authentication response
 */
export interface AuthResponse {
  userId: string;
  token: string;
}

/**
 * Registration input
 */
export interface RegisterInput {
  email: string;
  password: string;
}

/**
 * Login input
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * AuthService provides zero-knowledge authentication
 * All cryptographic operations happen client-side
 */
export class AuthService {
  /**
   * Hash email using SHA-256 for privacy
   * @param email The user's email
   * @returns Hashed email as hex string
   */
  private static async hashEmail(email: string): Promise<string> {
    const normalizedEmail = email.toLowerCase().trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalizedEmail);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a random salt
   * @returns Random salt as Uint8Array
   */
  private static generateSalt(): Uint8Array {
    return randomBytes(16);
  }

  /**
   * Derive master key from password + salt
   * Uses the EncryptionService's deriveKey method
   * @param password The user's password
   * @param salt The salt for key derivation
   * @returns Derived key as Uint8Array
   */
  private static async deriveMasterKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);

    // Use EncryptionService's deriveKey with high iterations for security
    return EncryptionService.deriveKey(passwordBytes, salt, 100000);
  }

  /**
   * Store master key in localStorage
   * @param key The master key to store
   */
  private static storeMasterKey(key: Uint8Array): void {
    const keyString = Array.from(key).join(',');
    localStorage.setItem(MASTER_KEY_STORAGE_KEY, keyString);
  }

  /**
   * Retrieve master key from localStorage
   * @returns Master key as Uint8Array, or null if not found
   */
  private static retrieveMasterKey(): Uint8Array | null {
    const keyString = localStorage.getItem(MASTER_KEY_STORAGE_KEY);
    if (!keyString) {
      return null;
    }
    return new Uint8Array(keyString.split(',').map(Number));
  }

  /**
   * Store salt in localStorage
   * @param salt The salt to store
   */
  private static storeSalt(salt: Uint8Array): void {
    localStorage.setItem(SALT_STORAGE_KEY, this.uint8ArrayToBase64(salt));
  }

  /**
   * Retrieve salt from localStorage
   * @returns Salt as Uint8Array, or null if not found
   */
  private static retrieveSalt(): Uint8Array | null {
    const saltBase64 = localStorage.getItem(SALT_STORAGE_KEY);
    if (!saltBase64) {
      return null;
    }
    return this.base64ToUint8Array(saltBase64);
  }

  /**
   * Convert Uint8Array to base64
   */
  private static uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to Uint8Array
   */
  private static base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Generate a JWT token
   * @param userId The user's ID
   * @returns JWT token string
   */
  private static async generateToken(userId: string): Promise<string> {
    const secret = new TextEncoder().encode(
      process.env.NEXT_PUBLIC_JWT_SECRET || 'default-secret-change-in-production'
    );

    const token = await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    return token;
  }

  /**
   * Generate a unique user ID from email hash
   * @param emailHash The hashed email
   * @returns User ID string
   */
  private static generateUserId(emailHash: string): string {
    return `user_${emailHash.slice(0, 16)}`;
  }

  /**
   * Store credentials in localStorage
   * @param userId The user's ID
   * @param token The JWT token
   */
  private static storeCredentials(userId: string, token: string): void {
    localStorage.setItem(USER_ID_STORAGE_KEY, userId);
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  /**
   * Check if WebAuthn is available
   * @returns True if WebAuthn is supported
   */
  static isBiometricAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.PublicKeyCredential;
  }

  /**
   * Register a new user
   * @param input Registration input with email and password
   * @returns AuthResponse with userId and token
   * @throws Error if registration fails
   */
  static async register(input: RegisterInput): Promise<AuthResponse> {
    try {
      const { email, password } = input;

      // Hash email for privacy
      const emailHash = await this.hashEmail(email);

      // Generate salt
      const salt = this.generateSalt();

      // Derive master key from password + salt
      const masterKey = await this.deriveMasterKey(password, salt);

      // Store master key and salt
      this.storeMasterKey(masterKey);
      this.storeSalt(salt);
      localStorage.setItem(EMAIL_HASH_STORAGE_KEY, emailHash);

      // Generate user ID
      const userId = this.generateUserId(emailHash);

      // Generate token
      const token = await this.generateToken(userId);

      // Store credentials
      this.storeCredentials(userId, token);

      return { userId, token };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(error instanceof Error ? error.message : 'Registration failed');
    }
  }

  /**
   * Login an existing user
   * @param input Login input with email and password
   * @returns AuthResponse with userId and token
   * @throws Error if login fails
   */
  static async login(input: LoginInput): Promise<AuthResponse> {
    try {
      const { email, password } = input;

      // Hash email to find user
      const emailHash = await this.hashEmail(email);

      // Retrieve stored salt
      const salt = this.retrieveSalt();
      if (!salt) {
        throw new Error('User not found');
      }

      // Derive master key from password (same salt as registration)
      const masterKey = await this.deriveMasterKey(password, salt);

      // Store master key in localStorage
      this.storeMasterKey(masterKey);
      localStorage.setItem(EMAIL_HASH_STORAGE_KEY, emailHash);

      // Generate user ID
      const userId = this.generateUserId(emailHash);

      // Generate token
      const token = await this.generateToken(userId);

      // Store credentials
      this.storeCredentials(userId, token);

      return { userId, token };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  }

  /**
   * Biometric unlock for web using WebAuthn
   * @returns AuthResponse with userId and token if successful
   * @throws Error if biometric unlock is not available or fails
   */
  static async biometricUnlock(): Promise<AuthResponse> {
    try {
      // Check if WebAuthn is available
      if (!this.isBiometricAvailable()) {
        throw new Error('Biometric authentication not available on this device');
      }

      // Check if PublicKeyCredential is available
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn not supported');
      }

      // Retrieve stored master key from localStorage
      const masterKey = this.retrieveMasterKey();
      if (!masterKey) {
        throw new Error('No stored credentials found. Please login first.');
      }

      // Retrieve user ID
      const userId = localStorage.getItem(USER_ID_STORAGE_KEY);
      if (!userId) {
        throw new Error('No stored user found. Please login first.');
      }

      // Use WebAuthn for user verification
      // Create a challenge
      const challenge = randomBytes(32);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge.buffer as ArrayBuffer,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname,
      };

      // Request user verification
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      if (!credential) {
        throw new Error('Biometric verification failed');
      }

      // Generate new token
      const token = await this.generateToken(userId);

      // Update stored token
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      return { userId, token };
    } catch (error) {
      console.error('Biometric unlock error:', error);
      throw new Error(error instanceof Error ? error.message : 'Biometric unlock failed');
    }
  }

  /**
   * Refresh the authentication token
   * @returns New token string
   * @throws Error if token refresh fails
   */
  static async refreshToken(): Promise<string> {
    try {
      // Retrieve stored credentials
      const userId = localStorage.getItem(USER_ID_STORAGE_KEY);
      if (!userId) {
        throw new Error('No active session found');
      }

      const masterKey = this.retrieveMasterKey();
      if (!masterKey) {
        throw new Error('No stored master key found');
      }

      // Generate new JWT token
      const token = await this.generateToken(userId);

      // Store new token
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      return token;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error(error instanceof Error ? error.message : 'Token refresh failed');
    }
  }

  /**
   * Logout the current user
   * Clears all localStorage data and session information
   */
  static logout(): void {
    // Clear localStorage
    localStorage.removeItem(MASTER_KEY_STORAGE_KEY);
    localStorage.removeItem(SALT_STORAGE_KEY);
    localStorage.removeItem(EMAIL_HASH_STORAGE_KEY);
    localStorage.removeItem(USER_ID_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  /**
   * Check if user is currently authenticated
   * @returns True if authenticated
   */
  static isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_STORAGE_KEY) && !!localStorage.getItem(USER_ID_STORAGE_KEY);
  }

  /**
   * Get current token
   * @returns Current token or null if not authenticated
   */
  static getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  /**
   * Get current user ID
   * @returns Current user ID or null if not authenticated
   */
  static getUserId(): string | null {
    return localStorage.getItem(USER_ID_STORAGE_KEY);
  }
}
