import {test, expect} from '@playwright/test';

test.use({launchOptions: {args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']}});

const config = {mode: 'openai', demo: false, reservation_testing: false, sample_knowledge: true,
  speech_enabled: true, languages: {en: 'English', es: 'Spanish', ar: 'Arabic'}};
async function setup(page) {
  await page.route('**/api/health', route => route.fulfill({json: config}));
  await page.route('**/api/chat', route => route.fulfill({json: {
    session_id: 'b1193ac0-b20c-4813-8804-21a0327ae9e4', mode: 'ai', demo: false,
    reply: 'Check-in starts at 3:00 PM.', reply_locale: 'en', sources: [{id: 'checkin', topic: 'Check-in', status: 'demo_only'}], suggestions: []}}));
  await page.route('**/api/voice', route => route.fulfill({status: 503, json: {detail: 'Voice test stub'}}));
  await page.goto('/');
}

test('three keyboard-selectable guides preserve conversation and selection', async ({page}) => {
  await setup(page);
  await expect(page.locator('[data-gator]')).toHaveCount(3);
  for (const key of ['desk', 'pool', 'trail']) {
    await page.locator(`[data-gator=${key}]`).focus(); await page.keyboard.press('Enter');
    await expect(page.locator(`[data-gator=${key}]`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#continueGator').click();
    await page.locator('#messageInput').fill('check-in'); await page.locator('#messageInput').press('Enter');
    await expect(page.locator('.source-note').last()).toContainText('project test data');
    await page.locator('#changeGator').click();
  }
  await page.locator('#continueGator').click();
  await expect(page.locator('.message.user')).toHaveCount(3);
  await page.reload();
  await expect(page.locator('[data-gator=trail]')).toHaveAttribute('aria-pressed', 'true');
});

test('thinking exits after failure, RTL and reduced motion work', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'}); await setup(page); await page.locator('#continueGator').click();
  await page.route('**/api/chat', async route => {
    await new Promise(r => setTimeout(r, 300)); await route.abort();
  });
  await page.locator('#messageInput').fill('question'); await page.locator('#messageInput').press('Enter');
  await expect(page.locator('#gatorStage')).toHaveAttribute('data-state', 'thinking');
  await expect(page.locator('#gatorStage')).toHaveAttribute('data-state', 'idle');
  await page.route('**/api/chat', route => route.fulfill({json: {
    session_id: 'b1193ac0-b20c-4813-8804-21a0327ae9e4', mode: 'ai', demo: false,
    reply: 'يرجى الاتصال بالفندق مباشرة.', reply_locale: 'ar', sources: [], suggestions: []}}));
  await page.locator('#replyLocale').selectOption('ar');
  await page.locator('#messageInput').fill('سؤال'); await page.locator('#messageInput').press('Enter');
  await expect(page.locator('.bubble').last()).toHaveAttribute('dir', 'rtl');
});

test('denied permissions keep typed chat usable', async ({page}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('denied', 'NotAllowedError'); };
  });
  await setup(page); await page.locator('#continueGator').click();
  await page.locator('#recordStart').click(); await expect(page.locator('#mediaStatus')).toContainText('denied');
  await page.locator('#cameraToggle').click(); await expect(page.locator('#cameraStatus')).toContainText('denied');
  await page.locator('#messageInput').fill('check-in'); await page.locator('#messageInput').press('Enter');
  await expect(page.locator('.bubble').last()).toContainText('3:00 PM');
  await expect(page.locator('#reservationViewBtn')).toBeHidden();
  await expect(page.getByText('GG-2026-1048', {exact: false})).toHaveCount(0);
});

test.describe('synthetic device qualification', () => {

  test('camera never uploads, recording is editable and sent only once', async ({page}) => {
    await page.addInitScript(() => {
      window.mediaStreams = []; window.mediaConstraints = [];
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async constraints => {
        window.mediaConstraints.push(constraints); const stream = await original(constraints);
        window.mediaStreams.push(stream); return stream;
      };
    });
    await setup(page); await page.locator('#continueGator').click();
    await page.locator('#autoSend').uncheck();
    await page.locator('#speakReplies').uncheck();
    const posts = []; page.on('request', req => { if (req.method() === 'POST') posts.push(req.url()); });
    await page.locator('#cameraToggle').click(); await expect(page.locator('#cameraTile')).toBeVisible();
    await page.waitForTimeout(500); expect(posts).toEqual([]);
    await page.locator('#cameraToggle').click();
    expect(await page.evaluate(() => window.mediaStreams[0].getTracks().every(t => t.readyState === 'ended'))).toBe(true);
    await page.route('**/api/speech?*', route => route.fulfill({json: {text: 'When is breakfast?'}}));
    await page.locator('#recordStart').click(); await expect(page.locator('#recordStop')).toBeVisible();
    await page.waitForTimeout(1500); await page.locator('#recordStop').click();
    await expect(page.locator('#messageInput')).toHaveValue('When is breakfast?');
    expect(posts.filter(url => url.endsWith('/chat'))).toHaveLength(0);
    await page.locator('#messageInput').fill('What time is check-in?'); await page.locator('#messageInput').press('Enter');
    await expect(page.locator('.bubble').last()).toContainText('3:00 PM');
    expect(posts.filter(url => url.endsWith('/chat'))).toHaveLength(1);
    expect(await page.evaluate(() => window.mediaConstraints[1])).toEqual({audio: true, video: false});
    await page.locator('#recordStart').click(); await expect(page.locator('#recordStop')).toBeVisible();
    await page.locator('#changeGator').click();
    expect(await page.evaluate(() => window.mediaStreams.every(s => s.getTracks().every(t => t.readyState === 'ended')))).toBe(true);
  });
});

for (const width of [1440, 390]) {
  test(`visual evidence ${width}`, async ({page}) => {
    await page.setViewportSize({width, height: 900}); await setup(page);
    await page.screenshot({path: `artifacts/expansion-picker-${width}.png`, fullPage: true});
    await page.locator('#continueGator').click();
    await page.locator('#messageInput').fill('check-in'); await page.locator('#messageInput').press('Enter');
    await expect(page.locator('.bubble').last()).toContainText('3:00 PM');
    await page.waitForTimeout(300);
    await page.screenshot({path: `artifacts/expansion-chat-${width}.png`, fullPage: true});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('AI playback drives mouth and ends cleanly on interruption', async ({page}) => {
  await page.addInitScript(() => {
    window.audioSources = [];
    class Context {
      state = 'running'; destination = {};
      resume() { return Promise.resolve(); }
      decodeAudioData() { return Promise.resolve({duration: 2}); }
      createBufferSource() { const s = {connect() {}, disconnect() {}, start() {}, stop() {}}; window.audioSources.push(s); return s; }
      createAnalyser() { return {fftSize: 256, connect() {}, disconnect() {}, getByteTimeDomainData(a) { a.fill(180); }}; }
    }
    window.AudioContext = Context;
  });
  await setup(page);
  await page.route('**/api/voice', route => route.fulfill({contentType: 'audio/wav', body: Buffer.from('RIFFfixture')}));
  await page.locator('#continueGator').click();
  await page.locator('#messageInput').fill('check-in'); await page.locator('#messageInput').press('Enter');
  await expect(page.locator('#guideArt')).toHaveClass(/mouth-open/);
  await expect(page.locator('#gatorStage')).toHaveAttribute('data-state', 'speaking');
  await page.evaluate(() => window.audioSources[0].onended());
  await expect(page.locator('#guideArt')).not.toHaveClass(/mouth-open/);
  await page.locator('#replayVoice').click();
  await expect(page.locator('#guideArt')).toHaveClass(/mouth-open/);
  await page.locator('#stopSpeech').click();
  await expect(page.locator('#gatorStage')).toHaveAttribute('data-state', 'idle');
  await expect(page.locator('#guideArt')).not.toHaveClass(/mouth-open/);
});

for (const [width, height] of [[1920, 900], [1440, 650], [390, 844]]) {
  test(`character fits scene ${width}x${height}`, async ({page}) => {
    await page.setViewportSize({width, height}); await setup(page); await page.locator('#continueGator').click();
    await page.waitForTimeout(800);
    const stage = await page.locator('#gatorStage').boundingBox();
    const panel = await page.locator('.gator-panel').boundingBox();
    expect(stage.y).toBeGreaterThanOrEqual(panel.y);
    expect(stage.y).toBeGreaterThanOrEqual(60);
    expect(stage.x).toBeGreaterThanOrEqual(panel.x);
    expect(stage.x + stage.width).toBeLessThanOrEqual(panel.x + panel.width);
    expect(stage.y + stage.height).toBeLessThanOrEqual(panel.y + panel.height);
    await expect(page.locator('.outdoor-desk')).toBeVisible();
    await page.screenshot({path: `artifacts/live-cabana-${width}x${height}.png`, fullPage: true});
  });
}

test('hands-free conversation sends after silence, speaks, and listens again', async ({page}) => {
  await page.addInitScript(() => {
    window.audioSources = []; window.processors = [];
    class Context {
      state = 'running'; destination = {}; sampleRate = 16000;
      resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
      decodeAudioData() { return Promise.resolve({duration: 2}); }
      createMediaStreamSource() { return {connect() {}, disconnect() {}}; }
      createScriptProcessor() { const p = {connect() {}, disconnect() {}}; window.processors.push(p); return p; }
      createBufferSource() { const s = {connect() {}, disconnect() {}, start() {}, stop() {}}; window.audioSources.push(s); return s; }
      createAnalyser() { return {fftSize: 256, connect() {}, disconnect() {}, getByteTimeDomainData(a) { a.fill(180); }}; }
    }
    window.AudioContext = Context;
  });
  await setup(page); await page.locator('#continueGator').click();
  await page.route('**/api/speech?*', route => route.fulfill({json: {text: 'What time is check-in?'}}));
  await page.route('**/api/voice', route => route.fulfill({contentType: 'audio/wav', body: Buffer.from('RIFFfixture')}));
  await page.locator('#liveTalk').click();
  await expect(page.locator('#gatorStage')).toHaveAttribute('data-state', 'listening');
  await page.evaluate(() => {
    const p = window.processors[0];
    for (const level of [.1, .1, 0, 0, 0, 0, 0, 0]) p.onaudioprocess({inputBuffer: {getChannelData: () => new Float32Array(4096).fill(level)}});
  });
  await expect(page.locator('.message.user')).toHaveCount(1);
  await expect(page.locator('#gatorStage')).toHaveAttribute('data-state', 'speaking');
  await page.evaluate(() => window.audioSources[0].onended());
  await expect(page.locator('#gatorStage')).toHaveAttribute('data-state', 'listening');
  await expect(page.locator('#recordStop')).toBeVisible();
  await page.locator('#liveTalk').click();
  await expect(page.locator('#gatorStage')).toHaveAttribute('data-state', 'idle');
  await expect(page.locator('#recordStop')).toBeHidden();
  await expect(page.locator('#liveTalk')).toHaveAttribute('aria-pressed', 'false');
});

test('blink closes briefly and restores open eyes', async ({page}) => {
  await setup(page); await page.locator('#continueGator').click();
  await expect(page.locator('#guideArt')).toHaveClass(/blinking/, {timeout: 8000});
  await expect(page.locator('#guideArt')).not.toHaveClass(/blinking/);
});
