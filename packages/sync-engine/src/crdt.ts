// packages/sync-engine/src/crdt.ts

/**
 * A simple Last-Writer-Wins (LWW) element set implementation
 * This is a basic CRDT for handling concurrent updates
 */
export class LWWElementSet<T> {
  private addSet: Map<string, { value: T; timestamp: number; nodeId: string }>;
  private removeSet: Map<string, { timestamp: number; nodeId: string }>;

  constructor() {
    this.addSet = new Map();
    this.removeSet = new Map();
  }

  /**
   * Adds an element to the set
   * @param element The element to add
   * @param timestamp The timestamp of the operation
   * @param nodeId The ID of the node performing the operation
   */
  add(element: T, timestamp: number, nodeId: string): void {
    const elementId = JSON.stringify(element); // Simple ID generation
    this.addSet.set(elementId, { value: element, timestamp, nodeId });
  }

  /**
   * Removes an element from the set
   * @param element The element to remove
   * @param timestamp The timestamp of the operation
   * @param nodeId The ID of the node performing the operation
   */
  remove(element: T, timestamp: number, nodeId: string): void {
    const elementId = JSON.stringify(element);
    this.removeSet.set(elementId, { timestamp, nodeId });
  }

  /**
   * Checks if an element is in the set
   * @param element The element to check
   * @returns True if the element is in the set
   */
  contains(element: T): boolean {
    const elementId = JSON.stringify(element);

    const addEntry = this.addSet.get(elementId);
    const removeEntry = this.removeSet.get(elementId);

    // If it was never added, it's not in the set
    if (!addEntry) {
      return false;
    }

    // If it was never removed, it's in the set
    if (!removeEntry) {
      return true;
    }

    // If the add operation is more recent than the remove operation, it's in the set
    return addEntry.timestamp > removeEntry.timestamp;
  }

  /**
   * Gets all elements in the set
   * @returns Array of all elements in the set
   */
  elements(): T[] {
    const result: T[] = [];

    for (const [, addEntry] of this.addSet.entries()) {
      if (this.contains(addEntry.value)) {
        result.push(addEntry.value);
      }
    }

    return result;
  }

  /**
   * Merges this set with another set
   * @param other The other set to merge with
   */
  merge(other: LWWElementSet<T>): void {
    // Merge add sets - take the entry with the later timestamp
    for (const [elementId, otherAddEntry] of other.addSet.entries()) {
      const thisAddEntry = this.addSet.get(elementId);

      if (!thisAddEntry) {
        // Other has an entry this doesn't have
        this.addSet.set(elementId, otherAddEntry);
      } else if (otherAddEntry.timestamp > thisAddEntry.timestamp) {
        // Other has a more recent entry
        this.addSet.set(elementId, otherAddEntry);
      }
    }

    // Merge remove sets - take the entry with the later timestamp
    for (const [elementId, otherRemoveEntry] of other.removeSet.entries()) {
      const thisRemoveEntry = this.removeSet.get(elementId);

      if (!thisRemoveEntry) {
        // Other has an entry this doesn't have
        this.removeSet.set(elementId, otherRemoveEntry);
      } else if (otherRemoveEntry.timestamp > thisRemoveEntry.timestamp) {
        // Other has a more recent entry
        this.removeSet.set(elementId, otherRemoveEntry);
      }
    }
  }
}
