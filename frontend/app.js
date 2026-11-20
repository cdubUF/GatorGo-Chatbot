import {conversationId, adoptConversation, resetConversation, flushConversation} from './conversation.js';
import {enhanceReply, enhanceSpokenReply, addCopySummary, resetPlans} from './resort.js';
import {request} from './api.js';
import {avatarPath, guideProfile, setThinking, speakReply, stopPlayback, cancelRecording, releaseMedia, replyLocale, configureMedia, conversationFailed} from './guest.js';

const messages = document.querySelector('#messages');
const form = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const chips = document.querySelector('#quickReplies');
const status = document.querySelector('#chatStatus');
const send = document.querySelector('#sendBtn');
let busy = false, epoch = 0, controller;
let config = {mode: 'unknown', demo: false};
let activeHandoff = null;
let reservationGeneration = 0, reservationStarted = false, reservationToken = null;
let reservationIntent = '';
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
    const avatar = element('span', 'mini-avatar mascot-sprite');
    avatar.dataset.character = avatarPath(); avatar.setAttribute('aria-hidden', 'true');
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
  busy = value; setThinking(value);
  document.querySelector("#recordStart").disabled = value || !config.speech_enabled;
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

function disconnectReservation() {
  reservationToken = null;
  document.querySelector('#reservationLink').hidden = true;
}

