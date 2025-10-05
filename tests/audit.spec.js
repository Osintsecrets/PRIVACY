// @ts-check
const { test, expect } = require('@playwright/test');

const TERMS_VERSION = 'v1.0 (2025-10-03)';
const TOKEN_KEY = 'ETHICS_PLEDGE_TOKEN';
const TERMS_VERSION_KEY = 'TERMS_VERSION';

const ROUTES = [
  '/',
  '/index.html',
  '/why.html',
  '/ethics.html',
  '/platform.html',
  '/platforms/facebook.html',
  '/platforms/instagram.html',
  '/platforms/telegram.html',
  '/platforms/tiktok.html',
  '/platforms/x.html',
  '/platforms/whatsapp.html',
  '/about/',
  '/self-audit.html',
  '/disclaimer/',
  '/pledge.html',
  '/access-denied.html',
  '/offline.html',
  '/404.html',
];

async function grantPledge(page) {
  await page.addInitScript(({ tokenKey, termsKey, version }) => {
    try {
      const payload = { token: 'test-token', version, createdAt: new Date().toISOString() };
      window.sessionStorage.setItem(tokenKey, JSON.stringify(payload));
      window.sessionStorage.setItem(termsKey, version);
    } catch (error) {
      console.warn('Unable to seed pledge token in test environment', error);
    }
  }, { tokenKey: TOKEN_KEY, termsKey: TERMS_VERSION_KEY, version: TERMS_VERSION });
}

test.beforeEach(async ({ page }) => {
  await grantPledge(page);
});

for (const route of ROUTES) {
  test.describe(`page audit: ${route}`, () => {
    test(`loads without console errors`, async ({ page }) => {
      const errors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          errors.push(message.text());
        }
      });

      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response, `No response for ${route}`).not.toBeNull();
      expect(response?.ok(), `Response was not OK for ${route}`).toBeTruthy();

      await expect(page.locator('body')).toBeVisible();

      const viewportMetaCount = await page.locator('head meta[name="viewport"]').count();
      expect(viewportMetaCount, 'Viewport meta tag missing').toBeGreaterThan(0);

      const hasHorizontalOverflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
      });
      expect(hasHorizontalOverflow, 'Page should not overflow horizontally at default zoom').toBeFalsy();

      expect(errors, `Console errors detected on ${route}:\n${errors.join('\n')}`).toEqual([]);
    });
  });
}

test.describe('mobile navigation', () => {
  test('menu toggle opens and closes', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'Mobile-only assertion');

    await page.goto('/');

    const toggle = page.locator('.menu-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    const menu = page.locator('#site-menu');
    await expect(menu).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await toggle.click();
    await expect(menu).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

