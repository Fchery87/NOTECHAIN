import { encryptData, decryptData } from '@notechain/core-crypto';
import { KeyManager } from '@notechain/core-crypto';

/**
 * Share link configuration
 */
export interface ShareLink {
  id: string;
  fileId: string;
  fileName: string;
  encryptedKey: string; // Encrypted with share link key
  iv: string;
  salt: string;
  expiresAt?: Date;
  createdAt: Date;
  viewCount: number;
  maxViews?: number;
  password?: string; // Optional password protection
}

/**
 * Share access level
 */
export type ShareAccessLevel = 'read' | 'read-only' | 'download';

/**
 * PDF Sharing Service
 * US-PDF-03: Encrypted PDF sharing with non-users
 */
export class PDFSharingService {
  private static readonly STORAGE_KEY = 'notechain_share_links';
  private static shareLinks: ShareLink[] = [];

  /**
   * Creates a share link for encrypted PDF
   * @param fileId Internal file ID
   * @param fileName File name
   * @param pdfEncrypted Encrypted PDF data
   * @param options Share options
   * @returns Share link ID and URL
   */
  static async createShareLink(
    fileId: string,
    fileName: string,
    pdfEncrypted: Uint8Array,
    options?: {
      expiresAt?: Date;
      maxViews?: number;
      password?: string;
      accessLevel?: ShareAccessLevel;
    }
  ): Promise<{ linkId: string; shareUrl: string }> {
    try {
      // Generate share-specific encryption key
      const shareKey = await this.generateShareKey();

      // Encrypt PDF with share key (re-encrypt)
      const _iv = crypto.getRandomValues(new Uint8Array(12));
      const salt = crypto.getRandomValues(new Uint8Array(16));

      const _encrypted = await encryptData(new TextDecoder().decode(pdfEncrypted), shareKey);

      // Encrypt share key with master key for storage
      const masterKey = await KeyManager.getMasterKey();
      if (!masterKey) {
        throw new Error('Master key not found');
      }

      const keyEncrypted = await encryptData(Buffer.from(shareKey).toString('base64'), masterKey);

      // Create share link
      const linkId = this.generateLinkId();
      const shareLink: ShareLink = {
        id: linkId,
        fileId,
        fileName,
        encryptedKey: keyEncrypted.ciphertext,
        iv: keyEncrypted.nonce,
        salt: Buffer.from(salt).toString('base64'),
        expiresAt: options?.expiresAt,
        createdAt: new Date(),
        viewCount: 0,
        maxViews: options?.maxViews,
        password: options?.password, // In production, hash and store
      };

      this.shareLinks.push(shareLink);
      await this.saveShareLinks();

      const shareUrl = this.buildShareUrl(linkId);

      return { linkId, shareUrl };
    } catch (error) {
      console.error('Failed to create share link:', error);
      throw error;
    }
  }

