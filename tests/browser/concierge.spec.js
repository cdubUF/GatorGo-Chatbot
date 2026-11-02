import {test, expect} from '@playwright/test';

for (const width of [1440, 1024, 390]) {
  test(`chat, handoff, reset and layout at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 900});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('#modeBadge')).toHaveText('RULE-BASED DEMO');
    const input = page.getByRole('textbox', {name: 'Message the concierge'});
    await input.fill('What time is check-in?'); await input.press('Enter');
    await expect(page.locator('.bubble').last()).toContainText('3:00 PM');
    await input.fill('My room is dirty'); await input.press('Enter');
    await expect(page.locator('.handoff-card')).toContainText('Summary prepared');
    await page.getByRole('button', {name: 'Keep private'}).click();
    await expect(page.locator('.handoff-card')).toContainText('Kept private');
    await expect(page.locator('#sendBtn')).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({path: `artifacts/concierge-${width}.png`, fullPage: true});
    await page.getByRole('button', {name: 'New conversation'}).click();
    await expect(page.locator('.bubble')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}

test('failed API can be retried; reset discards a late reply', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#modeBadge')).toHaveText('RULE-BASED DEMO');
  await page.route('**/api/chat', route => route.abort());
  await page.locator('#messageInput').fill('spa hours');
  await page.locator('#messageInput').press('Enter');
  await expect(page.getByRole('button', {name: 'Retry message'})).toBeVisible();
  await page.unroute('**/api/chat');
  await page.getByRole('button', {name: 'Retry message'}).click();
  await expect(page.locator('.bubble').last()).toContainText('9:00 AM');
  await page.route('**/api/chat', async route => {
    await new Promise(resolve => setTimeout(resolve, 600));
    await route.continue().catch(() => {});
  });
  await page.locator('#messageInput').fill('hello'); await page.locator('#messageInput').press('Enter');
  await page.getByRole('button', {name: 'New conversation'}).click();
  await page.waitForTimeout(900);
  await expect(page.locator('.bubble')).toHaveCount(1);
});

test('reservation pair and keyboard use', async ({page}) => {
  await page.goto('/');
  const input = page.locator('#messageInput');
  for (const [question, answer] of [['Start demo check-in', 'Enter DEMO-2048'],
    ['DEMO-2048', 'last name'], ['Lee', "don't match"], ['Parker', 'Sample reservation found']]) {
    await input.fill(question); await input.press('Enter');
    await expect(page.locator('.bubble').last()).toContainText(answer);
  }
  await input.press('Shift+Tab');
  expect(await page.evaluate(() => document.activeElement.tagName)).toBe('BUTTON');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
