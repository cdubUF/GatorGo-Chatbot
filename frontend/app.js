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
let reservationGeneration = 0, reservationStarted = false;
const reservationMessages = document.querySelector('#reservationMessages');
const defaults = ['What time is check-in?', 'What amenities do you have?', 'My room is dirty', 'I want a manager'];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function bubble(text, who = 'agent', target = messages) {
  const wrap = element('div', `message ${who}`);
  if (who === 'agent') {
    const avatar = element('img', 'mini-avatar');
    avatar.src = 'avatar.svg'; avatar.alt = '';
    wrap.append(avatar);
  }
  const body = element('div', 'message-body');
  body.append(element('div', 'bubble', text));
  wrap.append(body); target.append(wrap);
  const scrollArea = target === messages ? messages : document.querySelector('#reservationView');
  scrollArea.scrollTop = scrollArea.scrollHeight;
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
    (demo ? 'RULE-BASED DEMO' : 'SOURCED FAQ') : mode === 'faq_fallback' ? 'AI UNAVAILABLE' : 'OFFLINE';
  document.querySelector('#modeBadge').textContent = label;
  document.querySelector('#engineLabel').textContent = label.toLowerCase();
  document.querySelector('#serviceStatus').textContent = label === 'OFFLINE' ? 'Service offline' : label;
}

function invalidateHandoff() {
  if (activeHandoff) {
    activeHandoff.querySelectorAll('button').forEach(button => button.disabled = true);
    activeHandoff = null;
  }
}

function reservationLookup() {
  const lookupEpoch = epoch, generation = ++reservationGeneration;
  const current = () => lookupEpoch === epoch && generation === reservationGeneration;
  reservationStarted = true;
  reservationMessages.replaceChildren();
  const body = bubble('To check a reservation, enter the confirmation number and full name.', 'agent', reservationMessages);
  const card = element('form', 'handoff-card');
  card.append(element('p', 'small', 'Test reservations only. Real hotels are shown for reference; these bookings are fictional and not connected to those hotels.'));
  const hotelLabel = element('label', '', 'Hotel or provider');
  const hotel = element('select'); hotel.required = true;
  const placeholder = element('option', '', 'Loading hotels…'); placeholder.value = ''; hotel.append(placeholder);
  hotelLabel.append(hotel); card.append(hotelLabel);
  const consentLabel = element('label', 'small');
  const consent = element('input'); consent.type = 'checkbox';
  consentLabel.append(consent, document.createTextNode(' I am using fictional test data only.'));
  consentLabel.hidden = true; card.append(consentLabel);
  hotel.addEventListener('change', () => {
    consentLabel.hidden = hotel.value !== 'mews-sandbox';
    consent.required = hotel.value === 'mews-sandbox';
    consent.checked = false;
  });
  function field(label, name, autocomplete = 'off') {
    const wrapper = element('label', '', label);
    const box = element('input'); box.name = name; box.required = true;
    box.autocomplete = autocomplete; box.maxLength = 120; wrapper.append(box); card.append(wrapper);
    return box;
  }
  const confirmation = field('Confirmation number', 'confirmation');
  const name = field('Full name', 'name', 'name');
  const button = element('button', 'outline-button', 'Continue'); button.type = 'submit'; card.append(button);
  const note = element('p', 'small'); card.append(note); body.append(card);
  button.disabled = true;
  request('/reservations/providers').then(providers => {
    if (!current()) return;
    placeholder.textContent = 'Choose a hotel';
    for (const provider of providers) {
      const option = element('option', '', `${provider.name} — ${provider.kind === 'mews-test' ? 'public test property' : 'fictional booking'}`);
      option.value = provider.id; hotel.append(option);
    }
    button.disabled = providers.length === 0;
  }).catch(() => { if (current()) note.textContent = 'Reservation lookup is not configured. Contact the hotel directly.'; });
  card.addEventListener('submit', async event => {
    event.preventDefault(); button.disabled = true; note.textContent = 'Checking…';
    try {
      const result = await request('/reservations/lookup', {method: 'POST', body: {
        confirmation: confirmation.value, name: name.value, hotel: hotel.value, test_data_only: consent.checked,
      }});
      if (!current()) return;
      card.replaceChildren(element('p', '', result.message));
      const label = element('label', '', 'Verification code');
      const code = element('input'); code.name = 'code'; code.required = true; code.inputMode = 'numeric';
      code.autocomplete = 'one-time-code'; code.pattern = '[0-9]{6}'; code.maxLength = 6;
      label.append(code); card.append(label);
      const verify = element('button', 'outline-button', 'Verify'); verify.type = 'button'; card.append(verify);
      const feedback = element('p', 'small', 'For local fictional records, the code appears in the server console.'); card.append(feedback);
      verify.addEventListener('click', async () => {
        if (!code.reportValidity()) return;
        verify.disabled = true; feedback.textContent = 'Verifying…';
        try {
          const verified = await request('/reservations/verify', {method: 'POST', body: {
            challenge_id: result.challenge_id, code: code.value,
          }});
          if (!current()) return;
          code.value = ''; const accessToken = verified.access_token;
          const reservation = await request('/reservations/me', {token: accessToken});
          if (!current()) return;
          card.replaceChildren(element('strong', '', 'Verified test reservation'));
          for (const [title, value] of [['Hotel', reservation.hotel], ['Status', reservation.status], ['Confirmation', reservation.confirmation],
            ['Guest', `${reservation.first_name} ${reservation.last_name}`], ['Check-in', reservation.check_in],
            ['Check-out', reservation.check_out], ['Room', reservation.room_type], ['Guests', reservation.guests]]) {
            card.append(element('p', '', `${title}: ${value}`));
          }
          if (reservation.provider === 'mews-sandbox') {
            card.append(element('p', 'small', 'Mews test data is read-only. No changes can be submitted.'));
            return;
          }
          const change = element('button', 'outline-button', 'Request reservation change');
          change.type = 'button'; card.append(change);
          change.addEventListener('click', () => {
            change.remove(); const detail = element('input'); detail.placeholder = 'Describe the requested change';
            detail.maxLength = 500; detail.setAttribute('aria-label', 'Requested change'); card.append(detail);
            const sendChange = element('button', 'outline-button', 'Submit request'); sendChange.type = 'button'; card.append(sendChange);
            sendChange.addEventListener('click', async () => {
              if (detail.value.trim().length < 3) return;
              sendChange.disabled = true;
              try {
                const result = await request('/reservations/request-change', {method: 'POST', token: accessToken,
                  body: {details: detail.value.trim()}});
                if (!current()) return;
                detail.remove(); sendChange.remove(); card.append(element('p', '', result.message));
              } catch (error) { card.append(element('p', '', error.message)); sendChange.disabled = false; }
            });
          });
        } catch { if (!current()) return; feedback.textContent = 'Verification failed or expired. Check the code or start again.'; verify.disabled = false; }
      });
    } catch {
      if (!current()) return;
      note.textContent = 'Reservation lookup is unavailable or the request limit was reached. Please contact the hotel.';
      button.disabled = false;
    }
  });
}

