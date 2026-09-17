import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await b.newPage({ viewport: { width: 1280, height: 820 } });
await page.addInitScript(() => { try { localStorage.setItem('yourspace-welcome','seen'); localStorage.setItem('yourspace-danger','off'); } catch {} });
await page.goto('http://localhost:5201/', { waitUntil:'domcontentloaded', timeout:60000 });
await page.waitForSelector('.life-app', { timeout:45000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: 'grime.png' });
await b.close(); console.log('shot ok');
