import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests: Notes Feature
 * FR-NOTE-01: Create, edit, delete notes
 * FR-NOTE-02: Rich-text editor with Markdown support
 */

test.describe('Notes Feature', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');

    // Login (mock or real)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should create a new note', async () => {
    // Navigate to notes
    await page.click('text=Notes');
    await page.waitForSelector('h1:has-text("Notes")');

    // Click "New Note" button
    await page.click('button:has-text("New Note")');
    await page.waitForSelector('textarea[placeholder*="Start writing"]');

    // Enter note content
    const noteTitle = 'Test Note Title';
    const noteContent = 'This is test note content with **bold** and *italic* text.';

    await page.fill('input[placeholder*="Title"]', noteTitle);
    await page.fill('textarea[placeholder*="Start writing"]', noteContent);

    // Save note
    await page.click('button:has-text("Save")');
    await page.waitForSelector(`h3:has-text("${noteTitle}")`);

    // Verify note created
    const titleElement = await page.locator(`h3:has-text("${noteTitle}")`);
    await expect(titleElement).toBeVisible();

    const contentElement = await page.locator('p:has-text("This is test note content")');
    await expect(contentElement).toBeVisible();
  });

  test('should edit an existing note', async () => {
    // Create a note first
    await page.click('button:has-text("New Note")');
    await page.fill('input[placeholder*="Title"]', 'Original Title');
    await page.click('button:has-text("Save")');
    await page.waitForSelector('h3:has-text("Original Title")');

    // Click on note to edit
    await page.click('h3:has-text("Original Title")');
    await page.waitForSelector('textarea[placeholder*="Start writing"]');

    // Update note
    const updatedTitle = 'Updated Note Title';
    await page.fill('input[placeholder*="Title"]', updatedTitle);
    await page.click('button:has-text("Save")');

    // Verify note updated
    await page.waitForURL('**/notes');
    const updatedElement = await page.locator(`h3:has-text("${updatedTitle}")`);
    await expect(updatedElement).toBeVisible();
  });

  test('should delete a note', async () => {
    // Create a note
    await page.click('button:has-text("New Note")');
    await page.fill('input[placeholder*="Title"]', 'Note to Delete');
    await page.click('button:has-text("Save")');
    await page.waitForSelector('h3:has-text("Note to Delete")');

    // Hover over note
    const noteElement = await page.locator('h3:has-text("Note to Delete")');
    await noteElement.hover();

    // Click delete button
    await page.click('button[aria-label*="Delete"]');

    // Confirm deletion
    await page.click('button:has-text("Delete")');
    await page.waitForSelector('h3:has-text("Note to Delete")', { state: 'detached' });

    // Verify note deleted
    const deletedElement = await page.locator('h3:has-text("Note to Delete")');
    await expect(deletedElement).not.toBeVisible();
  });

  test('should use rich text formatting', async () => {
    await page.click('button:has-text("New Note")');
    await page.waitForSelector('textarea[placeholder*="Start writing"]');

    // Type text with formatting
    await page.fill('textarea[placeholder*="Start writing"]', 'Bold **text** and italic *text*');
    await page.click('button:has-text("Save")');
    await page.waitForSelector('strong:has-text("text")');

    // Verify bold text rendered
    const boldElement = await page.locator('strong:has-text("text")');
    await expect(boldElement).toBeVisible();
  });

  test('should add tags to note', async () => {
    await page.click('button:has-text("New Note")');
    await page.waitForSelector('input[placeholder*="Title"]');

    // Enter note title
    await page.fill('input[placeholder*="Title"]', 'Tagged Note');

    // Add tags
    const tags = ['work', 'important', 'project'];
    for (const tag of tags) {
      await page.fill('input[placeholder*="Add tag"]', tag);
      await page.press('input[placeholder*="Add tag"]', 'Enter');
    }

    await page.click('button:has-text("Save")');
    await page.waitForSelector(`h3:has-text("Tagged Note")`);

    // Verify tags displayed
    for (const tag of tags) {
      const tagElement = await page.locator(`span:has-text("${tag}")`);
      await expect(tagElement).toBeVisible();
    }
  });
});
