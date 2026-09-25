/**
 * Sample Automation Tests using Playwright for AutoTest Playground
 *
 * To run these with Playwright:
 *   npx playwright test
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('AutoTest Playground Automation Scenarios', () => {

  test('Scenario 1: Happy Path Login and Role Verification', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);

    // Fill valid credentials
    await page.getByTestId('username-input').fill('admin');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('login-submit-btn').click();

    // Verify welcome message and admin privileges
    await expect(page.getByTestId('user-welcome-message')).toContainText('Welcome, System Admin!');
    await expect(page.getByTestId('user-role-badge')).toContainText('Administrator');

    // Execute privileged action
    await page.getByTestId('admin-action-btn').click();
    await expect(page.getByTestId('admin-action-status-msg')).toBeVisible();

    // Logout
    await page.getByTestId('logout-btn').click();
    await expect(page.getByTestId('logout-success-msg')).toBeVisible();
  });

  test('Scenario 2: Form Controls & File Upload', async ({ page }) => {
    await page.goto(`${BASE_URL}/forms`);

    // Text inputs
    await page.getByTestId('input-fullname').fill('Automated Tester');
    await page.getByTestId('input-email').fill('tester@example.com');

    // Single Select
    await page.getByTestId('select-country').selectOption('CA');

    // Multi-Select
    await page.getByTestId('select-languages').selectOption(['JavaScript', 'Python']);

    // Checkboxes
    await page.getByTestId('checkbox-select-all').check();
    await page.getByTestId('checkbox-terms').check();

    // Submit form and assert payload
    await page.getByTestId('form-submit-btn').click();
    await expect(page.getByTestId('form-submission-output')).toBeVisible();
  });

  test('Scenario 3: Dynamic Waits and AJAX Responses', async ({ page }) => {
    await page.goto(`${BASE_URL}/dynamic`);

    // Configure 2-second delay
    await page.getByTestId('select-delay-seconds').selectOption('2');
    await page.getByTestId('fetch-delayed-btn').click();

    // Explicit wait for delayed response container
    const responseBox = page.getByTestId('delayed-response-box');
    await expect(responseBox).toBeVisible({ timeout: 5000 });
    await expect(responseBox).toContainText('Response delayed by 2 second(s)');
  });

  test('Scenario 4: Native JS Dialog Handling', async ({ page }) => {
    await page.goto(`${BASE_URL}/dialogs`);

    // Handle confirm dialog by accepting
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });
    await page.getByTestId('js-confirm-btn').click();
    await expect(page.getByTestId('js-confirm-result')).toContainText('User accepted the confirmation');
  });

  test('Scenario 5: E-Commerce Complete Checkout Journey', async ({ page }) => {
    await page.goto(`${BASE_URL}/store`);

    // Add first item to cart
    await page.getByTestId('add-to-cart-btn-prod-1').click();
    await expect(page.getByTestId('cart-badge-count')).toHaveText('1');

    // Open Cart Drawer
    await page.getByTestId('open-cart-btn').click();

    // Apply Coupon
    await page.getByTestId('coupon-input').fill('SAVE20');
    await page.getByTestId('apply-coupon-btn').click();
    await expect(page.getByTestId('coupon-message')).toContainText('20% Discount');

    // Proceed through checkout wizard
    await page.getByTestId('proceed-to-checkout-btn').click();
    await page.getByTestId('shipping-next-btn').click();
    await page.getByTestId('place-order-btn').click();

    // Assert order placed
    await expect(page.getByTestId('order-confirmed-screen')).toBeVisible();
    await expect(page.getByTestId('confirmed-order-id')).not.toBeEmpty();
  });

});

