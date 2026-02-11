import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Todos Feature
 * FR-TODO-01: Create, edit, delete tasks
 * FR-TODO-02: Mark tasks as complete/incomplete
 * FR-TODO-03: Overdue task highlighting
 */

test.describe('Todos Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Login
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should create a new todo', async ({ page }) => {
    // Navigate to todos
    await page.click('text=Todos');
    await page.waitForSelector('h1:has-text("Todos")');

    // Click "New Todo" button
    await page.click('button:has-text("New Todo")');
    await page.waitForSelector('input[placeholder*="Task title"]');

    // Enter todo details
    const todoTitle = 'Test Todo';
    await page.fill('input[placeholder*="Task title"]', todoTitle);
    await page.fill('textarea[placeholder*="Description"]', 'Test description');

    // Set priority
    await page.click('select:has-text("Priority")');
    await page.click('text=High');

    // Save todo
    await page.click('button:has-text("Create")');
    await page.waitForSelector(`h3:has-text("${todoTitle}")`);

    // Verify todo created
    const titleElement = await page.locator(`h3:has-text("${todoTitle}")`);
    await expect(titleElement).toBeVisible();

    const priorityElement = await page.locator('span:has-text("High")');
    await expect(priorityElement).toBeVisible();
  });

  test('should mark todo as complete', async ({ page }) => {
    // Create a todo first
    await page.click('button:has-text("New Todo")');
    await page.fill('input[placeholder*="Task title"]', 'Complete Me');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h3:has-text("Complete Me")');

    // Click checkbox to mark complete
    await page.click('button[aria-label*="Mark as complete"]');

    // Verify status changed
    await page.waitForSelector('span:has-text("Completed")');
    const statusElement = await page.locator('span:has-text("Completed")');
    await expect(statusElement).toBeVisible();

    // Verify text strikethrough
    const titleElement = await page.locator('h3:has-text("Complete Me")');
    await expect(titleElement).toHaveClass(/line-through/);
  });

  test('should mark todo as incomplete', async ({ page }) => {
    // Create and complete a todo
    await page.click('button:has-text("New Todo")');
    await page.fill('input[placeholder*="Task title"]', 'Incomplete Me');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h3:has-text("Incomplete Me")');
    await page.click('button[aria-label*="Mark as complete"]');

    // Mark as incomplete
    await page.click('button[aria-label*="Mark as incomplete"]');

    // Verify status changed
    await page.waitForSelector('span:has-text("Pending")');
    const statusElement = await page.locator('span:has-text("Pending")');
    await expect(statusElement).toBeVisible();

    // Verify no strikethrough
    const titleElement = await page.locator('h3:has-text("Incomplete Me")');
    await expect(titleElement).not.toHaveClass(/line-through/);
  });

  test('should delete a todo', async ({ page }) => {
    // Create a todo
    await page.click('button:has-text("New Todo")');
    await page.fill('input[placeholder*="Task title"]', 'Delete Me');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h3:has-text("Delete Me")');

    // Hover over todo
    const todoElement = await page.locator('h3:has-text("Delete Me")');
    await todoElement.hover();

    // Click delete button
    await page.click('button[aria-label*="Delete task"]');

    // Confirm deletion
    await page.click('button:has-text("Delete")');

    // Verify todo deleted
    await page.waitForSelector('h3:has-text("Delete Me")', { state: 'detached' });
    const deletedElement = await page.locator('h3:has-text("Delete Me")');
    await expect(deletedElement).not.toBeVisible();
  });

  test('should highlight overdue tasks', async ({ page }) => {
    // Create todo with past due date
    await page.click('button:has-text("New Todo")');
    await page.fill('input[placeholder*="Task title"]', 'Overdue Task');

    // Set due date to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await page.fill('input[type="date"]', yesterday.toISOString().split('T')[0]);

    await page.click('button:has-text("Create")');
    await page.waitForSelector('h3:has-text("Overdue Task")');

    // Verify overdue highlighting
    const todoElement = await page.locator('div:has(h3:has-text("Overdue Task"))');
    await expect(todoElement).toHaveClass(/border-red-200/);
    await expect(todoElement).toHaveClass(/bg-red-50/);
  });

  test('should filter todos by status', async ({ page }) => {
    // Create completed and incomplete todos
    await page.click('button:has-text("New Todo")');
    await page.fill('input[placeholder*="Task title"]', 'Completed Task');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h3:has-text("Completed Task")');
    await page.click('button[aria-label*="Mark as complete"]');

    await page.click('button:has-text("New Todo")');
    await page.fill('input[placeholder*="Task title"]', 'Incomplete Task');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h3:has-text("Incomplete Task")');

    // Filter by completed
    await page.click('select:has-text("Filter")');
    await page.click('text=Completed');

    // Verify only completed task visible
    const completedElement = await page.locator('h3:has-text("Completed Task")');
    await expect(completedElement).toBeVisible();

    const incompleteElement = await page.locator('h3:has-text("Incomplete Task")');
    await expect(incompleteElement).not.toBeVisible();
  });

  test('should set todo priority', async ({ page }) => {
    // Create high priority todo
    await page.click('button:has-text("New Todo")');
    await page.fill('input[placeholder*="Task title"]', 'High Priority');
    await page.click('select:has-text("Priority")');
    await page.click('text=High');
    await page.click('button:has-text("Create")');
    await page.waitForSelector('h3:has-text("High Priority")');

    // Verify priority badge
    const priorityBadge = await page.locator('span:has-text("High")');
    await expect(priorityBadge).toHaveClass(/bg-orange-100/);
  });
});
