import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort());
});
test('démarrage et carte interactive', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Ma carte de Paris');
  await expect(page.locator('#map.leaflet-container')).toBeVisible();
  await expect(page.locator('#btnParis')).toBeVisible();
  await page.locator('#btnParis').click();
  expect(errors).toEqual([]);
});
test('actions principales accessibles', async ({ page }) => {
  await page.goto('/');
  for (const id of ['btnSearch','btnLocate','btnSos','btnSettings','btnAdd','btnNear']) {
    const button = page.locator('#' + id);
    await expect(button).toBeVisible();
    await expect(button).toHaveAccessibleName(/\S/);
    const box = await button.boundingBox();
    expect(box.width, id).toBeGreaterThanOrEqual(44);
    expect(box.height, id).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('permission GPS simulée', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 48.8566, longitude: 2.3522, accuracy: 10 });
  await page.goto('/');
  await page.locator('#btnLocate').click();
  await expect(page.locator('#btnLocate')).toHaveAttribute('aria-pressed','true');
});
