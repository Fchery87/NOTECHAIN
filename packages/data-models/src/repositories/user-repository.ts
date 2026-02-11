// packages/data-models/src/repositories/user-repository.ts

import type { User, AccountTier } from '../types/user';

/**
 * Repository interface for User operations
 * Implementations handle the actual database/storage layer
 */
export interface IUserRepository {
  /**
   * Create a new user
   * @param emailHash - Hashed email address
   * @param accountTier - User's subscription tier
   * @returns The created User
   */
  createUser(emailHash: string, accountTier: AccountTier): Promise<User>;

  /**
   * Get a user by their ID
   * @param id - User's unique identifier
   * @returns The User or null if not found
   */
  getUserById(id: string): Promise<User | null>;

  /**
   * Get a user by their email hash
   * @param emailHash - Hashed email address
   * @returns The User or null if not found
   */
  getUserByEmailHash(emailHash: string): Promise<User | null>;

  /**
   * Update a user's account tier
   * @param userId - User's unique identifier
   * @param tier - New account tier
   * @returns The updated User
   * @throws Error if user not found
   */
  updateAccountTier(userId: string, tier: AccountTier): Promise<User>;
}

/**
 * In-memory implementation of UserRepository for testing
 * This demonstrates the repository pattern without requiring a database
 */
export class UserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map(); // emailHash -> userId

  /**
   * Generate a UUID v4
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async createUser(emailHash: string, accountTier: AccountTier): Promise<User> {
    const now = new Date();
    const user: User = {
      id: this.generateId(),
      emailHash,
      accountTier,
      createdAt: now,
    };

    this.users.set(user.id, user);
    this.emailIndex.set(emailHash, user.id);

    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async getUserByEmailHash(emailHash: string): Promise<User | null> {
    const userId = this.emailIndex.get(emailHash);
    if (!userId) {
      return null;
    }
    return this.getUserById(userId);
  }

  async updateAccountTier(userId: string, tier: AccountTier): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const updatedUser: User = {
      ...user,
      accountTier: tier,
    };

    this.users.set(userId, updatedUser);
    return { ...updatedUser };
  }

  /**
   * Clear all users (useful for testing)
   */
  clear(): void {
    this.users.clear();
    this.emailIndex.clear();
  }

  /**
   * Get count of users (useful for testing)
   */
  count(): number {
    return this.users.size;
  }
}

/**
 * Factory function to create a UserRepository instance
 */
export function createUserRepository(): IUserRepository {
  return new UserRepository();
}
