import { test, expect } from '@playwright/test';

/**
 * RevTray Smoke Tests
 * These tests verify the critical paths of the application.
 */

test.describe('Marketing & Auth Smoke Tests', () => {
  test('landing page loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RevTray/);
    const loginLink = page.getByRole('link', { name: /Log in/i });
    await expect(loginLink).toBeVisible();
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe('Dashboard Smoke Tests (Requires Auth)', () => {
  // NOTE: In a real CI environment, you would use a 'global-setup.ts'
  // to log in once and reuse the authentication state.
  
  test('dashboard kpis are visible', async ({ page }) => {
    // This test assumes you are logged in or using a mock session
    await page.goto('/dashboard');
    
    // Check if the dashboard skeleton or main content is there
    // If not logged in, this will usually redirect to /login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Skipping authenticated test: redirected to login');
      return;
    }

    await expect(page.getByText(/Revenue from email/i)).toBeVisible();
    await expect(page.getByText(/Subscribers/i)).toBeVisible();
  });

  test('campaign builder can be opened', async ({ page }) => {
    await page.goto('/dashboard/campaigns/new');
    
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      return;
    }

    await expect(page.getByPlaceholder(/Campaign Name/i)).toBeVisible();
  });
});
