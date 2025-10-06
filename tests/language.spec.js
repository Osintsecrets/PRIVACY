// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('language selector', () => {
  test('updates navigation labels in header and footer', async ({ page }) => {
    await page.goto('/');

    const headerHome = page.locator('header [data-i18n="nav.home"]').first();
    const footerHome = page.locator('footer [data-i18n="nav.home"]').first();

    await expect(headerHome).toHaveText('Home');
    await expect(footerHome).toHaveText('Home');

    await page.selectOption('#lang', 'he');

    await expect(headerHome).toHaveText('בית');
    await expect(footerHome).toHaveText('בית');
  });
});
