import {endCall} from './call.js';
import {setDrawer} from './resort.js';
const $=id=>document.getElementById(id);
const scene=document.querySelector('.gator-panel');
const toolbar=document.createElement('div');toolbar.className='scene-toolbar';toolbar.setAttribute('aria-label','View controls');
function control(id,label,action){const b=document.createElement('button');b.id=id;b.type='button';b.className='view-button';b.textContent=label;b.addEventListener('click',action);toolbar.append(b);return b;}
// Move the existing toggle, retaining its listener and state.
toolbar.append($('chatDrawerToggle'));
const sidebarButton=document.createElement('button');sidebarButton.id='sidebarToggle';sidebarButton.type='button';sidebarButton.className='sidebar-toggle';sidebarButton.setAttribute('aria-controls','chatDrawer');
function sidebarLabel(open){sidebarButton.textContent=open?'Hide sidebar':'Show sidebar';sidebarButton.setAttribute('aria-expanded',String(open));}
sidebarLabel(document.body.classList.contains('chat-open'));
sidebarButton.addEventListener('click',()=>{setDrawer(!document.body.classList.contains('chat-open'));sidebarButton.focus({preventScroll:true});});
document.addEventListener('sidebar-change',event=>sidebarLabel(event.detail));
document.querySelector('.top-title').append(sidebarButton);
$('closeChatDrawer').textContent='Hide sidebar';

let focused=false,previousChat=true;
function focusView(on){
 if(on&&!focused)previousChat=document.body.classList.contains('chat-open');
 focused=on;document.body.classList.toggle('focus-view',on);
 setDrawer(on?false:previousChat);
 $('focusView').textContent=on?'Exit focus':'Focus view';$('focusView').setAttribute('aria-pressed',String(on));
 $('focusView').focus({preventScroll:true});
}
control('focusView','Focus view',()=>focusView(!focused)).setAttribute('aria-pressed','false');
control('fullscreenView','Full screen',async()=>{
 try{if(document.fullscreenElement){await document.exitFullscreen();}else{if(!focused)focusView(true);await document.documentElement.requestFullscreen();}}
 catch{showNotice('Full screen is unavailable here. Focus view is still available.');}
});
document.addEventListener('fullscreenchange',()=>{$('fullscreenView').textContent=document.fullscreenElement?'Exit full screen':'Full screen';});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&focused&&!document.fullscreenElement&&!document.querySelector('dialog[open]'))focusView(false);});
let popout;
control('popoutView','Pop out',()=>{
 if(popout&&!popout.closed){popout.focus();return;}
 const url=new URL(location.href);url.searchParams.set('view','popout');
 popout=window.open(url.href,'gatorgo-concierge','popup,width=1080,height=820,resizable=yes,scrollbars=yes');
 if(popout){endCall();showNotice('Gator opened in a separate window. Start a call there when ready.');popout.focus();}
 else showNotice('Your browser blocked the window. Allow pop-ups for this site and try again.');
});
scene.prepend(toolbar);
const notice=document.createElement('div');notice.id='viewNotice';notice.hidden=true;scene.append(notice);
const noticeText=document.createElement('span');noticeText.setAttribute('role','status');noticeText.setAttribute('aria-live','polite');
const dismissNotice=document.createElement('button');dismissNotice.type='button';dismissNotice.className='notice-dismiss';dismissNotice.textContent='Dismiss';dismissNotice.setAttribute('aria-label','Dismiss notification');
notice.append(noticeText,dismissNotice);
let noticeTimer;
function clearNotice(){clearTimeout(noticeTimer);notice.hidden=true;noticeText.textContent='';}
function showNotice(message){clearTimeout(noticeTimer);noticeText.textContent=message;notice.hidden=false;noticeTimer=setTimeout(clearNotice,5000);}
dismissNotice.addEventListener('click',()=>{clearNotice();$('focusView').focus({preventScroll:true});});
document.addEventListener('call-active',event=>{if(event.detail)clearNotice();});
const options=document.createElement('details');options.id='conversationOptions';options.className='conversation-options';
const summary=document.createElement('summary');summary.textContent='Voice & camera';options.append(summary);
const panel=document.createElement('div');panel.className='options-panel';options.append(panel);
for(const el of [document.querySelector('.playback-controls'),$('cameraToggle'),document.querySelector('.camera-placement'),$('cameraStatus'),document.querySelector('.call-details')])panel.append(el);
document.querySelector('.voice-dock').append(options);
// A pop-out is an independent session. Never auto-enable its microphone.
if(new URLSearchParams(location.search).get('view')==='popout'){
 $('continueGator').click();focusView(true);$('popoutView').hidden=true;
 showNotice('Your private concierge window. Start a call when ready.');
}
