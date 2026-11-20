import {test, expect} from '@playwright/test';
import fs from 'node:fs';
const venues = JSON.parse(fs.readFileSync('knowledge/venues.json', 'utf8'));
const events = JSON.parse(fs.readFileSync('knowledge/events.json', 'utf8'));
const sid = 'b1193ac0-b20c-4813-8804-21a0327ae9e4';
const reply = {session_id: sid, reply_id: 'c1193ac0-b20c-4813-8804-21a0327ae9e4', mode:'ai',demo:false,reply:'Palm Grill is located beside the lagoon, on the east terrace.',reply_locale:'en',sources:[{id:'palm-grill',topic:'Palm Grill',status:'demo_only'}, {id:'blue-heron',topic:'Blue Heron Cafe',status:'demo_only'}],suggestions:['Where is it?'],actions:[{type:'map',venue_id:'palm-grill'}]};
async function setup(page, width=1440, height=900) {
  await page.setViewportSize({width,height});
  await page.route('**/api/health', r=>r.fulfill({json:{mode:'openai',demo:false,sample_knowledge:true,speech_enabled:true,languages:{en:'English'},reservation_testing:false}}));
  await page.route('**/api/knowledge',r=>r.fulfill({json:venues}));
  await page.route('**/api/activities',r=>r.fulfill({json:{events,today:'2026-11-18',timezone:'America/New_York'}}));
  await page.route('**/api/chat',r=>r.fulfill({json:reply}));
  await page.route('**/api/voice',r=>r.fulfill({status:503,json:{detail:'fixture'}}));
  await page.goto('/'); await page.click('#continueGator');
}

test('venue search, source deep links, maps and session plans',async({page})=>{
  await setup(page);await page.locator('#conversationOptions').evaluate(el=>el.open=true);await page.locator('#speakReplies').uncheck();
  await page.fill('#messageInput','Palm Grill');await page.press('#messageInput','Enter');
  const links=page.locator('.source-note a');await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAttribute('href','knowledge.html#record-palm-grill');await expect(links.nth(1)).toHaveAttribute('href','knowledge.html#record-blue-heron');
  await page.getByRole('button',{name:'Show on map',exact:true}).click();
  await expect(page.locator('.map-pin[data-venue="palm-grill"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.map-description')).toContainText('east terrace');
  await page.click('#closeResort');await expect(page.locator('.message.user')).toHaveCount(1);
  await page.click('#calendarOpen');await expect(page.locator('.event-card')).toHaveCount(2);
  await page.locator('.event-card').first().getByRole('button',{name:'Save activity'}).click();
  await page.click('#closeResort');await page.click('#plansOpen');await expect(page.locator('.event-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Remove from plans'}).click();await expect(page.locator('.empty-state')).toContainText('No saved');
  await page.getByRole('button',{name:'Browse activities'}).click();await page.fill('#calendarDate','2026-11-21');await expect(page.locator('.empty-state')).toContainText('No activities');
  await page.click('#closeResort');await page.goto('/knowledge.html#record-palm-grill');await expect(page.locator('#record-palm-grill')).toBeFocused();
  await page.fill('#knowledgeSearch','Sunset Lounge');await expect(page.locator('.knowledge-entry')).toHaveCount(1);await expect(page.locator('.knowledge-entry')).toContainText('Hours unconfirmed');
});

test('mobile drawer preserves latest reply, draft, rotation and focus',async({page})=>{
  await setup(page,390,844);await expect(page.locator('#chatDrawer')).toBeHidden();
  await page.click('#chatDrawerToggle');await expect(page.locator('#closeChatDrawer')).toBeFocused();
  await page.fill('#messageInput','Palm Grill');await page.press('#messageInput','Enter');await expect(page.locator('.bubble').last()).toContainText('east terrace');
  await page.fill('#messageInput','Keep this draft');await page.setViewportSize({width:844,height:390});await expect(page.locator('#messageInput')).toHaveValue('Keep this draft');
  await page.setViewportSize({width:390,height:844});await page.click('#closeChatDrawer');await expect(page.locator('#chatDrawerToggle')).toBeFocused();await expect(page.locator('#liveTalk')).toBeVisible();
  await page.click('#chatDrawerToggle');await expect(page.locator('.bubble').last()).toBeInViewport();await expect(page.locator('#messageInput')).toHaveValue('Keep this draft');
});