function handoffCard(body, handoff) {
  invalidateHandoff();
  const card = element('section', 'handoff-card');
  const label = element('strong', '', `${handoff.urgency.toUpperCase()} · Summary prepared`);
  card.append(label, element('p', '', handoff.summary), element('p', '', handoff.next_step));
  if (!config.demo) { body.append(card); return; }
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
  if (/\b(reservation|booking)\b/i.test(text) && /\b(my|mine|check|find|show|confirm|view|retrieve|look up)\b/i.test(text)
      && !/\b(cancel|refund|change|policy|policies|terms|rules|fees)\b/i.test(text)) {
    input.value = ''; setBusy(false); setView('reservation'); return;
  }
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
        s.status === 'demo_only' ? `${s.topic} [${s.id}] · project test data` :
          `${s.topic} [${s.id}] · ${s.status === 'general' ? 'general guidance' : s.status} · ${s.source}`).join('; ')));
    }
    if (result.handoff) handoffCard(body, result.handoff);
    suggestions(result.suggestions);
  } catch (error) {
    if (turn !== epoch) return;
    showMode('offline');
    const body = bubble('The service is unavailable. Please retry or contact a hotel employee directly. No staff has been contacted.');
    const retryButton = element('button', 'outline-button', 'Retry message');
    retryButton.addEventListener('click', () => { retryButton.disabled = true; submit(text, true); });
    body.append(retryButton);
  } finally {
    if (turn === epoch) {
      setBusy(false);
      messages.scrollTop = messages.scrollHeight;
      if (!messages.hidden) input.focus();
    }
  }
}

function setView(view) {
  const reservation = view === 'reservation';
  document.querySelector('#chatViewBtn').setAttribute('aria-pressed', String(!reservation));
  document.querySelector('#reservationViewBtn').setAttribute('aria-pressed', String(reservation));
  messages.hidden = reservation;
  document.querySelector('#composerArea').hidden = reservation;
  document.querySelector('#reservationView').hidden = !reservation;
  if (reservation && !reservationStarted) reservationLookup();
  if (!reservation) input.focus();
}

async function reset() {
  epoch += 1;
  reservationGeneration += 1; reservationStarted = false; reservationMessages.replaceChildren();
  setView('chat');
  controller?.abort();
  const oldSession = sessionId;
  sessionId = null;
  invalidateHandoff(); messages.replaceChildren(); setBusy(false); suggestions();
  bubble("Welcome to Gator Go Resort & Spa! I'm your virtual AI concierge. I can help answer questions, but I can't make bookings or contact staff. Please don't enter personal details.");
  input.focus();
  if (oldSession) {
    try { await request(`/sessions/${oldSession}`, {method: 'DELETE'}); }
    catch { status.textContent = 'New conversation started. Previous server session could not be cleared and will expire automatically.'; }
  }
}

form.addEventListener('submit', event => { event.preventDefault(); submit(input.value); });
input.addEventListener('input', () => send.disabled = busy || !input.value.trim());
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => { setView('chat'); submit(button.dataset.prompt); }));
document.querySelector('#resetBtn').addEventListener('click', reset);
document.querySelector('#chatViewBtn').addEventListener('click', () => setView('chat'));
document.querySelector('#reservationViewBtn').addEventListener('click', () => setView('reservation'));
document.querySelector('#restartReservation').addEventListener('click', reservationLookup);
reset();
try {
  config = await request('/health');
  showMode(config.mode, config.demo);
} catch {
  config.demo = false;
  showMode('offline');
  status.textContent = 'Backend unavailable. Start the project with run.bat or scripts/dev.sh.';
}
