import { describe, it, expect } from 'vitest';
import { extractActionItems, ActionItem } from '../actionItemExtractor';

describe('extractActionItems', () => {
  it('should exist as a function', () => {
    expect(typeof extractActionItems).toBe('function');
  });

  it('should return empty array for text without action items', () => {
    const text = 'We had a great meeting today. The weather was nice.';
    const result = extractActionItems(text);
    expect(result).toEqual([]);
  });

  it('should detect "John will do X" patterns', () => {
    const text = 'John will prepare the presentation for next week.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('prepare the presentation');
    expect(result[0].assignee).toBe('John');
  });

  it('should detect "We need to do X" patterns', () => {
    const text = 'We need to schedule a follow-up meeting.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('schedule a follow-up meeting');
  });

  it('should detect "TODO: X" patterns', () => {
    const text = 'TODO: Update the project documentation.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('Update the project documentation');
  });

  it('should detect "Action item: X" patterns', () => {
    const text = 'Action item: Review the budget proposal.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('Review the budget proposal');
  });

  it('should detect "By Friday..." deadline patterns', () => {
    const text = 'Sarah will submit the report by Friday.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].deadline).toBe('Friday');
  });

  it('should detect assignees by name', () => {
    const text = 'Michael should call the client tomorrow.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].assignee).toBe('Michael');
  });

  it('should detect priority keywords - urgent', () => {
    const text = 'We urgently need to fix the server issue.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('high');
  });

  it('should detect priority keywords - important', () => {
    const text = 'This is important: review the security audit.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('high');
  });

  it('should detect priority keywords - ASAP', () => {
    const text = 'We need to deploy the hotfix ASAP.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('high');
  });

  it('should return ActionItem objects with correct structure', () => {
    const text = 'Alice will complete the task by Monday. This is urgent.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);

    const item = result[0];
    expect(item).toHaveProperty('text');
    expect(item).toHaveProperty('assignee');
    expect(item).toHaveProperty('deadline');
    expect(item).toHaveProperty('priority');
    expect(item).toHaveProperty('completed');
    expect(typeof item.text).toBe('string');
    expect(typeof item.completed).toBe('boolean');
  });

  it('should handle multiple action items in one text', () => {
    const text = `
      John will prepare the slides.
      Sarah needs to review the document.
      TODO: Schedule the next meeting.
    `;
    const result = extractActionItems(text);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('should detect "going to" patterns', () => {
    const text = 'We are going to launch the new feature next month.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('launch the new feature');
  });

  it('should detect "should" patterns', () => {
    const text = 'We should update the documentation before release.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('update the documentation');
  });

  it('should detect "must" patterns', () => {
    const text = 'We must complete the testing by tomorrow.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('complete the testing');
  });

  it('should handle "Follow-up:" patterns', () => {
    const text = 'Follow-up: Check with the vendor on pricing.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('Check with the vendor');
  });

  it('should detect relative time deadlines', () => {
    const text = 'Tom will send the email by tomorrow.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].deadline).toBe('tomorrow');
  });

  it('should detect "next week" deadline patterns', () => {
    const text = 'We need to finalize the design by next week.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].deadline).toBe('next week');
  });

  it('should handle "assigned to" patterns', () => {
    const text = 'This task is assigned to Jessica.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].assignee).toBe('Jessica');
  });

  it('should set completed to false by default', () => {
    const text = 'We need to review the code.';
    const result = extractActionItems(text);
    expect(result).toHaveLength(1);
    expect(result[0].completed).toBe(false);
  });

  it('should not create action items from non-action sentences', () => {
    const text = 'The meeting started at 2pm. We discussed the budget. Everyone was present.';
    const result = extractActionItems(text);
    expect(result).toEqual([]);
  });
});
