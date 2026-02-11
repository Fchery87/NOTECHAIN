// apps/web/src/lib/repositories/TodoRepository.ts
import { supabase, SupabaseClient } from '../supabaseClient';
import { encryptData, decryptData } from '@notechain/core-crypto';
import type { Todo } from '@notechain/data-models';

/**
 * Database representation of an encrypted blob for todos
 */
interface TodoBlobRow {
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
 * Repository for managing todos with encryption
 * Uses encrypted_blobs table for storage
 */
export class TodoRepository {
  private client: SupabaseClient;
  private userId: string;
  private encryptionKey: Uint8Array;

  constructor(userId: string, encryptionKey: Uint8Array, client?: SupabaseClient) {
    this.userId = userId;
    this.encryptionKey = encryptionKey;
    this.client = client ?? supabase;
  }

  /**
   * Create a new todo
   */
  async create(todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'syncVersion'>): Promise<Todo> {
    const id = crypto.randomUUID();
    const now = new Date();
    const version = 1;

    const todoData: Todo = {
      ...todo,
      id,
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
      syncVersion: version,
    };

    // Encrypt todo data
    const encrypted = await encryptData(JSON.stringify(todoData), this.encryptionKey);

    // Store in encrypted_blobs
    const { error } = await this.client.from('encrypted_blobs').insert({
      id,
      user_id: this.userId,
      blob_type: 'todo',
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      auth_tag: encrypted.authTag,
      key_id: crypto.randomUUID(),
      metadata_hash: '',
      version,
      is_deleted: false,
    });

    if (error) throw error;

    return todoData;
  }

  /**
   * Get a todo by ID
   */
  async getById(todoId: string): Promise<Todo | null> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('id', todoId)
      .eq('user_id', this.userId)
      .eq('blob_type', 'todo')
      .eq('is_deleted', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.decryptTodo(data as TodoBlobRow);
  }

  /**
   * Get all todos for the user
   */
  async getAll(limit: number = 100, offset: number = 0): Promise<Todo[]> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('blob_type', 'todo')
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const todos: Todo[] = [];
    for (const row of data || []) {
      const todo = await this.decryptTodo(row as TodoBlobRow);
      if (todo) todos.push(todo);
    }

    return todos;
  }

  /**
   * Get todos by status
   */
  async getByStatus(status: Todo['status']): Promise<Todo[]> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('blob_type', 'todo')
      .eq('is_deleted', false);

    if (error) throw error;

    const todos: Todo[] = [];
    for (const row of data || []) {
      const todo = await this.decryptTodo(row as TodoBlobRow);
      if (todo && todo.status === status) {
        todos.push(todo);
      }
    }

    return todos;
  }

  /**
   * Get todos by project ID
   */
  async getByProjectId(projectId: string): Promise<Todo[]> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('blob_type', 'todo')
      .eq('is_deleted', false);

    if (error) throw error;

    const todos: Todo[] = [];
    for (const row of data || []) {
      const todo = await this.decryptTodo(row as TodoBlobRow);
      if (todo && todo.projectId === projectId) {
        todos.push(todo);
      }
    }

    return todos;
  }

  /**
   * Get todos with due dates in a range
   */
  async getByDueDateRange(startDate: Date, endDate: Date): Promise<Todo[]> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('blob_type', 'todo')
      .eq('is_deleted', false);

    if (error) throw error;

    const todos: Todo[] = [];
    for (const row of data || []) {
      const todo = await this.decryptTodo(row as TodoBlobRow);
      if (todo && todo.dueDate) {
        const dueDate = new Date(todo.dueDate);
        if (dueDate >= startDate && dueDate <= endDate) {
          todos.push(todo);
        }
      }
    }

    return todos;
  }

  /**
   * Update a todo
   */
  async update(todoId: string, updates: Partial<Todo>): Promise<Todo | null> {
    const existing = await this.getById(todoId);
    if (!existing) return null;

    const updatedTodo: Todo = {
      ...existing,
      ...updates,
      id: todoId,
      userId: this.userId,
      updatedAt: new Date(),
      syncVersion: existing.syncVersion + 1,
    };

    // If completing, set completedAt
    if (updates.status === 'completed' && existing.status !== 'completed') {
      updatedTodo.completedAt = new Date();
    }

    // Encrypt updated data
    const encrypted = await encryptData(JSON.stringify(updatedTodo), this.encryptionKey);

    // Update in database
    const { error } = await this.client
      .from('encrypted_blobs')
      .update({
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        auth_tag: encrypted.authTag,
        version: updatedTodo.syncVersion,
        updated_at: updatedTodo.updatedAt.toISOString(),
      })
      .eq('id', todoId)
      .eq('user_id', this.userId);

    if (error) throw error;

    return updatedTodo;
  }

  /**
   * Soft delete a todo
   */
  async delete(todoId: string): Promise<boolean> {
    const { error } = await this.client
      .from('encrypted_blobs')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', todoId)
      .eq('user_id', this.userId);

    if (error) throw error;
    return true;
  }

  /**
   * Update todo status
   */
  async updateStatus(todoId: string, status: Todo['status']): Promise<Todo | null> {
    return this.update(todoId, { status });
  }

  /**
   * Get pending todos (not completed or cancelled)
   */
  async getPending(): Promise<Todo[]> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('blob_type', 'todo')
      .eq('is_deleted', false);

    if (error) throw error;

    const todos: Todo[] = [];
    for (const row of data || []) {
      const todo = await this.decryptTodo(row as TodoBlobRow);
      if (todo && (todo.status === 'pending' || todo.status === 'in_progress')) {
        todos.push(todo);
      }
    }

    return todos;
  }

  /**
   * Get overdue todos
   */
  async getOverdue(): Promise<Todo[]> {
    const now = new Date();
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('blob_type', 'todo')
      .eq('is_deleted', false);

    if (error) throw error;

    const todos: Todo[] = [];
    for (const row of data || []) {
      const todo = await this.decryptTodo(row as TodoBlobRow);
      if (todo && todo.dueDate && new Date(todo.dueDate) < now) {
        if (todo.status === 'pending' || todo.status === 'in_progress') {
          todos.push(todo);
        }
      }
    }

    return todos;
  }

  /**
   * Get todo count
   */
  async count(): Promise<number> {
    const { count, error } = await this.client
      .from('encrypted_blobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId)
      .eq('blob_type', 'todo')
      .eq('is_deleted', false);

    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Decrypt a todo from database row
   */
  private async decryptTodo(row: TodoBlobRow): Promise<Todo | null> {
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
}

/**
 * Factory function to create a TodoRepository instance
 */
export function createTodoRepository(
  userId: string,
  encryptionKey: Uint8Array,
  client?: SupabaseClient
): TodoRepository {
  return new TodoRepository(userId, encryptionKey, client);
}
