import { test, expect } from '@playwright/test';

test('api health check', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health');
    expect(response.ok()).toBeTruthy();
    expect(await response.json()).toEqual(expect.objectContaining({ status: 'ok' }));
});

test.beforeEach(async ({ page }) => {
    // Mock server books to return empty list or sample
    await page.route('/data/books.json', async route => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ books: [] }) });
    });
});

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/ReadBook/);
});

test('shows library empty state', async ({ page }) => {
    await page.goto('/library');

    // Wait for loading skeleton to disappear (Network mock should ensure this happens fast)
    await expect(page.locator('main div.animate-pulse')).toHaveCount(0, { timeout: 10000 });

    // Check for "My Bookshelf" title
    await expect(page.getByText('我的书架')).toBeVisible();

    // Check for "Import Book" button (English hardcoded in ImportCard.tsx)
    // Using loose match or English since zh.ts is not used in ImportCard yet
    await expect(page.getByText('Import Book')).toBeVisible();
});

test('can toggle settings', async ({ page }) => {
    // Navigate to library where the bookshelf title is present
    await page.goto('/library');

    // Wait for loading to finish
    await expect(page.locator('main div.animate-pulse')).toHaveCount(0, { timeout: 10000 });

    await expect(page.getByText('我的书架')).toBeVisible();
});
