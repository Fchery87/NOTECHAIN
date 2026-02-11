// apps/web/src/services/analytics-service.ts
import type { Todo, Note } from '@notechain/data-models';

/**
 * Weekly productivity report data structure
 */
export interface WeeklyReport {
  weekStart: Date;
  weekEnd: Date;
  tasksCompleted: number;
  tasksCreated: number;
  completionRate: number;
  peakHours: number[];
  notesCreated: number;
  burnoutRisk: BurnoutRisk;
  productivityScore: number;
}

/**
 * Burnout risk assessment result
 */
export interface BurnoutRisk {
  risk: 'low' | 'medium' | 'high';
  message: string;
  currentVolume: number;
  averageVolume: number;
}

/**
 * Productivity metrics for trend analysis
 */
export interface ProductivityMetrics {
  dailyAverage: number;
  weeklyTotal: number;
  trendDirection: 'up' | 'down' | 'stable';
}

/**
 * Daily productivity data point
 */
export interface DailyProductivity {
  date: Date;
  completed: number;
  created: number;
}

/**
 * AnalyticsService provides on-device productivity analytics
 * All calculations happen locally - no data is sent to servers
 * Implements FR-ANA-01, FR-ANA-02, FR-ANA-04
 */
export class AnalyticsService {
  /**
   * Calculate task completion rate for a date range
   * @param todos Array of todos to analyze
   * @param startDate Start of date range
   * @param endDate End of date range
   * @returns Completion rate as percentage (0-100)
   */
  static calculateTaskCompletionRate(todos: Todo[], startDate: Date, endDate: Date): number {
    const todosInRange = todos.filter(todo => {
      const createdAt = new Date(todo.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });

    if (todosInRange.length === 0) return 0;

    const completedTodos = todosInRange.filter(todo => todo.status === 'completed');

    return Math.round((completedTodos.length / todosInRange.length) * 100);
  }

  /**
   * Identify peak productivity hours based on task completion times
   * @param todos Array of todos to analyze
   * @returns Array of peak hours (0-23), sorted by activity level
   */
  static calculatePeakProductivityHours(todos: Todo[]): number[] {
    const hourCounts = new Map<number, number>();

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourCounts.set(i, 0);
    }

    // Count completions by hour
    for (const todo of todos) {
      if (todo.status === 'completed' && todo.completedAt) {
        const completedAt = new Date(todo.completedAt);
        const hour = completedAt.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
      }
    }

    // Find the maximum count
    const maxCount = Math.max(...hourCounts.values());

    // Return hours with at least 50% of max activity (or all zeros if no activity)
    if (maxCount === 0) return [];

    const peakHours: number[] = [];
    hourCounts.forEach((count, hour) => {
      if (count >= maxCount * 0.5) {
        peakHours.push(hour);
      }
    });

    return peakHours.sort((a, b) => {
      const countA = hourCounts.get(a) ?? 0;
      const countB = hourCounts.get(b) ?? 0;
      return countB - countA; // Sort descending by count
    });
  }

  /**
   * Detect burnout risk based on task volume trends
   * FR-ANA-04: Alert user if task volume exceeds historical averages consistently
   * @param todos Array of todos to analyze
   * @param historicalAverage Average weekly task volume (optional, calculated if not provided)
   * @returns Burnout risk assessment
   */
  static detectBurnoutRisk(todos: Todo[], historicalAverage?: number): BurnoutRisk {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);

    // Count current week's tasks
    const currentWeekTodos = todos.filter(todo => {
      const createdAt = new Date(todo.createdAt);
      return createdAt >= currentWeekStart;
    });

    const currentVolume = currentWeekTodos.length;

    // Calculate historical average if not provided
    let averageVolume = historicalAverage;
    if (averageVolume === undefined) {
      // Calculate 4-week rolling average
      const fourWeeksAgo = new Date(currentWeekStart);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const historicalTodos = todos.filter(todo => {
        const createdAt = new Date(todo.createdAt);
        return createdAt >= fourWeeksAgo && createdAt < currentWeekStart;
      });

      averageVolume = Math.round(historicalTodos.length / 4);
    }

    // Determine risk level
    const ratio = averageVolume > 0 ? currentVolume / averageVolume : 0;

    let risk: 'low' | 'medium' | 'high';
    let message: string;

    if (ratio >= 1.5) {
      risk = 'high';
      message = `Your current task volume is ${Math.round(ratio * 100)}% above your average. Consider delegating or postponing non-essential tasks.`;
    } else if (ratio >= 1.2) {
      risk = 'medium';
      message = `Task volume is ${Math.round((ratio - 1) * 100)}% above your usual pace. Monitor your energy levels.`;
    } else {
      risk = 'low';
      message = 'Your task volume is within a healthy range.';
    }

