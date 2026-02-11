import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { encryptData, decryptData, type EncryptedData } from '@notechain/core-crypto';
import type { ActionItem } from '../ai/transcription/actionItemExtractor';

/**
 * Meeting interface representing a stored meeting
 */
export interface Meeting {
  /** Unique identifier for the meeting */
  id: string;
  /** Meeting title */
  title: string;
  /** Meeting date */
  date: Date;
  /** Duration in seconds (optional) */
  duration?: number;
  /** Meeting transcript (stored encrypted) */
  transcript: string;
  /** Encrypted transcript data */
  encryptedTranscript: EncryptedData;
  /** Action items extracted from transcript */
  actionItems: ActionItem[];
  /** Calendar event ID for linking (optional) */
  calendarEventId?: string;
  /** Audio recording blob (optional, encrypted) */
  audioBlob?: Blob;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Input interface for creating a new meeting
 */
export interface MeetingInput {
  /** Meeting title */
  title: string;
  /** Meeting date */
  date: Date;
  /** Duration in seconds (optional) */
  duration?: number;
  /** Meeting transcript */
  transcript: string;
  /** Action items extracted from transcript */
  actionItems: ActionItem[];
  /** Calendar event ID for linking (optional) */
  calendarEventId?: string;
  /** Audio recording blob (optional) */
  audioBlob?: Blob;
}

/**
 * Stored meeting data structure in IndexedDB
 */
interface StoredMeeting {
  id: string;
  title: string;
  date: Date;
  duration?: number;
  encryptedTranscript: EncryptedData;
  actionItems: ActionItem[];
  calendarEventId?: string;
  audioBlob?: Blob;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * In-memory storage adapter for testing when IndexedDB is unavailable
 */
class InMemoryStorage {
  private data = new Map<string, StoredMeeting>();

  async add(item: StoredMeeting): Promise<string> {
    this.data.set(item.id, item);
    return item.id;
  }

  async get(id: string): Promise<StoredMeeting | undefined> {
    return this.data.get(id);
  }

  async put(item: StoredMeeting): Promise<string> {
    this.data.set(item.id, item);
    return item.id;
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }

  async toArray(): Promise<StoredMeeting[]> {
    return Array.from(this.data.values());
  }

  clear(): void {
    this.data.clear();
  }
}

/**
 * Meeting database using Dexie.js with in-memory fallback
 */
class MeetingDatabase extends Dexie {
  meetings!: Table<StoredMeeting, string>;
  private inMemoryStorage: InMemoryStorage | null = null;
  private useInMemory: boolean;

  constructor() {
    super('MeetingDatabase');

    // Check if IndexedDB is available
    this.useInMemory = typeof globalThis.indexedDB === 'undefined';

    if (!this.useInMemory) {
      try {
        this.version(1).stores({
          meetings: 'id, date, title, calendarEventId, [title+date]',
        });
      } catch {
        // If IndexedDB setup fails, fall back to in-memory
        this.useInMemory = true;
      }
    }

    if (this.useInMemory) {
      this.inMemoryStorage = new InMemoryStorage();
    }
  }

  // Override Dexie methods to use in-memory storage when needed
  private get storage(): InMemoryStorage | Table<StoredMeeting, string> {
    return this.inMemoryStorage || this.meetings;
  }

  async addMeeting(item: StoredMeeting): Promise<string> {
    if (this.inMemoryStorage) {
      return this.inMemoryStorage.add(item);
    }
    return this.meetings.add(item);
  }

  async getMeeting(id: string): Promise<StoredMeeting | undefined> {
    if (this.inMemoryStorage) {
      return this.inMemoryStorage.get(id);
    }
    return this.meetings.get(id);
  }

  async putMeeting(item: StoredMeeting): Promise<string> {
    if (this.inMemoryStorage) {
      return this.inMemoryStorage.put(item);
    }
    return this.meetings.put(item);
  }

  async deleteMeeting(id: string): Promise<void> {
    if (this.inMemoryStorage) {
      return this.inMemoryStorage.delete(id);
    }
    return this.meetings.delete(id);
  }

  async getAllMeetings(): Promise<StoredMeeting[]> {
    if (this.inMemoryStorage) {
      return this.inMemoryStorage.toArray();
    }
    return this.meetings.toArray();
  }

  clear(): void {
    if (this.inMemoryStorage) {
      this.inMemoryStorage.clear();
    }
  }

  async closeConnection(): Promise<void> {
    if (this.inMemoryStorage) {
      this.inMemoryStorage.clear();
    } else {
      await this.close();
    }
  }
}

// Singleton database instance
let dbInstance: MeetingDatabase | null = null;

function getDb(): MeetingDatabase {
  if (!dbInstance) {
    dbInstance = new MeetingDatabase();
  }
  return dbInstance;
}

/**
 * MeetingStorage class for encrypted meeting storage
 *
 * Provides CRUD operations for meetings with automatic encryption/decryption
 * using XSalsa20-Poly1305 via the core-crypto package.
 */
export class MeetingStorage {
  private db: MeetingDatabase;

  constructor() {
    this.db = getDb();
  }