test('guide personalities and scene preserve transcript; reviewed handoff copy succeeds only after clipboard',async({page})=>{
  await setup(page);const first=await page.locator('.bubble').first().textContent();
  await page.click('#changeGator');await page.click('[data-gator=pool]');await page.click('#continueGator');await expect(page.locator('.bubble').first()).not.toHaveText(first);await expect(page.locator('.gator-panel')).toHaveAttribute('data-scene','pool');
  await page.locator('#conversationOptions').evaluate(el=>el.open=true);await page.locator('#speakReplies').uncheck();await page.fill('#messageInput','hello');await page.press('#messageInput','Enter');await expect(page.locator('.bubble').last()).toContainText('east terrace');const count=await page.locator('.bubble').count();
  await page.click('#changeGator');await page.click('[data-gator=trail]');await page.click('#continueGator');await expect(page.locator('.bubble')).toHaveCount(count);
  await page.route('**/api/chat',r=>r.fulfill({json:{...reply,handoff:{id:sid,urgency:'routine',summary:'Guest requests a conversation with a human employee or manager.',next_step:'Contact the desk directly.'}}}));
  await page.fill('#messageInput','I want a manager');await page.press('#messageInput','Enter');
  await expect(page.getByRole('button',{name:'Copy summary',exact:true})).toBeDisabled();await page.getByText('I reviewed this summary').click();
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Denied');}}}));
  await page.getByRole('button',{name:'Copy summary',exact:true}).click();await expect(page.getByText('Copy failed.',{exact:false})).toBeVisible();await expect(page.getByText('Summary copied.',{exact:false})).toHaveCount(0);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}}));
  await page.getByRole('button',{name:'Copy summary',exact:true}).click();await expect(page.getByText('Summary copied.',{exact:false})).toBeVisible();expect(await page.evaluate(()=>window.copied)).toBe('Guest requests a conversation with a human employee or manager.');
});

async function fakeAudio(page) {
  await page.addInitScript(()=>{
    window.processors=[];window.sources=[];window.streams=[];
    let clock=0;
    class Context {
      state='running';sampleRate=16000;destination={};get currentTime(){return clock;}
      resume(){return Promise.resolve();}close(){return Promise.resolve();}
      createMediaStreamSource(){return {connect(){},disconnect(){}};}
      createScriptProcessor(){const p={connect(){},disconnect(){}};window.processors.push(p);return p;}
      createAnalyser(){return {fftSize:256,connect(){},disconnect(){},getByteTimeDomainData(a){a.fill(180);}};}
      createBuffer(channels,length,rate){return {duration:length/rate,getChannelData:()=>new Float32Array(length)};}
      createBufferSource(){const s={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};window.sources.push(s);return s;}
    }
    window.AudioContext=Context;
    navigator.mediaDevices.getUserMedia=async()=>{const t={readyState:'live',stop(){this.readyState='ended';}};const s={getTracks:()=>[t],getAudioTracks:()=>[t]};window.streams.push(s);return s;};
    window.speakFixture=()=>{const p=window.processors.at(-1);for(const level of [.1,.1,0,0,0,0,0,0])p.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(2048).fill(level)}});};
  });
}

