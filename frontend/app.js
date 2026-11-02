import {request} from './api.js';

const messages = document.querySelector('#messages');
const form = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const chips = document.querySelector('#quickReplies');
const status = document.querySelector('#chatStatus');
const send = document.querySelector('#sendBtn');
let sessionId = null, busy = false, epoch = 0, controller;
let config = {mode: 'unknown', demo: false};
let activeHandoff = null;
const explicitOfflineDemo = new URLSearchParams(location.search).get('demo') === '1';
const defaults = ['What time is check-in?', 'What amenities do you have?', 'My room is dirty', 'I want a manager'];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function bubble(text, who = 'agent') {
  const wrap = element('div', `message ${who}`);
  if (who === 'agent') {
    const avatar = element('img', 'mini-avatar');
    avatar.src = 'avatar.svg'; avatar.alt = '';
    wrap.append(avatar);
  }
  const body = element('div', 'message-body');
  body.append(element('div', 'bubble', text));
  wrap.append(body); messages.append(wrap);
  messages.scrollTop = messages.scrollHeight;
  return body;
}

function suggestions(prompts = defaults) {
  chips.replaceChildren();
  prompts.forEach(prompt => {
    const button = element('button', 'chip', prompt);
    button.type = 'button'; button.disabled = busy;
    button.addEventListener('click', () => submit(prompt));
    chips.append(button);
  });
}

function setBusy(value) {
  busy = value;
  send.disabled = value || !input.value.trim();
  document.querySelectorAll('.chip, [data-prompt], #demoCheckin').forEach(b => b.disabled = value);
  messages.setAttribute('aria-busy', String(value));
  status.textContent = value ? 'Preparing your response…' : '';
}

function showMode(mode, demo = config.demo) {
  const label = mode === 'ai' || mode === 'openai' ? 'AI ASSISTED' : mode === 'mock' ?
    (demo ? 'RULE-BASED DEMO' : 'SOURCED FAQ') : mode === 'faq_fallback' ? 'FAQ FALLBACK' : 'OFFLINE';
  document.querySelector('#modeBadge').textContent = label;
  document.querySelector('#engineLabel').textContent = label.toLowerCase();
  document.querySelector('#serviceStatus').textContent = label === 'OFFLINE' ? 'Service offline' : label;
  document.querySelector('.demo-card').hidden = !demo;
}

function invalidateHandoff() {
  if (activeHandoff) {
    activeHandoff.querySelectorAll('button').forEach(button => button.disabled = true);
    activeHandoff = null;
  }
}

function handoffCard(body, handoff) {
  invalidateHandoff();
  const card = element('section', 'handoff-card');
  const label = element('strong', '', `${handoff.urgency.toUpperCase()} · Summary prepared`);
  card.append(label, element('p', '', handoff.summary), element('p', '', handoff.next_step));
  card.append(element('p', 'small', 'Only this summary goes to the local demo queue with your permission. It does not notify real staff.'));
  const action = element('button', 'outline-button', 'Allow demo queue submission');
  const decline = element('button', 'outline-button', 'Keep private');
  card.append(action, decline);
  const cardSession = sessionId;
  async function consent(allowed) {
    action.disabled = decline.disabled = true;
    try {
      const result = await request('/handoffs', {method: 'POST', body: {
        session_id: cardSession, handoff_id: handoff.id, consent: allowed,
      }});
      label.textContent = result.state === 'simulated' ? 'Added to DEMO queue · No staff notified' : 'Kept private · Not submitted';
    } catch (error) {
      label.textContent = `${error.message} No staff was notified.`;
      if (activeHandoff === card) action.disabled = decline.disabled = false;
    }
  }
  action.addEventListener('click', () => consent(true));
  decline.addEventListener('click', () => consent(false));
  body.append(card); activeHandoff = card;
}

async function submit(raw, retry = false) {
  const text = raw.trim();
  if (!text || busy) return;
  const turn = epoch;
  invalidateHandoff();
  if (!retry) bubble(text, 'user');
  input.value = '';
  setBusy(true);
  controller = new AbortController();
  try {
    const result = await request('/chat', {method: 'POST', signal: controller.signal,
      body: {session_id: sessionId, message: text}});
    if (turn !== epoch) return;
    sessionId = result.session_id;
    config = {mode: result.mode, demo: result.demo};
    showMode(result.mode, result.demo);
    const body = bubble(result.reply);
    if (result.sources?.length) {
      body.append(element('p', 'source-note', 'Sources: ' + result.sources.map(s =>
        `${s.topic} [${s.id}] · ${s.status === 'demo_only' ? 'sample' : s.status} · ${s.source}`).join('; ')));
    }
    if (result.handoff) handoffCard(body, result.handoff);
    suggestions(result.suggestions);
  } catch (error) {
    if (turn !== epoch) return;
    showMode('offline');
    const body = bubble('The service is unavailable. Please retry or contact a hotel employee directly. No staff has been contacted.');
    if (explicitOfflineDemo && config.demo) {
      body.append(element('p', 'source-note', 'Offline rule-based demo: no hotel facts or reservation lookup are available. For immediate danger, contact local emergency services directly.'));
    }
    const retryButton = element('button', 'outline-button', 'Retry message');
    retryButton.addEventListener('click', () => { retryButton.disabled = true; submit(text, true); });
    body.append(retryButton);
  } finally {
    if (turn === epoch) {
      setBusy(false);
      messages.scrollTop = messages.scrollHeight;
      input.focus();
    }
  }
}

async function reset() {
  epoch += 1;
  controller?.abort();
  const oldSession = sessionId;
  sessionId = null;
  invalidateHandoff(); messages.replaceChildren(); setBusy(false); suggestions();
  bubble("Welcome to Gator Go Resort & Spa! I'm your virtual AI concierge. This course prototype offers sourced hotel information and demo handoff summaries. It cannot make bookings or contact staff. Please don't enter personal details.");
  input.focus();
  if (oldSession) {
    try { await request(`/sessions/${oldSession}`, {method: 'DELETE'}); }
    catch { status.textContent = 'New conversation started. Previous server session could not be cleared and will expire automatically.'; }
  }
}

form.addEventListener('submit', event => { event.preventDefault(); submit(input.value); });
input.addEventListener('input', () => send.disabled = busy || !input.value.trim());
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => submit(button.dataset.prompt)));
document.querySelector('#demoCheckin').addEventListener('click', () => submit('Start demo check-in'));
document.querySelector('#resetBtn').addEventListener('click', reset);
reset();
try {
  config = await request('/health');
  showMode(config.mode, config.demo);
} catch {
  config.demo = explicitOfflineDemo;
  showMode('offline');
  status.textContent = 'Backend unavailable. Start the project with run.bat or scripts/dev.sh.';
}
