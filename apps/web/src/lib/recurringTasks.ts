import type { Todo } from '@notechain/data-models';

/**
 * Recurrence types
 */
export type RecurrenceType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

/**
 * Recurrence configuration
 */
export interface RecurrenceConfig {
  type: RecurrenceType;
  interval?: number; // For "every X days/weeks/months"
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday) for weekly recurrence
  dayOfMonth?: number; // 1-31 for monthly recurrence
  endCondition?: {
    type: 'date' | 'count' | 'never';
    value?: Date | number;
  };
}

/**
 * Extended Todo with recurrence support
 */
export interface RecurringTodo extends Omit<Todo, 'dueDate'> {
  recurrence: RecurrenceConfig;
  nextDueDate?: Date;
  completedCount?: number;
}

/**
 * Recurring Task Service
 * US-TODO-07: Recurring tasks (Pro feature)
 * Generates next instance of recurring tasks
 */
export class RecurringTaskService {
  /**
   * Calculates next due date for recurring task
   * @param todo Recurring todo
   * @returns Next due date
   */
  static calculateNextDueDate(todo: RecurringTodo): Date {
    const baseDate = todo.nextDueDate || new Date();
    const config = todo.recurrence;
    const interval = config.interval || 1;

    switch (config.type) {
      case 'daily':
        return new Date(baseDate.getTime() + interval * 24 * 60 * 60 * 1000);

      case 'weekly': {
        const daysOfWeek = config.daysOfWeek || [baseDate.getDay()];
        const nextWeekDate = new Date(baseDate.getTime() + interval * 7 * 24 * 60 * 60 * 1000);

        // Find next matching day of week
        for (let i = 0; i < 7; i++) {
          const testDate = new Date(nextWeekDate.getTime() + i * 24 * 60 * 60 * 1000);
          if (daysOfWeek.includes(testDate.getDay())) {
            return testDate;
          }
        }
        return nextWeekDate;
      }

      case 'biweekly':
        return new Date(baseDate.getTime() + interval * 14 * 24 * 60 * 60 * 1000);

      case 'monthly': {
        const nextMonthDate = new Date(baseDate);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + interval);

        // Set to specific day of month
        const dayOfMonth = config.dayOfMonth || baseDate.getDate();
        nextMonthDate.setDate(dayOfMonth);

        // Handle overflow (e.g., February 31st)
        const maxDaysInMonth = new Date(
          nextMonthDate.getFullYear(),
          nextMonthDate.getMonth() + 1,
          0
        ).getDate();
        if (dayOfMonth > maxDaysInMonth) {
          nextMonthDate.setDate(maxDaysInMonth);
        }

        return nextMonthDate;
      }

      case 'quarterly':
        return new Date(baseDate.getTime() + interval * 90 * 24 * 60 * 60 * 1000);

      case 'yearly': {
        const nextYearDate = new Date(baseDate);
        nextYearDate.setFullYear(nextYearDate.getFullYear() + interval);
        return nextYearDate;
      }

      default:
        return baseDate;
    }
  }

  /**
   * Checks if recurring task should generate next instance
   * @param todo Recurring todo
   * @returns True if next instance should be generated
   */
  static shouldGenerateNextInstance(todo: RecurringTodo): boolean {
    const now = new Date();
    const nextDueDate = todo.nextDueDate || new Date();

    // Check if current instance is due
    if (nextDueDate > now) {
      return false;
    }

    // Check end conditions
    if (todo.recurrence.endCondition) {
      const { type, value } = todo.recurrence.endCondition;

      if (type === 'date' && value instanceof Date) {
        return new Date(value) >= now;
      }

      if (type === 'count' && typeof value === 'number') {
        return (todo.completedCount || 0) < value;
      }

      if (type === 'never') {
        return true;
      }
    }

    return true;
  }

  /**
   * Generates next instance of recurring task
   * @param todo Recurring todo
   * @returns New todo instance
   */
  static generateNextInstance(todo: RecurringTodo): Todo {
    const nextDueDate = this.calculateNextDueDate(todo);

    return {
      ...todo,
      id: `${todo.id}-instance-${Date.now()}`,
      title: todo.title,
      description: todo.description,
      status: 'pending',
      priority: todo.priority,
      dueDate: nextDueDate,
      linkedNoteId: todo.linkedNoteId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Updates recurring task after completion
   * @param todo Recurring todo that was completed
   * @returns Updated todo with next due date
   */
  static updateAfterCompletion(todo: RecurringTodo): RecurringTodo {
    const nextDueDate = this.calculateNextDueDate(todo);

    return {
      ...todo,
      nextDueDate,
      completedCount: (todo.completedCount || 0) + 1,
      updatedAt: new Date(),
    };
  }

  /**
   * Gets recurrence description for display
   * @param config Recurrence configuration
   * @returns Human-readable description
   */
  static getRecurrenceDescription(config: RecurrenceConfig): string {
    const interval = config.interval || 1;
    const descriptions: Record<RecurrenceType, string> = {
      daily: interval === 1 ? 'Daily' : `Every ${interval} days`,
      weekly: interval === 1 ? 'Weekly' : `Every ${interval} weeks`,
      biweekly: 'Biweekly',
      monthly: interval === 1 ? 'Monthly' : `Every ${interval} months`,
      quarterly: 'Quarterly',
      yearly: interval === 1 ? 'Yearly' : `Every ${interval} years`,
    };

    return descriptions[config.type];
  }

  /**
   * Gets end condition description
   * @param config Recurrence configuration
   * @returns Human-readable description
   */
  static getEndConditionDescription(config: RecurrenceConfig): string | undefined {
    if (!config.endCondition) {
      return undefined;
    }

    const { type, value } = config.endCondition;

    if (type === 'never') {
      return 'Repeats forever';
    }

    if (type === 'count' && typeof value === 'number') {
      return `Repeats ${value} times`;
    }

    if (type === 'date' && value instanceof Date) {
      return `Repeats until ${value.toLocaleDateString()}`;
    }

    return undefined;
  }

  /**
   * Validates recurrence configuration
   * @param config Recurrence configuration
   * @returns True if configuration is valid
   */
  static validateRecurrence(config: RecurrenceConfig): boolean {
    if (!config.type) {
      return false;
    }

    // Validate days of week
    if (config.type === 'weekly' && config.daysOfWeek) {
      const validDays = config.daysOfWeek.every(day => day >= 0 && day <= 6);
      if (!validDays) {
        return false;
      }
    }

    // Validate day of month
    if (config.type === 'monthly' && config.dayOfMonth) {
      if (config.dayOfMonth < 1 || config.dayOfMonth > 31) {
        return false;
      }
    }

    // Validate end condition
    if (config.endCondition) {
      const { type, value } = config.endCondition;

      if (type === 'count' && typeof value === 'number') {
        if (value <= 0) {
          return false;
        }
      }

      if (type === 'date' && value instanceof Date) {
        if (value < new Date()) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Schedules next instances of recurring tasks
   * @param todos Array of recurring todos
   * @returns Array of new todo instances
   */
  static scheduleNextInstances(todos: RecurringTodo[]): Todo[] {
    const newInstances: Todo[] = [];

    for (const todo of todos) {
      if (this.shouldGenerateNextInstance(todo)) {
        const instance = this.generateNextInstance(todo);
        newInstances.push(instance);

        // Update todo's next due date
        this.updateAfterCompletion(todo);
        // Store updated todo (in real app, this would update database)
      }
    }

    return newInstances;
  }
}
