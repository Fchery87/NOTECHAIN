import { VectorClockMap, VectorClockComparison } from './types';

/**
 * Vector Clock implementation for tracking causality in distributed systems.
 *
 * Each user has a counter that increments with each operation they perform.
 * Vector clocks allow us to determine if operations are:
 * - causally related (happen-before relationship)
 * - concurrent (independent, need conflict resolution)
 * - equal (same state)
 */
export class VectorClock {
  private clock: Map<string, number>;

  constructor(initialClock?: VectorClockMap) {
    this.clock = new Map<string, number>();

    if (initialClock) {
      Object.entries(initialClock).forEach(([userId, timestamp]) => {
        this.clock.set(userId, timestamp);
      });
    }
  }

  /**
   * Increment the counter for a specific user
   */
  increment(userId: string): void {
    const current = this.clock.get(userId) || 0;
    this.clock.set(userId, current + 1);
  }

  /**
   * Get the current timestamp for a user
   */
  get(userId: string): number {
    return this.clock.get(userId) || 0;
  }

  /**
   * Merge another vector clock into this one
   * Takes the maximum value for each user
   */
  merge(other: VectorClock): void {
    other.clock.forEach((timestamp, userId) => {
      const current = this.clock.get(userId) || 0;
      this.clock.set(userId, Math.max(current, timestamp));
    });
  }

  /**
   * Compare this vector clock with another
   * Returns: 'before' | 'after' | 'concurrent' | 'equal'
   */
  compare(other: VectorClock): VectorClockComparison {
    const allUsers = new Set([...this.clock.keys(), ...other.clock.keys()]);

    let thisDominates = false;
    let otherDominates = false;

    for (const userId of allUsers) {
      const thisValue = this.clock.get(userId) || 0;
      const otherValue = other.clock.get(userId) || 0;

      if (thisValue > otherValue) {
        thisDominates = true;
      } else if (otherValue > thisValue) {
        otherDominates = true;
      }

      // Early exit if we've established both dominate
      if (thisDominates && otherDominates) {
        return 'concurrent';
      }
    }

    if (thisDominates && !otherDominates) {
      return 'after';
    } else if (!thisDominates && otherDominates) {
      return 'before';
    } else {
      return 'equal';
    }
  }

  /**
   * Check if this vector clock happens before another
   */
  happensBefore(other: VectorClock): boolean {
    return this.compare(other) === 'before';
  }

  /**
   * Check if this vector clock happens after another
   */
  happensAfter(other: VectorClock): boolean {
    return this.compare(other) === 'after';
  }

  /**
   * Check if this vector clock is concurrent with another
   */
  isConcurrent(other: VectorClock): boolean {
    return this.compare(other) === 'concurrent';
  }

  /**
   * Check if two vector clocks are equal
   */
  equals(other: VectorClock): boolean {
    return this.compare(other) === 'equal';
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): VectorClockMap {
    const result: VectorClockMap = {};
    this.clock.forEach((timestamp, userId) => {
      result[userId] = timestamp;
    });
    return result;
  }

  /**
   * Create a VectorClock from a plain object
   */
  static fromJSON(data: VectorClockMap): VectorClock {
    return new VectorClock(data);
  }

  /**
   * Create a copy of this vector clock
   */
  clone(): VectorClock {
    return VectorClock.fromJSON(this.toJSON());
  }

  /**
   * Get all user IDs in this vector clock
   */
  getUserIds(): string[] {
    return Array.from(this.clock.keys());
  }

  /**
   * Check if this vector clock has any entries
   */
  isEmpty(): boolean {
    return this.clock.size === 0;
  }

  /**
   * Get the maximum timestamp across all users
   */
  getMaxTimestamp(): number {
    let max = 0;
    this.clock.forEach(timestamp => {
      max = Math.max(max, timestamp);
    });
    return max;
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    const entries = Array.from(this.clock.entries())
      .map(([userId, timestamp]) => `${userId}:${timestamp}`)
      .join(', ');
    return `VectorClock{${entries}}`;
  }
}
