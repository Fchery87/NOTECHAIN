// apps/web/src/lib/repositories/AnalyticsRepository.ts
import { supabase, SupabaseClient } from '../supabaseClient';
import { decryptData } from '@notechain/core-crypto';
import type { Todo, Note } from '@notechain/data-models';

/**
 * Database representation of an encrypted blob
 */
interface BlobRow {
  id: string;
  user_id: string;
  blob_type: string;
  ciphertext: string;
  nonce: string;
  auth_tag: string;
  key_id: string;
  metadata_hash: string;
  version: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Daily task volume data point
 */
export interface DailyTaskVolume {
  date: Date;
  count: number;
}

/**
 * Peak productivity data by hour
 */
export interface HourlyProductivity {
  hour: number;
  count: number;
}

/**
 * Repository for analytics queries on encrypted data
 * Uses encrypted_blobs table for data retrieval
 */
export class AnalyticsRepository {
  private client: SupabaseClient;
  private userId: string;
  private encryptionKey: Uint8Array;

  constructor(userId: string, encryptionKey: Uint8Array, client?: SupabaseClient) {
    this.userId = userId;
    this.encryptionKey = encryptionKey;
    this.client = client ?? supabase;
  }

  /**
   * Get todos created within a date range
   */
  async getTodosInRange(startDate: Date, endDate: Date): Promise<Todo[]> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('blob_type', 'todo')
      .eq('is_deleted', false)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    const todos: Todo[] = [];
    for (const row of data || []) {
      const todo = await this.decryptTodo(row as BlobRow);
      if (todo) todos.push(todo);
    }

    return todos;
  }

  /**
   * Get notes created within a date range
   */
  async getNotesInRange(startDate: Date, endDate: Date): Promise<Note[]> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('blob_type', 'note')
      .eq('is_deleted', false)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    const notes: Note[] = [];
    for (const row of data || []) {
      const note = await this.decryptNote(row as BlobRow);
      if (note) notes.push(note);
    }

    return notes;
  }

  /**
   * Get count of completed todos within a date range
   */
  async getCompletedTodosCount(startDate: Date, endDate: Date): Promise<number> {
    // Get all todos in the range and filter by completedAt
    const todos = await this.getTodosInRange(startDate, endDate);

    return todos.filter(todo => {
      if (todo.status !== 'completed' || !todo.completedAt) return false;
      const completedAt = new Date(todo.completedAt);
      return completedAt >= startDate && completedAt <= endDate;
    }).length;
  }

  /**
   * Get task volume by day for the past N days
   */
  async getTaskVolumeByDay(days: number): Promise<DailyTaskVolume[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .in('blob_type', ['todo', 'note'])
      .eq('is_deleted', false)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Initialize volume map for all days in range
    const volumeMap = new Map<string, number>();
    for (let i = 0; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      volumeMap.set(dateKey, 0);
    }

    // Count items per day using database created_at (no decryption needed for counting)
    for (const row of data || []) {
      const createdAt = new Date((row as BlobRow).created_at);
      const dateKey = createdAt.toISOString().split('T')[0];
      const current = volumeMap.get(dateKey) ?? 0;
      volumeMap.set(dateKey, current + 1);
    }

    // Convert to array and sort by date
    const result: DailyTaskVolume[] = [];
    volumeMap.forEach((count, dateKey) => {
      result.push({ date: new Date(dateKey), count });
    });

    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get peak productivity data by hour for the past N days
   * Analyzes when tasks were completed
   */
  async getPeakProductivityData(days: number): Promise<HourlyProductivity[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all todos in range to check completion times
    const todos = await this.getTodosInRange(startDate, endDate);

    // Initialize hour buckets (0-23)
    const hourMap = new Map<number, number>();
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, 0);
    }

    // Count completed tasks by hour
    for (const todo of todos) {
      if (todo.status === 'completed' && todo.completedAt) {
        const completedAt = new Date(todo.completedAt);
        // Only count if completion was within our date range
        if (completedAt >= startDate && completedAt <= endDate) {
          const hour = completedAt.getHours();
          const current = hourMap.get(hour) ?? 0;
          hourMap.set(hour, current + 1);
        }
      }
    }

    // Convert to array
    const result: HourlyProductivity[] = [];
    hourMap.forEach((count, hour) => {
      result.push({ hour, count });
    });

    return result.sort((a, b) => a.hour - b.hour);
  }

  /**
   * Get activity summary for a date range
   */
  async getActivitySummary(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalTodos: number;
    completedTodos: number;
    totalNotes: number;
    completionRate: number;
  }> {
    const [todos, notes] = await Promise.all([
      this.getTodosInRange(startDate, endDate),
      this.getNotesInRange(startDate, endDate),
    ]);

    const completedTodos = todos.filter(t => t.status === 'completed').length;
    const completionRate = todos.length > 0 ? (completedTodos / todos.length) * 100 : 0;

    return {
      totalTodos: todos.length,
      completedTodos,
      totalNotes: notes.length,
      completionRate,
    };
  }

  /**
   * Decrypt a todo from database row
   */
  private async decryptTodo(row: BlobRow): Promise<Todo | null> {
    try {
      const decrypted = await decryptData(
        {
          ciphertext: row.ciphertext,
          nonce: row.nonce,
          authTag: row.auth_tag,
        },
        this.encryptionKey
      );

      const todo: Todo = JSON.parse(decrypted);
      // Ensure dates are Date objects
      todo.createdAt = new Date(todo.createdAt);
      todo.updatedAt = new Date(todo.updatedAt);
      if (todo.dueDate) todo.dueDate = new Date(todo.dueDate);
      if (todo.completedAt) todo.completedAt = new Date(todo.completedAt);
      return todo;
    } catch (error) {
      console.error('Failed to decrypt todo:', error);
      return null;
    }
  }

  /**
   * Decrypt a note from database row
   */
  private async decryptNote(row: BlobRow): Promise<Note | null> {
    try {
      const decrypted = await decryptData(
        {
          ciphertext: row.ciphertext,
          nonce: row.nonce,
          authTag: row.auth_tag,
        },
        this.encryptionKey
      );

      const note: Note = JSON.parse(decrypted);
      // Ensure dates are Date objects
      note.createdAt = new Date(note.createdAt);
      note.updatedAt = new Date(note.updatedAt);
      return note;
    } catch (error) {
      console.error('Failed to decrypt note:', error);
      return null;
    }
  }
}

/**
 * Factory function to create an AnalyticsRepository instance
 */
export function createAnalyticsRepository(
  userId: string,
  encryptionKey: Uint8Array,
  client?: SupabaseClient
): AnalyticsRepository {
  return new AnalyticsRepository(userId, encryptionKey, client);
}
