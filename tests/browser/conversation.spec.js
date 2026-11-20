import {test,expect} from '@playwright/test';
import {setupRealtime} from './realtime-fixture.js';

const sid = '9ff17dd2-8706-45b0-8fb7-068514004cbd';
async function setup(page) {
 await page.route('**/api/conversations', r=>r.fulfill({json:{session_id:sid,revision:0,context:[]}}));
 await setupRealtime(page);
 await page.route('**/api/realtime?*', r=>r.fulfill({contentType:'application/sdp',body:'v=0',headers:{'X-Conversation-ID':sid,'X-Voice-Token':'voice-fixture'}}));
 await page.click('#liveTalk');await page.click('#liveTalk');
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');
}
async function question(page) {
 await page.evaluate(()=>window.inputLevel=.1);await page.waitForTimeout(250);await page.evaluate(()=>window.inputLevel=0);
 await expect.poll(()=>page.evaluate(()=>window.sent.filter(e=>e.type==='response.create').length)).toBeGreaterThan(0);
}

test('voice transcript sync finishes before the next typed message in the same session',async({page})=>{
 const errors=[]; page.on('pageerror',error=>errors.push(error.message));
 await setup(page);let synced = false, textSession;
 await page.route('**/api/conversations/*/voice-turn',async r=>{await new Promise(resolve=>setTimeout(resolve,180));synced=true;await r.fulfill({json:{session_id:sid,revision:1}});});
 await page.route('**/api/chat',async r=>{expect(synced).toBe(true);textSession=r.request().postDataJSON().session_id;await r.fulfill({json:{session_id:sid,reply:'Weekend pool hours.',mode:'mock',demo:false,sources:[],suggestions:[]}});});
 await question(page);
 await page.evaluate(()=>{window.emitVoice({type:'input_audio_buffer.committed',item_id:'guest-1'});window.emitVoice({type:'conversation.item.input_audio_transcription.completed',item_id:'guest-1',transcript:'Lagoon Pool hours'});});
 await page.click('#liveTalk');await page.fill('#messageInput','What about on weekends?');await page.click('#sendBtn');
 await expect(page.locator('.bubble').last()).toContainText('Weekend pool hours');expect(textSession).toBe(sid);
 await page.click('#resetBtn');await expect.poll(()=>page.evaluate(async()=>(await import('/conversation.js')).conversationId())).toBeNull();expect(errors).toEqual([]);
});

test('completed function calls execute once and add cited evidence to spoken replies',async({page})=>{
 await setup(page);let requests=0;
 await page.route('**/api/conversations/*/tools',async r=>{requests++;expect(r.request().headers().authorization).toBe('Bearer voice-fixture');await r.fulfill({json:{ok:true,result:{sources:[{id:'palm-grill',topic:'Palm Grill',status:'demo_only'}],actions:[]}}});});
 await question(page);
 await page.evaluate(()=>{window.emitVoice({type:'response.created',response:{id:'tools'}});const response={id:'tools',status:'completed',output:[{type:'function_call',call_id:'lookup-1',name:'lookup_resort',arguments:JSON.stringify({query:'Palm Grill hours'})}]};window.emitVoice({type:'response.done',response});window.emitVoice({type:'response.done',response});});
 await expect.poll(()=>page.evaluate(()=>window.sent.filter(e=>e.type==='conversation.item.create').length)).toBe(1);
 expect(requests).toBe(1);
 await page.evaluate(()=>{window.emitVoice({type:'response.created',response:{id:'answer'}});window.emitVoice({type:'response.output_audio_transcript.done',response_id:'answer',transcript:'Palm Grill closes at 9 PM.'});});
 await expect(page.locator('.voice-evidence .source-note')).toContainText('Palm Grill');
 await page.click('#liveTalk');
});

test('interrupting a pending lookup suppresses its delayed result and audio continuation',async({page})=>{
 await setup(page);let release;
 await page.route('**/api/conversations/*/tools',async r=>{await new Promise(resolve=>{release=resolve;});await r.fulfill({json:{ok:true,result:{sources:[]}}}).catch(()=>{});});
 await question(page);
 await page.evaluate(()=>{window.emitVoice({type:'response.created',response:{id:'tools'}});window.emitVoice({type:'response.done',response:{id:'tools',status:'completed',output:[{type:'function_call',call_id:'slow-1',name:'lookup_resort',arguments:'{"query":"pool hours"}'}]}});});
 await expect.poll(()=>typeof release).toBe('function');await page.click('#interruptReply');release();
 await page.waitForTimeout(250);
 expect(await page.evaluate(()=>window.sent.some(e=>e.type==='conversation.item.create'))).toBe(false);
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');
 const states=await page.evaluate(async()=>(await import('/conversation-state.js')).conversationStateReport());
 expect(states.some(s=>s.to==='interrupted')).toBe(true);
 await page.click('#liveTalk');
});


test('typing while microphone permission is pending cancels capture before it can start',async({page})=>{
 await page.addInitScript(()=>{
   window.AudioContext=class{resume(){return Promise.resolve();}close(){return Promise.resolve();}};
   navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{window.grantMicrophone=()=>{
     window.lateTrack={readyState:'live',stop(){this.readyState='ended';}};
     resolve({getTracks:()=>[window.lateTrack],getAudioTracks:()=>[window.lateTrack]});
   };});
 });
 await page.route('**/api/health',r=>r.fulfill({json:{mode:'mock',demo:false,speech_enabled:true,realtime_enabled:false}}));
 await page.route('**/api/chat',r=>r.fulfill({json:{session_id:sid,reply:'Pool information.',mode:'mock',demo:false,sources:[],suggestions:[]}}));
 await page.goto('/');await page.click('#continueGator');await page.locator('#conversationOptions').evaluate(el=>el.open=true);await page.uncheck('#speakReplies');
 await page.click('#liveTalk');await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','connecting');
 await expect.poll(()=>page.evaluate(()=>typeof window.grantMicrophone)).toBe('function');
 await page.fill('#messageInput','Pool hours');await page.click('#sendBtn');
 await expect(page.locator('.bubble').last()).toContainText('Pool information');
 await page.evaluate(()=>window.grantMicrophone());
 await expect.poll(()=>page.evaluate(()=>window.lateTrack.readyState)).toBe('ended');
 await expect(page.locator('#liveTalk')).toHaveText('Start call');
});


test('new conversation aborts queued voice sync and does not delay the next typed question',async({page})=>{
 await page.route('**/api/health',r=>r.fulfill({json:{mode:'mock',demo:false,speech_enabled:false}}));
 let syncStarted=false;
 await page.route('**/api/conversations/*/voice-turn',async r=>{syncStarted=true;await new Promise(resolve=>setTimeout(resolve,1500));await r.fulfill({json:{revision:1}}).catch(()=>{});});
 await page.route('**/api/chat',async r=>{expect(r.request().postDataJSON().session_id).toBeNull();await r.fulfill({json:{session_id:sid,reply:'New conversation response.',mode:'mock',demo:false,sources:[],suggestions:[]}});});
 await page.goto('/');await page.click('#continueGator');
 await page.evaluate(async()=>{const m=await import('/conversation.js');m.adoptConversation('9ff17dd2-8706-45b0-8fb7-068514004cbd','token');m.rememberVoiceTurn('pending','Pool hours');});
 await expect.poll(()=>syncStarted).toBe(true);
 await page.click('#resetBtn');
 await page.fill('#messageInput','Pool hours');await page.click('#sendBtn');
 await expect(page.locator('.bubble').last()).toContainText('New conversation response');
 await expect(page.locator('#chatStatus')).not.toContainText('waiting to sync');
});