    return {
      risk,
      message,
      currentVolume,
      averageVolume,
    };
  }

  /**
   * Calculate task volume trend over a period
   * @param todos Array of todos to analyze
   * @param days Number of days to analyze
   * @returns Trend direction
   */
  static getTaskVolumeTrend(todos: Todo[], days: number = 14): 'up' | 'down' | 'stable' {
    const now = new Date();
    const midpoint = new Date(now);
    midpoint.setDate(midpoint.getDate() - Math.floor(days / 2));
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    // First half
    const firstHalfTodos = todos.filter(todo => {
      const createdAt = new Date(todo.createdAt);
      return createdAt >= startDate && createdAt < midpoint;
    });

    // Second half
    const secondHalfTodos = todos.filter(todo => {
      const createdAt = new Date(todo.createdAt);
      return createdAt >= midpoint && createdAt <= now;
    });

    const firstHalfCount = firstHalfTodos.length;
    const secondHalfCount = secondHalfTodos.length;

    if (secondHalfCount > firstHalfCount * 1.15) {
      return 'up';
    } else if (secondHalfCount < firstHalfCount * 0.85) {
      return 'down';
    }
    return 'stable';
  }

  /**
   * Calculate productivity metrics for a period
   * @param todos Array of todos to analyze
   * @param days Number of days to analyze
   * @returns Productivity metrics
   */
  static calculateProductivityMetrics(todos: Todo[], days: number = 7): ProductivityMetrics {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    const todosInRange = todos.filter(todo => {
      const createdAt = new Date(todo.createdAt);
      return createdAt >= startDate && createdAt <= now;
    });

    const completedTodos = todosInRange.filter(todo => todo.status === 'completed');

    const weeklyTotal = completedTodos.length;
    const dailyAverage = Math.round((weeklyTotal / days) * 10) / 10;
    const trendDirection = this.getTaskVolumeTrend(todos, days);

    return {
      dailyAverage,
      weeklyTotal,
      trendDirection,
    };
  }

  /**
   * Calculate overall productivity score (0-100)
   * Based on completion rate, consistency, and trend
   * @param completionRate Task completion rate
   * @param trendDirection Task volume trend
   * @param consistency How consistent is the user (0-1)
   * @returns Productivity score
   */
  static calculateProductivityScore(
    completionRate: number,
    trendDirection: 'up' | 'down' | 'stable',
    consistency: number = 0.5
  ): number {
    // Weight factors
    const completionWeight = 0.5;
    const trendWeight = 0.3;
    const consistencyWeight = 0.2;

    // Trend score (up = 100, stable = 75, down = 50)
    const trendScore = trendDirection === 'up' ? 100 : trendDirection === 'stable' ? 75 : 50;

    // Calculate weighted score
    const score =
      completionRate * completionWeight +
      trendScore * trendWeight +
      consistency * 100 * consistencyWeight;

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Generate a comprehensive weekly productivity report
   * FR-ANA-01: Weekly Productivity Report
   * @param todos Array of todos to analyze
   * @param notes Array of notes to analyze
   * @param startDate Start of the week
   * @param endDate End of the week
   * @returns Complete weekly report
   */
  static generateWeeklyReport(
    todos: Todo[],
    notes: Note[],
    startDate: Date,
    endDate: Date
  ): WeeklyReport {
    // Filter data by date range
    const weekTodos = todos.filter(todo => {
      const createdAt = new Date(todo.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });

    const weekNotes = notes.filter(note => {
      const createdAt = new Date(note.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });

    const completedTodos = weekTodos.filter(todo => todo.status === 'completed');

    const completionRate =
      weekTodos.length > 0 ? Math.round((completedTodos.length / weekTodos.length) * 100) : 0;

    const peakHours = this.calculatePeakProductivityHours(weekTodos);
    const burnoutRisk = this.detectBurnoutRisk(todos);
    const trend = this.getTaskVolumeTrend(todos, 14);

    // Calculate consistency (how evenly distributed are completions)
    const dailyCompletions = this.getDailyCompletions(weekTodos, startDate, endDate);
    const consistency = this.calculateConsistency(dailyCompletions);

    const productivityScore = this.calculateProductivityScore(completionRate, trend, consistency);

    return {
      weekStart: startDate,
      weekEnd: endDate,
      tasksCompleted: completedTodos.length,
      tasksCreated: weekTodos.length,
      completionRate,
      peakHours,
      notesCreated: weekNotes.length,
      burnoutRisk,
      productivityScore,
    };
  }

  /**
   * Get daily completion counts for a week
   */
  private static getDailyCompletions(
    todos: Todo[],
    startDate: Date,
    endDate: Date
  ): DailyProductivity[] {
    const results: DailyProductivity[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      const dayTodos = todos.filter(todo => {
        if (todo.status !== 'completed' || !todo.completedAt) return false;
        const completedAt = new Date(todo.completedAt);
        return completedAt >= dayStart && completedAt <= dayEnd;
      });

      const dayCreated = todos.filter(todo => {
        const createdAt = new Date(todo.createdAt);
        return createdAt >= dayStart && createdAt <= dayEnd;
      });

      results.push({
        date: new Date(dayStart),
        completed: dayTodos.length,
        created: dayCreated.length,
      });

      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  /**
   * Calculate consistency score based on daily variance
   * Lower variance = higher consistency
   */
  private static calculateConsistency(dailyData: DailyProductivity[]): number {
    if (dailyData.length === 0) return 0;

    const completedCounts = dailyData.map(d => d.completed);
    const avg = completedCounts.reduce((a, b) => a + b, 0) / completedCounts.length;

    if (avg === 0) return 0;

    const variance =
      completedCounts.reduce((sum, count) => {
        return sum + Math.pow(count - avg, 2);
      }, 0) / completedCounts.length;

    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avg;

    // Convert to 0-1 scale (lower CV = higher consistency)
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  /**
   * Get hour label for display
   */
  static formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }

  /**
   * Get formatted peak hours string
   */
  static formatPeakHours(hours: number[]): string {
    if (hours.length === 0) return 'No activity yet';
    return hours
      .slice(0, 3)
      .map(h => this.formatHour(h))
      .join(', ');
  }
}
