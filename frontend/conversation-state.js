/** Finite conversation states shared by every audio transport and the avatar. */
const states = new Set(['idle','connecting','listening','thinking','speaking','interrupted','muted','error']);
const stage = document.getElementById('gatorStage');
const art = document.getElementById('guideArt');
const transitions = [];
const allowed = {
  idle: ['connecting','listening','thinking','speaking','muted','error'],
  connecting: ['idle','listening','muted','error','interrupted'],
  listening: ['idle','connecting','thinking','speaking','muted','error','interrupted'],
  thinking: ['idle','connecting','speaking','listening','muted','error','interrupted'],
  speaking: ['idle','connecting','thinking','listening','muted','error','interrupted'],
  interrupted: ['idle','connecting','listening','thinking','muted','error'],
  muted: ['idle','connecting','listening','thinking','speaking','interrupted','error'],
  error: ['idle','connecting','listening','thinking','muted'],
};
export function setConversationState(next, label) {
  if (!states.has(next)) throw new TypeError('Unknown conversation state');
  const previous = stage.dataset.state || 'idle';
  if (previous !== next && !allowed[previous]?.includes(next)) return false;
  stage.dataset.state = next;
  document.getElementById('gatorState').textContent = label || next;
  art.classList.toggle('talking', next === 'speaking');
  if (next !== 'speaking') art.classList.remove('mouth-open');
  if (previous !== next) {
    transitions.push({from:previous,to:next,at:performance.now()});
    if (transitions.length > 100) transitions.shift();
    document.dispatchEvent(new CustomEvent('conversation-state',{detail:{previous,state:next}}));
  }
}
export const conversationStateReport = () => transitions.map(row=>({...row}));