  /**
   * Accesses shared PDF via link
   * @param linkId Share link ID
   * @param password Optional password
   * @returns Decrypted PDF data
   */
  static async accessSharedPDF(linkId: string, password?: string): Promise<Uint8Array> {
    try {
      const shareLink = await this.getShareLink(linkId);

      if (!shareLink) {
        throw new Error('Share link not found');
      }

      // Check expiration
      if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
        throw new Error('Share link has expired');
      }

      // Check view limit
      if (shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
        throw new Error('Share link has reached maximum views');
      }

      // Verify password if set
      if (shareLink.password) {
        if (!password || password !== shareLink.password) {
          throw new Error('Invalid password');
        }
      }

      // Decrypt share key
      const masterKey = await KeyManager.getMasterKey();
      if (!masterKey) {
        throw new Error('Master key not found');
      }

      const keyDecrypted = await decryptData(
        {
          ciphertext: shareLink.encryptedKey,
          nonce: shareLink.iv,
          authTag: '', // Not used for key encryption
        },
        masterKey
      );

      const shareKey = Uint8Array.from(Buffer.from(keyDecrypted, 'base64'));

      // Decrypt PDF
      // In real implementation, fetch encrypted PDF from storage
      const pdfEncrypted = await this.fetchEncryptedPDF(shareLink.fileId);

      const pdfDecrypted = await decryptData(
        {
          ciphertext: pdfEncrypted.ciphertext,
          nonce: pdfEncrypted.nonce,
          authTag: pdfEncrypted.authTag,
        },
        shareKey
      );

      const pdfData = new TextEncoder().encode(pdfDecrypted);

      // Increment view count
      shareLink.viewCount++;
      await this.saveShareLinks();

      return new Uint8Array(pdfData);
    } catch (error) {
      console.error('Failed to access shared PDF:', error);
      throw error;
    }
  }

  /**
   * Revokes a share link
   * @param linkId Share link ID
   */
  static async revokeShareLink(linkId: string): Promise<void> {
    const index = this.shareLinks.findIndex(s => s.id === linkId);

    if (index === -1) {
      throw new Error('Share link not found');
    }

    this.shareLinks.splice(index, 1);
    await this.saveShareLinks();
  }

  /**
   * Gets all share links
   * @returns Array of share links
   */
  static async getShareLinks(): Promise<ShareLink[]> {
    await this.loadShareLinks();
    return [...this.shareLinks];
  }

  /**
   * Gets a specific share link
   * @param linkId Share link ID
   * @returns Share link or undefined
   */
  static async getShareLink(linkId: string): Promise<ShareLink | undefined> {
    await this.loadShareLinks();
    return this.shareLinks.find(s => s.id === linkId);
  }

  /**
   * Updates share link options
   * @param linkId Share link ID
   * @param updates Fields to update
   */
  static async updateShareLink(linkId: string, updates: Partial<ShareLink>): Promise<void> {
    const index = this.shareLinks.findIndex(s => s.id === linkId);

    if (index === -1) {
      throw new Error('Share link not found');
    }

    this.shareLinks[index] = {
      ...this.shareLinks[index],
      ...updates,
    };

    await this.saveShareLinks();
  }

  /**
   * Generates share URL
   * @param linkId Share link ID
   * @returns Share URL
   */
  private static buildShareUrl(linkId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/${linkId}`;
  }

  /**
   * Generates random share link ID
   * @returns Link ID
   */
  private static generateLinkId(): string {
    return `share-${Date.now()}-${Math.random().toString(36).substr(2, 11)}`;
  }

  /**
   * Generates share-specific encryption key
   * @returns Share key
   */
  private static async generateShareKey(): Promise<Uint8Array> {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  /**
   * Loads share links from storage
   */
  private static async loadShareLinks(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.shareLinks = JSON.parse(stored) as ShareLink[];
      }
    } catch (error) {
      console.error('Failed to load share links:', error);
      this.shareLinks = [];
    }
  }

  /**
   * Saves share links to storage
   */
  private static async saveShareLinks(): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.shareLinks));
    } catch (error) {
      console.error('Failed to save share links:', error);
      throw new Error('Failed to save share links');
    }
  }

  /**
   * Fetches encrypted PDF from storage
   * @param fileId File ID
   * @returns Encrypted PDF data
   */
  private static async fetchEncryptedPDF(fileId: string): Promise<{
    ciphertext: string;
    nonce: string;
    authTag: string;
  }> {
    // In real implementation, fetch from database or storage
    const { getPDF } = await import('../lib/db').then(m => m);
    const pdf = await getPDF(fileId);

    if (!pdf) {
      throw new Error('PDF not found');
    }

    return {
      ciphertext: pdf.ciphertext,
      nonce: pdf.nonce,
      authTag: pdf.authTag,
    };
  }

  /**
   * Validates share link configuration
   * @param config Share configuration
   * @returns True if valid
   */
  static validateShareConfig(config: { expiresAt?: Date; maxViews?: number }): boolean {
    // Validate expiration
    if (config.expiresAt && config.expiresAt < new Date()) {
      return false;
    }

    // Validate max views
    if (config.maxViews && config.maxViews < 1) {
      return false;
    }

    return true;
  }

  /**
   * Gets share link statistics
   * @param linkId Share link ID
   * @returns Statistics object
   */
  static async getShareStats(linkId: string): Promise<{
    totalViews: number;
    maxViews: number | undefined;
    expiresAt: Date | undefined;
    isExpired: boolean;
  }> {
    const shareLink = await this.getShareLink(linkId);

    if (!shareLink) {
      throw new Error('Share link not found');
    }

    return {
      totalViews: shareLink.viewCount,
      maxViews: shareLink.maxViews,
      expiresAt: shareLink.expiresAt,
      isExpired: shareLink.expiresAt ? shareLink.expiresAt < new Date() : false,
    };
  }

  /**
   * Cleans up expired share links
   */
  static async cleanupExpiredLinks(): Promise<number> {
    const now = new Date();
    const initialCount = this.shareLinks.length;

    this.shareLinks = this.shareLinks.filter(s => !s.expiresAt || s.expiresAt >= now);

    const removedCount = initialCount - this.shareLinks.length;
    await this.saveShareLinks();

    return removedCount;
  }
}