function reservationLookup() {
  disconnectReservation();
  const lookupEpoch = epoch, generation = ++reservationGeneration;
  const current = () => lookupEpoch === epoch && generation === reservationGeneration;
  reservationStarted = true;
  reservationMessages.replaceChildren();
  const body = bubble('To check a reservation, enter the confirmation number and full name.', 'agent', reservationMessages);
  const card = element('form', 'handoff-card');
  card.append(element('p', 'small', 'Look up a fictional Gator Go reservation using the sample details above.'));
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
    button.disabled = !providers.some(provider => provider.id === 'gatorgo');
    if (button.disabled) note.textContent = 'Reservation testing is not configured.';
  }).catch(() => { if (current()) note.textContent = 'Reservation testing is not configured. Start the local reservation service.'; });
  card.addEventListener('submit', async event => {
    event.preventDefault(); button.disabled = true; note.textContent = 'Checking…';
    try {
      const result = await request('/reservations/lookup', {method: 'POST', body: {
        confirmation: confirmation.value, name: name.value, hotel: 'gatorgo',
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
          reservationToken = accessToken;
          document.querySelector('#reservationLinkText').textContent = `Test stay connected: ${reservation.hotel}`;
          document.querySelector('#reservationLink').hidden = false;
          card.replaceChildren(element('strong', '', 'Verified test reservation'));
          for (const [title, value] of [['Hotel', reservation.hotel], ['Status', reservation.status], ['Confirmation', reservation.confirmation],
            ['Guest', `${reservation.first_name} ${reservation.last_name}`], ['Check-in', reservation.check_in],
            ['Check-out', reservation.check_out], ['Room', reservation.room_type], ['Guests', reservation.guests]]) {
            card.append(element('p', '', `${title}: ${value}`));
          }
          const ask = element('button', 'outline-button', 'Ask AI about this stay');
          ask.type = 'button'; ask.addEventListener('click', () => setView('chat')); card.append(ask);
          card.append(element('p', 'small', 'AI chat can use the hotel, stay dates, room type, guest count, and status. Your name, confirmation number, and code are not sent to the AI.'));
          suggestions(['When do I check in?', 'When do I check out?', 'What room type is booked?', 'How many guests are on my stay?']);
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
  addCopySummary(card, handoff);
  if (!config.demo) { body.append(card); return; }
  card.append(element('p', 'small', 'Only this summary goes to the local demo queue with your permission. It does not notify real staff.'));
  const action = element('button', 'outline-button', 'Allow demo queue submission');
  const decline = element('button', 'outline-button', 'Keep private');
  card.append(action, decline);
  const cardSession = conversationId();
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
  stopPlayback(); cancelRecording();
  const turn = epoch;
  if (/\b(change|modify|reschedule|cancel)\w*\b/i.test(text) && /\b(reservation|booking|stay|room|dates?)\b/i.test(text)) {
    reservationIntent = 'Your chat mentioned a possible reservation change. After verification, you can review the stay and request a change.';
  } else if (/\b(check.?in|check.?out|arrival|departure)\b/i.test(text)) {
    reservationIntent = 'Your chat mentioned arrival or departure. Verify a test stay to ask about its dates in AI chat.';
  }
  invalidateHandoff();
  if (config.reservation_testing && !reservationToken && /\b(reservation|booking)\b/i.test(text) && /\b(check|find|show|view|retrieve|look up)\b/i.test(text)
      && !/\b(cancel|refund|change|policy|policies|terms|rules|fees)\b/i.test(text)) {
    input.value = ''; setBusy(false); setView('reservation'); return;
  }
  if (!retry) bubble(text, 'user');
  input.value = '';
  setBusy(true);
  document.dispatchEvent(new CustomEvent('concierge-reaction', {detail: {role: 'user', text}}));
  controller = new AbortController();
  try {
    await flushConversation();
    if (turn !== epoch) return;
    const result = await request('/chat', {method: 'POST', signal: controller.signal,
      token: reservationToken, body: {session_id: conversationId(), message: text, locale: replyLocale(), guide: avatarPath()}});
    if (turn !== epoch) return;
    adoptConversation(result.session_id);
    config = {...config, mode: result.mode, demo: result.demo};
    showMode(result.mode, result.demo);
    const body = bubble(result.reply);
    body.querySelector('.bubble').dir = result.reply_locale === 'ar' ? 'rtl' : 'auto';
    body.querySelector('.bubble').lang = result.reply_locale || 'en';
    document.dispatchEvent(new CustomEvent('concierge-reaction', {detail: {role: 'agent', text: result.reply, decision: result.decision}}));
    speakReply(result.reply, result.reply_locale || 'en');
    enhanceReply(body, result);
    if (result.handoff) handoffCard(body, result.handoff);
    suggestions(result.suggestions);
  } catch (error) {
    if (turn !== epoch) return;
    if (error.status === 401 && reservationToken) {
      disconnectReservation();
      bubble('Your test reservation verification expired. Verify it again in Reservation testing, then retry your question.');
      return;
    }
    showMode('offline');
    conversationFailed();
    document.dispatchEvent(new CustomEvent('concierge-reaction', {detail: {role: 'agent', text: 'Service unavailable'}}));
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
  releaseMedia();
  const reservation = view === 'reservation';
  document.querySelector('#chatViewBtn').setAttribute('aria-pressed', String(!reservation));
  document.querySelector('#reservationViewBtn').setAttribute('aria-pressed', String(reservation));
  messages.hidden = reservation;
  document.querySelector('#composerArea').hidden = reservation;
  document.querySelector('#reservationView').hidden = !reservation;
  const intent = document.querySelector('#reservationIntent');
  if (intent) {intent.textContent = reservationIntent; intent.hidden = !reservationIntent;}
  if (reservation && !reservationStarted) reservationLookup();
  if (!reservation) input.focus();
}

async function reset() {
  resetPlans(); voiceMessages.clear(); voiceEvidence.clear();
  epoch += 1;
  reservationGeneration += 1; reservationStarted = false; reservationIntent = ''; disconnectReservation(); reservationMessages.replaceChildren();
  setView('chat');
  controller?.abort();
  const oldSession = conversationId();
  resetConversation();
  invalidateHandoff(); messages.replaceChildren(); setBusy(false); suggestions(guideProfile().questions);
  bubble(guideProfile().greeting + " I am an AI concierge. No bookings or staff notifications. What is your trip ID? For this demo, enter demo. Please avoid real personal details.");
  input.focus();
  if (oldSession) {
    try { await request(`/sessions/${oldSession}`, {method: 'DELETE'}); }
    catch { status.textContent = 'New conversation started. Previous server session could not be cleared and will expire automatically.'; }
  }
}

const voiceMessages = new Map(), voiceEvidence = new Map();
function showVoiceEvidence(id, body) {
  const result = voiceEvidence.get(id);
  if (!result) return;
  let details = body.querySelector('.voice-evidence');
  if (!details) {details = element('div', 'voice-evidence'); body.append(details);}
  details.replaceChildren();
  enhanceReply(details, result);
  const handoff = result.handoff || (result.requires_guest_review ? result : null);
  if (handoff) handoffCard(details, handoff);
}
document.addEventListener('voice-evidence', event => {
  const {id, result} = event.detail;
  if (!id || !result) return;
  const previous = voiceEvidence.get(id) || {};
  voiceEvidence.set(id, {...previous,...result,
    sources:[...new Map([...(previous.sources || []),...(result.sources || [])].map(s=>[s.id,s])).values()]});
  while (voiceEvidence.size > 100) voiceEvidence.delete(voiceEvidence.keys().next().value);
  const body = voiceMessages.get(`${id}-agent`);
  if (body) showVoiceEvidence(id, body);
});
document.addEventListener('conversation-sync-error', () => {
  status.textContent = 'Conversation memory is waiting to sync. Your next typed message will retry it.';
});
document.addEventListener('voice-message',event=>{
 const {id,role,text}=event.detail;if(!id||!text||!['user','agent'].includes(role))return;
 const key=`${id}-${role}`;let body=voiceMessages.get(key);
 if(!body){body=bubble(text,role);body.parentElement.dataset.voiceTurn=id;voiceMessages.set(key,body);
  if(role==='user'){const reply=voiceMessages.get(`${id}-agent`);if(reply)messages.insertBefore(body.parentElement,reply.parentElement);}
 }else body.querySelector('.bubble').textContent=text;
 if(role==='agent'){enhanceSpokenReply(body,text);showVoiceEvidence(id,body);}
 messages.scrollTop=messages.scrollHeight;
});
document.addEventListener('guest-question', event => submit(event.detail));
document.addEventListener('guide-changed', () => { if (!messages.querySelector('.message.user')) { const welcome = messages.querySelector('.bubble'); if (welcome) welcome.textContent = guideProfile().greeting + ' I am an AI concierge.'; suggestions(guideProfile().questions); } });
form.addEventListener('submit', event => { event.preventDefault(); submit(input.value); });
input.addEventListener('input', () => send.disabled = busy || !input.value.trim());
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => { setView('chat'); submit(button.dataset.prompt); }));
document.querySelector('#resetBtn').addEventListener('click', reset);
document.querySelector('#chatViewBtn').addEventListener('click', () => setView('chat'));
document.querySelector('#reservationViewBtn').addEventListener('click', () => setView('reservation'));
document.querySelector('#restartReservation').addEventListener('click', reservationLookup);
document.querySelector('#disconnectReservation').addEventListener('click', disconnectReservation);
reset();
try {
  config = await request('/health');
  showMode(config.mode, config.demo);
  configureMedia(config);
  document.querySelector('.view-switcher').hidden = !config.reservation_testing;
  if (!config.reservation_testing) document.querySelector('.reservation-intro').replaceChildren();
  document.querySelector('#dataNotice').firstChild.textContent = config.sample_knowledge ? 'Using project test data. ' : 'Using approved property knowledge only. ';
} catch {
  config.demo = false;
  showMode('offline');
  status.textContent = 'Backend unavailable. Start the project with run.bat or scripts/dev.sh.';
}
