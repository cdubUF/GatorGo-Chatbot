import {chromium, expect} from '@playwright/test';
import fs from 'node:fs/promises';

await fs.mkdir('artifacts/video', {recursive: true});
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({viewport: {width: 1440, height: 900},
  recordVideo: {dir: 'artifacts/video', size: {width: 1440, height: 900}}});
const page = await context.newPage();
await page.goto('http://127.0.0.1:8000');
await page.locator('#modeBadge').filter({hasText: 'RULE-BASED DEMO'}).waitFor();
const start = Date.now();
const waitUntil = async seconds => {
  const ms = seconds * 1000 - (Date.now() - start);
  if (ms > 0) await page.waitForTimeout(ms);
};
async function say(message, expected) {
  const count = await page.locator('.message.agent').count();
  await page.locator('#messageInput').pressSequentially(message, {delay: 65});
  await page.locator('#messageInput').press('Enter');
  await expect(page.locator('.message.agent')).toHaveCount(count + 1);
  await expect(page.locator('#messages')).toHaveAttribute('aria-busy', 'false');
  await page.locator('.bubble').filter({hasText: expected}).last().waitFor();
}
await waitUntil(8);
await say('What are the spa hours?', '9:00 AM');
await waitUntil(23);
await say("My room is dirty and I'm really frustrated", "I'm sorry");
await waitUntil(43);
await say('I want a manager', "I'm sorry");
await page.locator('.handoff-card').last().getByRole('button', {name: 'Keep private'}).click();
await page.locator('.handoff-card').last().filter({hasText: 'Kept private'}).waitFor();
await waitUntil(58);
const video = page.video();
await context.close();
await video.saveAs('artifacts/gatorgo-demo.webm');
await browser.close();
console.log('Saved artifacts/gatorgo-demo.webm. Review timing and convert to H.264 MP4 for PowerPoint.');
