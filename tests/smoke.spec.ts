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

test('the Static Corp television is present in the world', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => '__game' in window)).toBe(true);

  // The TV creates a <video> element for its broadcast texture.
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('video')).some((v) =>
          v.src.includes('static-corp/broadcast')
        )
      )
    )
    .toBe(true);

  // The broadcast asset is actually served (not a 404).
  const res = await page.request.get('/static-corp/broadcast.mp4');
  expect(res.status()).toBe(200);
});
