/** Local expression direction. Guest text is inspected in memory and never retained. */
const art = document.getElementById('guideArt');
const stage = document.getElementById('gatorStage');
let responseMood = 'neutral', guestConcern = false, resetTimer;
const names = {neutral: 'relaxed', cheerful: 'cheerful', curious: 'curious', empathetic: 'concerned and attentive'};
const concern = /\b(sorry|unsafe|emergency|hurt|injured|fire|angry|upset|disappointed|frustrat\w*|dirty|broken|terrible|unhappy|complaint|cannot confirm|can.t confirm|closed|unavailable|problem|allerg\w*)\b/i;
const positive = /\b(thanks|thank you|wonderful|lovely|excited|exciting|amazing|great|perfect|celebrat\w*|birthday|anniversary|congratulations|welcome|enjoy|picture this)\b/i;
const question = /\b(which|what kind|would you|do you prefer|tell me more|explore|discover|adventure|curious)\b|\?/i;

export function moodFor(text = '') {
  if (concern.test(text)) return 'empathetic';
  if (positive.test(text)) return 'cheerful';
  if (question.test(text)) return 'curious';
  return 'neutral';
}
function show(mood) {
  art.dataset.expression = mood;
  art.setAttribute('aria-label', `Your gator guide, ${names[mood]} expression`);
}
function settle() {
  clearTimeout(resetTimer);
  if (['listening', 'thinking'].includes(stage.dataset.state)) show(guestConcern ? 'empathetic' : 'curious');
  else if (stage.dataset.state === 'error') show('empathetic');
  else if (stage.dataset.state === 'muted') show('neutral');
  else {
    show(guestConcern ? 'empathetic' : responseMood);
    if (stage.dataset.state === 'idle') resetTimer = setTimeout(() => {
      responseMood = 'neutral'; guestConcern = false; show('neutral');
    }, 8000);
  }
}
function react({role, text = '', decision} = {}) {
  const mood = moodFor(text);
  if (role === 'user') {
    guestConcern = mood === 'empathetic';
    responseMood = guestConcern ? 'empathetic' : mood;
  } else {
    responseMood = decision && decision.level !== 'ai' ? 'empathetic' : mood;
  }
  settle();
}
document.addEventListener('concierge-reaction', e => react(e.detail));
document.addEventListener('voice-message', e => react(e.detail));
document.addEventListener('call-reply', e => react({...e.detail, role: 'agent', text: e.detail.reply}));
new MutationObserver(settle).observe(stage, {attributes: true, attributeFilter: ['data-state']});
function reset() {clearTimeout(resetTimer); responseMood = 'neutral'; guestConcern = false; show('neutral');}
document.addEventListener('guide-changed', reset);
document.getElementById('resetBtn').addEventListener('click', reset);
document.addEventListener('call-active', e => {if (!e.detail) reset();});
function greet() {
  if (!['idle', 'listening'].includes(stage.dataset.state) || guestConcern) return;
  responseMood = 'cheerful'; show('cheerful');
  clearTimeout(resetTimer); resetTimer = setTimeout(settle, 2500);
}
stage.addEventListener('click', greet);
stage.addEventListener('keydown', e => {if (e.key === 'Enter' || e.key === ' ') greet();});
show('neutral');
