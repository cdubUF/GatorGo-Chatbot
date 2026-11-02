import {test, expect} from '@playwright/test';

async function stubLiveService(page) {
  await page.route('**/api/health', route => route.fulfill({json: {mode: 'openai', demo: false}}));
  await page.route('**/api/chat', async route => {
    const {message} = route.request().postDataJSON();
    const handoff = message.includes('dirty');
    await route.fulfill({json: {
      session_id: 'b1193ac0-b20c-4813-8804-21a0327ae9e4', mode: 'ai', demo: false,
      reply: handoff ? 'Please contact the hotel directly.' : 'I can help with your stay.',
      sources: [], suggestions: [], handoff: handoff ? {
        urgency: 'routine', summary: 'Room cleanliness concern.', next_step: 'No staff has been notified.'
      } : null,
    }});
  });
}

for (const width of [1440, 1024, 390]) {
  test(`live chat, handoff and layout at ${width}px`, async ({page}) => {
    await stubLiveService(page);
    await page.setViewportSize({width, height: 900});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('#modeBadge')).toHaveText('AI ASSISTED');
    const input = page.getByRole('textbox', {name: 'Message the concierge'});
    await input.fill('Hello'); await input.press('Enter');
    await expect(page.locator('.bubble').last()).toContainText('I can help');
    await input.fill('My room is dirty'); await input.press('Enter');
    await expect(page.locator('.handoff-card')).toContainText('No staff has been notified');
    await expect(page.getByRole('button', {name: 'Allow demo queue submission'})).toHaveCount(0);
    await expect(page.getByText('Try a demo reservation')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.getByRole('button', {name: 'New conversation'}).click();
    await expect(page.locator('.bubble')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}

test('failed API can be retried; reset discards a late reply', async ({page}) => {
  await stubLiveService(page);
  await page.goto('/');
  await expect(page.locator('#modeBadge')).toHaveText('AI ASSISTED');
  await page.route('**/api/chat', route => route.abort());
  await page.locator('#messageInput').fill('spa hours');
  await page.locator('#messageInput').press('Enter');
  await expect(page.getByRole('button', {name: 'Retry message'})).toBeVisible();
  await page.unroute('**/api/chat');
  await stubLiveService(page);
  await page.getByRole('button', {name: 'Retry message'}).click();
  await expect(page.locator('.bubble').last()).toContainText('I can help');
  await page.route('**/api/chat', async route => {
    await new Promise(resolve => setTimeout(resolve, 600));
    await route.continue().catch(() => {});
  });
  await page.locator('#messageInput').fill('hello'); await page.locator('#messageInput').press('Enter');
  await page.getByRole('button', {name: 'New conversation'}).click();
  await page.waitForTimeout(900);
  await expect(page.locator('.bubble')).toHaveCount(1);
});

test('dataset sources are visible', async ({page}) => {
  await stubLiveService(page);
  await page.goto('/');
  await page.getByRole('link', {name: 'Data sources'}).click();
  await expect(page.getByRole('heading', {name: 'Data sources'})).toBeVisible();
  await expect(page.getByText('Bitext Hospitality')).toBeVisible();
  await expect(page.getByText('not currently used to train', {exact: false})).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('reservation details stay in the verification form and produce a review request', async ({page}) => {
  await stubLiveService(page);
  let chatCalls = 0;
  await page.route('**/api/chat', route => { chatCalls += 1; return route.abort(); });
  await page.route('**/api/reservations/lookup', route => route.fulfill({json: {
    challenge_id: 'synthetic-challenge-123456', message: 'If the details match, a code is available.'
  }}));
  await page.route('**/api/reservations/verify', route => route.fulfill({json: {access_token: 'test-access'}}));
  await page.route('**/api/reservations/me', route => route.fulfill({json: {
    status: 'confirmed', confirmation: 'GG-2026-1048', first_name: 'Guest1', last_name: 'Sample',
    check_in: '2026-11-14', check_out: '2026-11-17', room_type: 'Deluxe King', guests: 2
  }}));
  await page.route('**/api/reservations/request-change', route => route.fulfill({json: {
    message: 'Request saved for review. Your reservation has not been changed.'
  }}));
  await page.goto('/');
  const input = page.getByRole('textbox', {name: 'Message the concierge'});
  await input.fill('Can you check my reservation?'); await input.press('Enter');
  await page.getByLabel('Confirmation number').fill('GG-2026-1048');
  await page.getByLabel('Full name').fill('Guest1 Sample');
  await page.getByRole('button', {name: 'Continue'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify', exact: true}).click();
  await expect(page.getByText('Verified reservation')).toBeVisible();
  await page.getByRole('button', {name: 'Request reservation change'}).click();
  await page.getByLabel('Requested change').fill('Please add one guest');
  await page.getByRole('button', {name: 'Submit request'}).click();
  await expect(page.getByText('Request saved for review.', {exact: false})).toBeVisible();
  expect(chatCalls).toBe(0);
});