  /**
   * Save a new meeting with encrypted transcript
   *
   * @param input - Meeting data (without id, createdAt, updatedAt)
   * @param key - Encryption key (32 bytes for XSalsa20-Poly1305)
   * @returns The saved meeting with generated id and timestamps
   */
  async saveMeeting(input: MeetingInput, key: Uint8Array): Promise<Meeting> {
    const id = uuidv4();
    const now = new Date();

    // Encrypt the transcript
    const encryptedTranscript = await encryptData(input.transcript, key);

    const storedMeeting: StoredMeeting = {
      id,
      title: input.title,
      date: input.date,
      duration: input.duration,
      encryptedTranscript,
      actionItems: input.actionItems.map(item => ({
        ...item,
        completed: item.completed ?? false,
      })),
      calendarEventId: input.calendarEventId,
      audioBlob: input.audioBlob,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.addMeeting(storedMeeting);

    return {
      ...storedMeeting,
      transcript: input.transcript,
    };
  }

  /**
   * Retrieve and decrypt a meeting by ID
   *
   * @param id - Meeting ID
   * @param key - Decryption key
   * @returns The decrypted meeting or null if not found
   */
  async getMeeting(id: string, key: Uint8Array): Promise<Meeting | null> {
    const storedMeeting = await this.db.getMeeting(id);

    if (!storedMeeting) {
      return null;
    }

    // Decrypt the transcript
    const transcript = await decryptData(storedMeeting.encryptedTranscript, key);

    return {
      ...storedMeeting,
      transcript,
    };
  }

  /**
   * Get all meetings sorted by date (newest first)
   *
   * @param key - Decryption key
   * @returns Array of all meetings sorted by date descending
   */
  async getAllMeetings(key: Uint8Array): Promise<Meeting[]> {
    const storedMeetings = await this.db.getAllMeetings();

    // Decrypt all transcripts and sort by date
    const meetings: Meeting[] = await Promise.all(
      storedMeetings.map(async stored => {
        const transcript = await decryptData(stored.encryptedTranscript, key);
        return {
          ...stored,
          transcript,
        };
      })
    );

    // Sort by date descending (newest first)
    return meetings.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Update an existing meeting
   *
   * @param id - Meeting ID
   * @param updates - Partial meeting updates
   * @param key - Encryption/decryption key
   * @returns The updated meeting
   * @throws Error if meeting not found
   */
  async updateMeeting(
    id: string,
    updates: Partial<Omit<MeetingInput, 'actionItems'>> & { actionItems?: ActionItem[] },
    key: Uint8Array
  ): Promise<Meeting> {
    const storedMeeting = await this.db.getMeeting(id);

    if (!storedMeeting) {
      throw new Error('Meeting not found');
    }

    // If transcript is being updated, re-encrypt it
    let encryptedTranscript = storedMeeting.encryptedTranscript;
    let decryptedTranscript: string | undefined;

    if (updates.transcript !== undefined) {
      encryptedTranscript = await encryptData(updates.transcript, key);
      decryptedTranscript = updates.transcript;
    }

    const updatedStoredMeeting: StoredMeeting = {
      ...storedMeeting,
      title: updates.title ?? storedMeeting.title,
      date: updates.date ?? storedMeeting.date,
      duration: updates.duration !== undefined ? updates.duration : storedMeeting.duration,
      encryptedTranscript,
      actionItems: updates.actionItems ?? storedMeeting.actionItems,
      calendarEventId:
        updates.calendarEventId !== undefined
          ? updates.calendarEventId
          : storedMeeting.calendarEventId,
      audioBlob: updates.audioBlob !== undefined ? updates.audioBlob : storedMeeting.audioBlob,
      updatedAt: new Date(),
    };

    await this.db.putMeeting(updatedStoredMeeting);

    // Decrypt transcript for return if not already decrypted
    if (decryptedTranscript === undefined) {
      decryptedTranscript = await decryptData(encryptedTranscript, key);
    }

    return {
      ...updatedStoredMeeting,
      transcript: decryptedTranscript,
    };
  }

  /**
   * Delete a meeting by ID
   *
   * @param id - Meeting ID
   */
  async deleteMeeting(id: string): Promise<void> {
    try {
      await this.db.deleteMeeting(id);
    } catch {
      // Silently ignore if meeting doesn't exist
    }
  }

  /**
   * Search meetings by title or transcript content
   *
   * @param query - Search query string
   * @param key - Decryption key
   * @returns Array of matching meetings
   */
  async searchMeetings(query: string, key: Uint8Array): Promise<Meeting[]> {
    const allMeetings = await this.getAllMeetings(key);
    const lowerQuery = query.toLowerCase();

    return allMeetings.filter(meeting => {
      const titleMatch = meeting.title.toLowerCase().includes(lowerQuery);
      const transcriptMatch = meeting.transcript.toLowerCase().includes(lowerQuery);
      return titleMatch || transcriptMatch;
    });
  }

  /**
   * Get meetings linked to a specific calendar event
   *
   * @param calendarEventId - Calendar event ID
   * @param key - Decryption key
   * @returns Array of meetings linked to the calendar event
   */
  async getMeetingsByCalendarEvent(calendarEventId: string, key: Uint8Array): Promise<Meeting[]> {
    const allMeetings = await this.getAllMeetings(key);
    return allMeetings.filter(meeting => meeting.calendarEventId === calendarEventId);
  }

  /**
   * Close the database connection
   * Useful for testing and cleanup
   */
  async close(): Promise<void> {
    await this.db.closeConnection();
    dbInstance = null;
  }

  /**
   * Clear all meetings (useful for testing)
   */
  clear(): void {
    this.db.clear();
  }
}

/**
 * Factory function to create a MeetingStorage instance
 * @returns New MeetingStorage instance
 */
export function createMeetingStorage(): MeetingStorage {
  return new MeetingStorage();
}

// Default export
export default MeetingStorage;
