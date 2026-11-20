import {startCall, endCall, setCallMuted} from './call.js';
import {openMap, loadResort} from './resort.js';
const $=id=>document.getElementById(id);
let theme='palm-house', mode='light', muted=false;
const system=matchMedia('(prefers-color-scheme:dark)');
try {const saved=JSON.parse(localStorage.getItem('gatorgo-appearance')||'{}');if(['lagoon','palm-house','coastal-deco'].includes(saved.theme))theme=saved.theme;if(['light','dark','system'].includes(saved.mode))mode=saved.mode;}catch{}
function appearance(){
 document.body.dataset.theme=theme;document.body.dataset.colorMode=mode==='system'?(system.matches?'dark':'light'):mode;
 document.querySelectorAll('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===theme)));
 document.querySelectorAll('[data-mode-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.modeChoice===mode)));
 try{localStorage.setItem('gatorgo-appearance',JSON.stringify({theme,mode}));}catch{}
}
system.addEventListener('change',appearance);
document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>{theme=b.dataset.themeChoice;appearance();}));
document.querySelectorAll('[data-mode-choice]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.modeChoice;appearance();}));
const settings=()=>{if(!$('appearanceDialog').open)$('appearanceDialog').showModal();};
$('settingsOpen').addEventListener('click',settings);$('closeAppearance').addEventListener('click',()=>$('appearanceDialog').close());
$('contactOpen').addEventListener('click',()=>$('contactDialog').showModal());$('closeContact').addEventListener('click',()=>$('contactDialog').close());
function enter(){if(!$('gatorPicker').hidden)$('continueGator').click();}
function ask(question){enter();if(matchMedia('(max-width:650px)').matches&&!document.body.classList.contains('chat-open'))$('chatDrawerToggle').click();document.dispatchEvent(new CustomEvent('guest-question',{detail:question}));}
$('prepareHandoff').addEventListener('click',()=>{$('contactDialog').close();ask('I want to speak to a manager');});
$('conciergeNav').addEventListener('click',()=>{enter();if(document.body.classList.contains('chat-collapsed')||!document.body.classList.contains('chat-open'))$('chatDrawerToggle').click();$('messageInput').focus();});
const welcomeNav=document.createElement('nav');welcomeNav.className='welcome-nav';welcomeNav.setAttribute('aria-label','Welcome navigation');
for(const [label,fn] of [['Concierge',enter],['Resort map',async()=>{await loadResort();openMap();}],['Settings',settings],['Contact front desk',()=>$('contactDialog').showModal()]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);welcomeNav.append(b);}
$('gatorPicker').append(welcomeNav);
$('welcomeQuestion').addEventListener('submit',event=>{event.preventDefault();const q=$('welcomeInput').value.trim();if(q){$('welcomeInput').value='';ask(q);}});
const starters=document.createElement('div');starters.className='welcome-starters';
for(const [label,q] of [['Pool hours','What are Lagoon Pool hours today?'],['Dining','Tell me about Palm Grill'],['Getting around','How do I get around the resort?']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>ask(q));starters.append(b);}
$('welcomeQuestion').after(starters);
const talk=document.createElement('button');talk.id='welcomeTalk';talk.className='primary-button';talk.type='button';talk.textContent='Talk to Gator';talk.addEventListener('click',async()=>{enter();await startCall();});$('continueGator').before(talk);
$('continueGator').textContent='Open chat';
$('muteMic').addEventListener('click',()=>{muted=!muted;setCallMuted(muted);$('muteMic').setAttribute('aria-pressed',String(muted));$('muteMic').textContent=muted?'Unmute mic':'Mute mic';});
document.addEventListener('call-active',e=>{muted=false;$('muteMic').hidden=!e.detail;$('muteMic').textContent='Mute mic';$('muteMic').setAttribute('aria-pressed','false');document.body.classList.toggle('in-call',e.detail);});
new MutationObserver(()=>{document.body.dataset.voiceState=$('gatorStage').dataset.state;}).observe($('gatorStage'),{attributes:true,attributeFilter:['data-state']});
const mapSettings=document.createElement('button');mapSettings.className='outline-button';mapSettings.type='button';mapSettings.textContent='Settings';mapSettings.addEventListener('click',settings);$('closeResort').before(mapSettings);
appearance();