test('streamed call keeps draft and chat untouched, interrupts, reconnects, and records ten timing turns',async({page})=>{
  await fakeAudio(page);await setup(page);await page.fill('#messageInput','A draft I have not sent');
  const pcm=Buffer.alloc(4800);for(let i=0;i<pcm.length;i+=2)pcm.writeInt16LE(4000,i);
  await page.route('**/api/call?*',r=>r.fulfill({contentType:'application/x-ndjson',body:[{type:'reply',reply},{type:'audio',pcm:pcm.toString('base64'),rate:24000},{type:'done'}].map(x=>JSON.stringify(x)).join('\n')+'\n'}));
  await page.click('#liveTalk');await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');
  for(let i=0;i<10;i++){
    await page.evaluate(()=>window.speakFixture());await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','speaking');
  }
  await expect(page.locator('#messageInput')).toHaveValue('A draft I have not sent');await expect(page.locator('.message.user')).toHaveCount(0);
  expect(await page.evaluate(()=>window.sources.slice(0,-1).every(s=>s.stopped))).toBe(true);
  await expect(page.locator('#stageCaptions')).toBeVisible();
  const report=await page.evaluate(async()=> (await import('/call.js')).latencyReport());expect(report.answered).toBe(10);expect(report.turns.every(t=>t.firstAudioBeforeDone)).toBe(true);
  fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/ten-turn-timing-fixture.json',JSON.stringify({qualification:'SIMULATED devices/network; not human demo latency',...report},null,2));
  await page.evaluate(()=>window.streams[0].getTracks()[0].onended());await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','idle');await expect(page.locator('#stageCaptions')).toBeHidden();await expect(page.locator('#reconnectMic')).toBeVisible();
  await page.click('#reconnectMic');await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');
  await page.click('#liveTalk');expect(await page.evaluate(()=>window.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
});

test('feedback submits only IDs and a reason once',async({page})=>{
  await setup(page);let submitted=[];await page.route('**/api/feedback',r=>{submitted.push(r.request().postDataJSON());return r.fulfill({json:{recorded:true}});});
  await page.fill('#messageInput','Palm Grill');await page.press('#messageInput','Enter');await page.getByText('Something not right?').click();await page.getByRole('button',{name:'Outdated hours',exact:true}).click();
  await expect(page.getByRole('button',{name:'Wrong venue',exact:true})).toBeDisabled();expect(submitted).toEqual([{session_id:sid,reply_id:reply.reply_id,reason:'outdated_hours'}]);
});

test('captions advance on playback clock, hide on stop and restart',async({page})=>{
  await setup(page);
  await page.evaluate(async()=>{const c=await import('/captions.js');c.captionStart('One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen');c.captionAt(0,8);});
  await expect(page.locator('#stageCaptions')).toContainText('One two');
  await page.evaluate(async()=>{const c=await import('/captions.js');c.captionAt(5,8);});await expect(page.locator('#stageCaptions')).toContainText('nine ten');
  await page.locator('#conversationOptions').evaluate(el=>el.open=true);await page.locator('#captionsToggle').uncheck();await expect(page.locator('#stageCaptions')).toBeHidden();await page.locator('#captionsToggle').check();await expect(page.locator('#stageCaptions')).toBeVisible();
  await page.evaluate(async()=>{const c=await import('/captions.js');c.captionStop();});await expect(page.locator('#stageCaptions')).toBeHidden();
  await page.evaluate(async()=>{const c=await import('/captions.js');c.captionStart('One two three four five six seven eight nine ten');});await expect(page.locator('#stageCaptions')).toContainText('One two');
});

test('camera corner choices preserve the same live preview stream',async({browser})=>{
  const context=await browser.newContext({permissions:['camera'],viewport:{width:390,height:844}});const page=await context.newPage();
  await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;window.previewStream=canvas.captureStream(5);return window.previewStream;};});
  await setup(page,390,844);await page.locator('#conversationOptions').evaluate(el=>el.open=true);await page.click('#cameraToggle');await expect(page.locator('#cameraTile')).toBeVisible();
  for(const corner of ['top-left','top-right','bottom-left','bottom-right']){await page.selectOption('#cameraCorner',corner);await expect(page.locator('#cameraTile')).toHaveAttribute('data-corner',corner);expect(await page.evaluate(()=>document.querySelector('#selfPreview').srcObject===window.previewStream)).toBe(true);await expect(page.locator('#liveTalk')).toBeInViewport();}
  await page.locator('#conversationOptions').evaluate(el=>el.open=true);await page.click('#cameraToggle');expect(await page.evaluate(()=>window.previewStream.getTracks().every(t=>t.readyState==='ended'))).toBe(true);await context.close();
});

test('exhausted allowance disables paid voice and keeps text usable', async ({page}) => {
  await setup(page);
  await page.route('**/api/health', r => r.fulfill({json: {mode:'faq_fallback',demo:false,sample_knowledge:true,speech_enabled:false,languages:{en:'English'},service_notice:'AI allowance reached. Sourced English text answers remain available. AI voice is paused.'}}));
  await page.reload(); await page.click('#continueGator');
  await expect(page.locator('#liveTalk')).toBeDisabled();
  await expect(page.locator('#recordStart')).toBeDisabled();
  await expect(page.locator('#speakReplies')).toBeDisabled();
  await expect(page.locator('#callStatus')).toContainText('allowance reached');
  await page.fill('#messageInput', 'Palm Grill'); await page.press('#messageInput','Enter');
  await expect(page.locator('.bubble').last()).toContainText('east terrace');
});

test('failed voice turn releases microphone and preserves failure timing', async ({page}) => {
  await fakeAudio(page); await setup(page);
  await page.route('**/api/call?*', r => r.fulfill({contentType:'application/x-ndjson',body:JSON.stringify({type:'error',message:'Speech service unavailable. Please use chat.'})+'\n'}));
  await page.click('#liveTalk'); await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');
  await page.evaluate(()=>window.speakFixture());
  await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','idle');
  await expect(page.locator('#callStatus')).toContainText('Speech service unavailable');
  expect(await page.evaluate(()=>window.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
  const report=await page.evaluate(async()=> (await import('/call.js')).latencyReport());
  expect(report.unanswered).toBe(1); expect(report.turns[0].status).toBe('failed');
});
