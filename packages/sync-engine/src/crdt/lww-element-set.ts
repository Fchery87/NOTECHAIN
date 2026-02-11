// packages/sync-engine/src/crdt/lww-element-set.ts

/**
 * Entry in the LWW Element Set containing value, timestamp, and node identifier
 */
export interface LWWEntry<T> {
  value: T;
  timestamp: number;
  nodeId: string;
}

/**
 * Last-Write-Wins Element Set CRDT implementation
 *
 * This CRDT maintains two sets:
 * - addSet: tracks elements that have been added with timestamps
 * - removeSet: tracks elements that have been removed with timestamps
 *
 * An element is considered present if it exists in addSet with a timestamp
 * greater than any entry in removeSet for the same element.
 */
export class LWWElementSet<T> {
  private addSet: Map<string, LWWEntry<T>> = new Map();
  private removeSet: Map<string, LWWEntry<T>> = new Map();

  /**
   * Adds an element to the set with the given timestamp and node ID
   * @param elementId Unique identifier for the element
   * @param value The value to store
   * @param timestamp Unix timestamp in milliseconds
   * @param nodeId Identifier of the node performing the operation
   */
  add(elementId: string, value: T, timestamp: number, nodeId: string): void {
    const existing = this.addSet.get(elementId);

    // Update if: no existing entry, OR newer timestamp, OR same timestamp but higher nodeId (tie-breaker)
    if (
      !existing ||
      timestamp > existing.timestamp ||
      (timestamp === existing.timestamp && nodeId > existing.nodeId)
    ) {
      this.addSet.set(elementId, { value, timestamp, nodeId });
    }
  }

  /**
   * Marks an element as removed with the given timestamp and node ID
   * @param elementId Unique identifier for the element
   * @param timestamp Unix timestamp in milliseconds
   * @param nodeId Identifier of the node performing the operation
   */
  remove(elementId: string, timestamp: number, nodeId: string): void {
    const existing = this.removeSet.get(elementId);

    // Update if: no existing entry, OR newer timestamp, OR same timestamp but higher nodeId (tie-breaker)
    if (
      !existing ||
      timestamp > existing.timestamp ||
      (timestamp === existing.timestamp && nodeId > existing.nodeId)
    ) {
      this.removeSet.set(elementId, { value: undefined as unknown as T, timestamp, nodeId });
    }
  }

  /**
   * Returns all current values (excluding removed elements)
   * An element is included if:
   * 1. It exists in addSet
   * 2. Either it doesn't exist in removeSet, OR add timestamp > remove timestamp
   */
  values(): Array<{ elementId: string; value: T }> {
    const result: Array<{ elementId: string; value: T }> = [];

    for (const [elementId, addEntry] of this.addSet.entries()) {
      const removeEntry = this.removeSet.get(elementId);

      // Include if not removed, or add timestamp is newer than remove timestamp
      if (!removeEntry || addEntry.timestamp > removeEntry.timestamp) {
        result.push({ elementId, value: addEntry.value });
      }
    }

    return result;
  }

  /**
   * Returns all values as a Map for easier access
   */
  valueMap(): Map<string, T> {
    const result = new Map<string, T>();

    for (const { elementId, value } of this.values()) {
      result.set(elementId, value);
    }

    return result;
  }

  /**
   * Checks if an element is currently in the set
   */
  has(elementId: string): boolean {
    const addEntry = this.addSet.get(elementId);
    if (!addEntry) return false;

    const removeEntry = this.removeSet.get(elementId);
    if (!removeEntry) return true;

    return addEntry.timestamp > removeEntry.timestamp;
  }

  /**
   * Gets the value for an element if it exists
   */
  get(elementId: string): T | undefined {
    if (!this.has(elementId)) return undefined;
    return this.addSet.get(elementId)?.value;
  }

  /**
   * Merges another LWWElementSet into this one
   * For each entry, keeps the one with the higher timestamp (Last-Write-Wins)
   * Uses nodeId as tie-breaker when timestamps are equal
   * @param other Another LWWElementSet to merge
   */
  merge(other: LWWElementSet<T>): void {
    // Merge addSet
    for (const [elementId, entry] of other.addSet.entries()) {
      const existing = this.addSet.get(elementId);
      if (
        !existing ||
        entry.timestamp > existing.timestamp ||
        (entry.timestamp === existing.timestamp && entry.nodeId > existing.nodeId)
      ) {
        this.addSet.set(elementId, entry);
      }
    }

    // Merge removeSet
    for (const [elementId, entry] of other.removeSet.entries()) {
      const existing = this.removeSet.get(elementId);
      if (
        !existing ||
        entry.timestamp > existing.timestamp ||
        (entry.timestamp === existing.timestamp && entry.nodeId > existing.nodeId)
      ) {
        this.removeSet.set(elementId, entry);
      }
    }
  }

  /**
   * Returns the addSet for serialization/debugging
   */
  getAddSet(): Map<string, LWWEntry<T>> {
    return new Map(this.addSet);
  }

  /**
   * Returns the removeSet for serialization/debugging
   */
  getRemoveSet(): Map<string, LWWEntry<T>> {
    return new Map(this.removeSet);
  }

  /**
   * Creates a new LWWElementSet from serialized data
   */
  static fromJSON<T>(data: {
    addSet: Array<[string, LWWEntry<T>]>;
    removeSet: Array<[string, LWWEntry<T>]>;
  }): LWWElementSet<T> {
    const set = new LWWElementSet<T>();

    for (const [elementId, entry] of data.addSet) {
      set.addSet.set(elementId, entry);
    }

    for (const [elementId, entry] of data.removeSet) {
      set.removeSet.set(elementId, entry);
    }

    return set;
  }

  /**
   * Serializes the LWWElementSet to JSON
   */
  toJSON(): {
    addSet: Array<[string, LWWEntry<T>]>;
    removeSet: Array<[string, LWWEntry<T>]>;
  } {
    return {
      addSet: Array.from(this.addSet.entries()),
      removeSet: Array.from(this.removeSet.entries()),
    };
  }
}
