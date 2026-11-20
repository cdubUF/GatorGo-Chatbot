import {request} from './api.js';
const $ = id => document.getElementById(id);
const node = (tag, text, className) => { const e = document.createElement(tag); if (text) e.textContent = text; if (className) e.className = className; return e; };
let records = [], events = [], today = '', zone = '', saved = new Set(), selectedDate = '', lastTrigger;
const dialog = $('resortDialog'), content = $('resortContent');
function button(text, action) { const b = node('button', text, 'outline-button'); b.type = 'button'; b.addEventListener('click', action); return b; }
function open(title) { lastTrigger = document.activeElement; dialog.classList.remove('map-view'); $('resortTitle').textContent = title; content.replaceChildren(); if (!dialog.open) dialog.showModal(); }
function ask(question) { dialog.close(); if(!$('gatorPicker').hidden)$('continueGator').click(); if(matchMedia('(max-width:650px)').matches&&!document.body.classList.contains('chat-open'))$('chatDrawerToggle').click(); document.dispatchEvent(new CustomEvent('guest-question', {detail: question})); }
function sourceText(record) { return `${record.status === 'demo_only' ? 'Sample information' : record.status} · ${record.source}`; }
export async function loadResort() {
  try {
    const [knowledge, activities] = await Promise.all([request('/knowledge'), request('/activities')]);
    records = knowledge; events = activities.events; today = activities.today; zone = activities.timezone; selectedDate ||= today;
  } catch { $('resortError').textContent = 'Resort information unavailable. Please retry.'; }
}
export function resetPlans() { saved = new Set(); }
export function openMap(id) {
  open('Explore the resort'); dialog.classList.add('map-view');
  const layout=node('div','','map-layout'), map=node('div','','resort-map'), detail=node('section','','map-detail');
  const art=node('img');art.src='assets/resort-map.png';art.alt='Illustrated tropical sample resort with lagoon, terracotta-roof venues and garden paths';map.append(art);
  const heading=node('h3'),photo=node('div','','map-photo'),description=node('p','','map-description'),source=node('p','','small');
  photo.setAttribute('role','img');description.setAttribute('role','status');
  const askButton=button('Ask Gator',()=>{});askButton.classList.add('map-ask');
  const portrait=node('span','','mascot-sprite');portrait.dataset.character='trail';portrait.setAttribute('aria-hidden','true');const askLabel=node('span');askButton.replaceChildren(portrait,askLabel);
  const positions={'palm-grill':[81,48],'blue-heron':[24,75],'lagoon-pool':[52,57],'sunset-lounge':[78,79],'nature-walk':[20,32]};
  const photos={'palm-grill':'0% 0%','blue-heron':'100% 0%','sunset-lounge':'0% 100%','nature-walk':'100% 100%'};
  function select(record){
    map.querySelectorAll('.map-pin').forEach(pin=>pin.setAttribute('aria-pressed',String(pin.dataset.venue===record.id)));
    heading.textContent=record.venue.name;description.textContent=`${record.venue.name}: ${record.venue.location}`;source.textContent=sourceText(record);
    photo.dataset.venue=record.id;photo.setAttribute('aria-label',`Illustrative sample ${record.venue.name}`);
    photo.style.backgroundImage=record.id==='lagoon-pool'?"url('assets/poolside-cabana.png')":"url('assets/venue-photos.png')";
    photo.style.backgroundSize=record.id==='lagoon-pool'?'cover':'200% 200%';photo.style.backgroundPosition=photos[record.id]||'center';
    askLabel.textContent=`Ask Gator about ${record.venue.name}`;askButton.onclick=()=>{document.dispatchEvent(new Event('voice-end-request'));ask(`Tell me about ${record.venue.name}`);};
  }
  for(const record of records.filter(r=>r.venue?.pin)){
    const pin=button(record.venue.name,()=>select(record));pin.className='map-pin';pin.dataset.venue=record.id;
    const xy=positions[record.id]||record.venue.pin;pin.style.left=`${xy[0]}%`;pin.style.top=`${xy[1]}%`;pin.setAttribute('aria-pressed','false');map.append(pin);
  }
  detail.append(heading,photo,description,source,askButton);layout.append(map,detail);content.append(layout,node('p','Illustrated sample map ? Not for navigation or emergencies.','small'));
  const chosen=records.find(r=>r.id===id&&r.venue?.pin)||records.find(r=>r.venue?.pin);
  if(chosen)select(chosen);else {description.textContent='No confirmed map locations are available.';askButton.hidden=true;photo.hidden=true;}
}
export function enhanceSpokenReply(body,text){
  body.querySelectorAll('.spoken-map-action').forEach(b=>b.remove());
  for(const record of records.filter(r=>r.venue?.pin&&text.toLowerCase().includes(r.venue.name.toLowerCase()))){
    const action=button(`Show on map: ${record.venue.name}`,()=>openMap(record.id));action.classList.add('spoken-map-action');body.append(action);
  }
}
export function openCalendar(plans = false) {
  open(plans ? 'My plans' : 'Resort activities');
  content.append(node('p', `Sample activities · ${zone || 'Resort local time'} · Saved only for this conversation`, 'small'));
  if (!plans) {
    const label = node('label', 'Choose date '); const date = node('input'); date.type = 'date'; date.value = selectedDate || today; date.id = 'calendarDate';
    date.addEventListener('change', () => { selectedDate = date.value; openCalendar(); }); label.append(date); content.append(label);
  }
  const shown = events.filter(e => plans ? saved.has(e.id) : e.date === selectedDate);
  if (!shown.length) content.append(node('p', plans ? 'No saved activities yet. Save one from the calendar.' : 'No activities listed for this date.', 'empty-state'));
  for (const event of shown) {
    const card = node('article', '', 'event-card'); card.dataset.event = event.id;
    const venue = records.find(r => r.id === event.venue_id);
    card.append(node('h3', event.title), node('p', `${event.date} · ${event.start_time} · ${venue?.venue?.name || 'Venue unconfirmed'}`), node('p', event.description), node('p', `Sample information · ${event.source}`, 'small'));
    const save = button(saved.has(event.id) ? 'Remove from plans' : 'Save activity', () => {
      if (saved.has(event.id)) saved.delete(event.id); else saved.add(event.id); openCalendar(plans);
    }); save.setAttribute('aria-pressed', String(saved.has(event.id))); card.append(save, button('Ask about this event', () => ask(`Tell me about ${event.title}`))); content.append(card);
  }
  content.append(button(plans ? 'Browse activities' : 'My plans', () => openCalendar(!plans)));
}
export function enhanceReply(body, result) {
  if (result.sources?.length) {
    const sources = node('p', 'Sources: ', 'source-note');
    for (const record of result.sources) {
      const a = node('a', `${record.topic} [${record.id}] · ${record.status === 'demo_only' ? 'project test data' : record.status}`);
      a.href = `knowledge.html#record-${encodeURIComponent(record.id)}`; a.target = '_blank'; a.rel = 'noopener'; sources.append(a, document.createTextNode(' '));
    }
    body.append(sources);
  }
  for (const choice of result.choices || []) body.append(button(choice.label, () => document.dispatchEvent(new CustomEvent('guest-question', {detail: choice.question}))));
  for (const action of result.actions || []) {
    if (action.type === 'map') body.append(button('Show on map', () => openMap(action.venue_id)));
    if (action.type === 'link' && action.url?.startsWith('https://')) { const link = node('a', action.label); link.href = action.url; link.target = '_blank'; link.rel = 'noopener'; body.append(link); }
  }
  if (!result.reply_id) return;
  const details = node('details', '', 'feedback'); details.append(node('summary', 'Something not right?'));
  const feedbackStatus = node('p'); feedbackStatus.setAttribute('role', 'status');
  for (const [reason, label] of [['wrong_venue', 'Wrong venue'], ['outdated_hours', 'Outdated hours'], ['unclear_answer', 'Unclear answer']]) {
    details.append(button(label, async () => {
      const buttons = details.querySelectorAll('button'); buttons.forEach(b => b.disabled = true);
      try { await request('/feedback', {method: 'POST', body: {session_id: result.session_id, reply_id: result.reply_id, reason}}); feedbackStatus.textContent = 'Feedback recorded. Thank you.'; }
      catch (error) { feedbackStatus.textContent = error.status === 409 ? 'Feedback already recorded for this reply.' : 'Could not save feedback. Please retry.'; if (error.status !== 409) buttons.forEach(b => b.disabled = false); }
    }));
  }
  details.append(feedbackStatus); body.append(details);
}
export function addCopySummary(card, handoff) {
  const label = node('label', '', 'summary-approval'), approval = node('input'); approval.type = 'checkbox'; label.append(approval, document.createTextNode(' I reviewed this summary'));
  const status = node('p'); status.setAttribute('role', 'status');
  const copy = button('Copy summary', async () => {
    try { await navigator.clipboard.writeText(handoff.summary); status.textContent = 'Summary copied. Contact the desk yourself; no staff was notified.'; }
    catch { status.textContent = 'Copy failed. Select the visible summary to copy it manually.'; }
  }); copy.disabled = true; approval.addEventListener('change', () => copy.disabled = !approval.checked); card.append(label, copy, status);
}
$('calendarOpen').addEventListener('click', async () => { await loadResort(); openCalendar(); });
$('plansOpen').addEventListener('click', async () => { await loadResort(); openCalendar(true); });
$('mapOpen').addEventListener('click', async () => { await loadResort(); openMap(); });
$('closeResort').addEventListener('click', () => dialog.close()); dialog.addEventListener('close', () => lastTrigger?.focus({preventScroll: true}));
const drawer = document.querySelector('.chat-panel');
export function setDrawer(open) {
  document.body.classList.toggle('chat-open', open); $('chatDrawerToggle').setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('chat-collapsed', !open);
  $('chatDrawerToggle').textContent = open ? 'Hide sidebar' : 'Show sidebar';
  document.dispatchEvent(new CustomEvent('sidebar-change',{detail:open}));
  if (open) { const messages = $('messages'); messages.scrollTop = messages.scrollHeight; $('closeChatDrawer').focus({preventScroll: true}); }
  else $('chatDrawerToggle').focus({preventScroll: true});
}
$('chatDrawerToggle').addEventListener('click', () => setDrawer(!document.body.classList.contains('chat-open')));
$('closeChatDrawer').addEventListener('click', () => setDrawer(false));
drawer.addEventListener('keydown', event => { if (event.key === 'Escape') setDrawer(false); });
const initiallyOpen = matchMedia('(min-width:651px)').matches;
document.body.classList.toggle('chat-open', initiallyOpen);
$('chatDrawerToggle').setAttribute('aria-expanded', String(initiallyOpen));
$('chatDrawerToggle').textContent = initiallyOpen ? 'Hide sidebar' : 'Show sidebar';
document.body.classList.toggle('chat-collapsed', !initiallyOpen);
$('cameraCorner').addEventListener('change', () => $('cameraTile').dataset.corner = $('cameraCorner').value);
loadResort();
