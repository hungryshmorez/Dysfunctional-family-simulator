import { test, expect } from '@playwright/test';

test('scene mounts and renders a live WebGL canvas', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');

  const canvas = page.locator('#scene');
  await expect(canvas).toBeVisible();

  // Canvas has real pixel dimensions.
  const size = await canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement;
    return { w: c.width, h: c.height };
  });
  expect(size.w).toBeGreaterThan(0);
  expect(size.h).toBeGreaterThan(0);

  // A WebGL context is live on the canvas (three holds it, so this returns it).
  const hasWebGL = await canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement;
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  });
  expect(hasWebGL).toBe(true);

  // Game bootstrapped and survives a few animation frames.
  await expect
    .poll(() => page.evaluate(() => '__game' in window))
    .toBe(true);
  await page.waitForTimeout(500);

  expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});
