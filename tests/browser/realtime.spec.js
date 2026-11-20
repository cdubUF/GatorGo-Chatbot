import {test,expect} from '@playwright/test';
import {setupRealtime as setup} from './realtime-fixture.js';

test('voice starts without the separate conversation creation route', async({page})=>{
 let creates=0;
 await page.route('**/api/conversations',r=>{creates++;return r.fulfill({status:405,json:{detail:'Method Not Allowed'}});});
 await setup(page);
 expect(creates).toBe(0);
 expect(await page.evaluate(()=>window.testTracks.length)).toBe(1);
 await page.click('#liveTalk');
});

test('server failure offers a call retry without blaming the microphone', async({page})=>{
 await setup(page);await page.click('#liveTalk');
 await page.route('**/api/realtime?*',r=>r.fulfill({status:503,json:{detail:'Unavailable'}}));
 await page.click('#liveTalk');
 await expect(page.locator('#callStatus')).toContainText('HTTP 503');
 await expect(page.locator('#reconnectMic')).toHaveText('Retry call');
 expect(await page.evaluate(()=>window.testTracks.every(t=>t.readyState==='ended'))).toBe(true);
 await page.route('**/api/realtime?*',r=>r.fulfill({contentType:'application/sdp',body:'v=0\r\n'}));
 await page.click('#reconnectMic');
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');
 await page.click('#liveTalk');
});

test('unavailable WebRTC audio switches to streamed voice and releases both microphones', async({page})=>{
 await setup(page);await page.click('#liveTalk');
 await page.evaluate(()=>{window.RTCPeerConnection.prototype.setRemoteDescription=function(){queueMicrotask(()=>this.channel.onerror());return Promise.resolve();};});
 await page.click('#liveTalk');
 await expect(page.locator('#callStatus')).toContainText('Connected using streamed voice');
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');
 expect(await page.evaluate(()=>window.testTracks.map(t=>t.readyState))).toEqual(['ended','ended','live']);
 await page.click('#liveTalk');
 expect(await page.evaluate(()=>window.testTracks.every(t=>t.readyState==='ended'))).toBe(true);
});

test('failed ICE setup falls back without waiting for microphone reconnection', async({page})=>{
 await setup(page);await page.click('#liveTalk');
 await page.evaluate(()=>{window.RTCPeerConnection.prototype.setRemoteDescription=function(){queueMicrotask(()=>{this.connectionState='failed';this.onconnectionstatechange();});return Promise.resolve();};});
 await page.click('#liveTalk');
 await expect(page.locator('#callStatus')).toContainText('Connected using streamed voice');
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');
 await page.click('#liveTalk');
 expect(await page.evaluate(()=>window.testTracks.every(t=>t.readyState==='ended'))).toBe(true);
});

test('denied microphone permission explains how to allow access', async({page})=>{
 await setup(page);await page.click('#liveTalk');
 await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Permission denied','NotAllowedError');};});
 await page.click('#liveTalk');
 await expect(page.locator('#callStatus')).toContainText('browser site settings');
 await expect(page.locator('#reconnectMic')).toHaveText('Retry microphone');
});

test('realtime connection preserves draft and releases all tracks on end',async({page})=>{
 await setup(page);await page.click('#liveTalk');await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','idle');
 expect(await page.evaluate(()=>window.testTracks.every(t=>t.readyState==='ended')&&window.testPeer.closed)).toBe(true);
 await expect(page.locator('#messageInput')).toHaveValue('Keep this draft');await expect(page.locator('.message.user')).toHaveCount(0);
});

test('realtime keeps a brief mid-question pause in one turn',async({page})=>{
 await setup(page);
 await page.evaluate(()=>window.inputLevel=.1);await page.waitForTimeout(250);
 await page.evaluate(()=>window.inputLevel=0);await page.waitForTimeout(350);
 expect(await page.evaluate(()=>window.sent.filter(e=>e.type==='input_audio_buffer.commit').length)).toBe(0);
 await page.evaluate(()=>window.inputLevel=.1);await page.waitForTimeout(250);
 await page.evaluate(()=>window.inputLevel=0);
 await expect.poll(()=>page.evaluate(()=>window.sent.filter(e=>e.type==='input_audio_buffer.commit').length)).toBe(1);
 expect(await page.evaluate(()=>window.sent.filter(e=>e.type==='input_audio_buffer.clear').length)).toBe(1);
 await page.click('#liveTalk');
});
test('realtime pause commits once, measures real output and interrupts playback',async({page})=>{
 await setup(page);await page.locator('#conversationOptions').evaluate(el=>el.open=true);await page.check('#voiceInterrupt');await page.evaluate(()=>window.inputLevel=.1);await page.waitForTimeout(250);await page.evaluate(()=>window.inputLevel=0);
 await expect.poll(()=>page.evaluate(()=>window.sent.filter(e=>e.type==='input_audio_buffer.commit').length)).toBe(1);
 await page.evaluate(()=>{window.emitVoice({type:'response.created'});window.emitVoice({type:'output_audio_buffer.started'});window.outputLevel=.1;});
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','speaking');
 const report=await page.evaluate(async()=> (await import('/call.js')).latencyReport());expect(report.answered).toBe(1);expect(report.turns[0].playbackStart).toBeGreaterThan(report.turns[0].endOfSpeech);
 await page.evaluate(()=>window.inputLevel=.1);await expect.poll(()=>page.evaluate(()=>window.sent.some(e=>e.type==='response.cancel'))).toBe(true);
 expect(await page.evaluate(()=>window.sent.some(e=>e.type==='output_audio_buffer.clear'))).toBe(true);
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');await expect(page.locator('#messageInput')).toHaveValue('Keep this draft');
 await page.click('#liveTalk');expect(await page.evaluate(()=>window.testTracks.every(t=>t.readyState==='ended'))).toBe(true);
});

test('short noise and response completion do not cut off playback; sidebar preserves call',async({page})=>{
 await setup(page);await page.evaluate(()=>window.inputLevel=.1);await page.waitForTimeout(250);await page.evaluate(()=>window.inputLevel=0);
 await expect.poll(()=>page.evaluate(()=>window.sent.some(e=>e.type==='input_audio_buffer.commit'))).toBe(true);
 await page.evaluate(()=>{window.emitVoice({type:'response.created'});window.emitVoice({type:'output_audio_buffer.started'});window.outputLevel=.1;});
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','speaking');
 await page.evaluate(()=>window.inputLevel=.02);await page.waitForTimeout(300);
 await page.evaluate(()=>window.inputLevel=.1);await page.waitForTimeout(100);await page.evaluate(()=>{window.inputLevel=0;window.emitVoice({type:'response.done',response:{status:'completed'}});});
 await page.waitForTimeout(300);
 expect(await page.evaluate(()=>window.sent.some(e=>e.type==='response.cancel'||e.type==='output_audio_buffer.clear'))).toBe(false);
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','speaking');
 await page.click('#closeChatDrawer');await expect(page.locator('.chat-panel')).toBeHidden();
 await expect(page.locator('#liveTalk')).toHaveText('End call');
 await page.click('#chatDrawerToggle');await expect(page.locator('.chat-panel')).toBeVisible();await expect(page.locator('#messageInput')).toHaveValue('Keep this draft');
 await page.evaluate(()=>{window.testPeer.connectionState='disconnected';window.testPeer.onconnectionstatechange();});await page.waitForTimeout(300);
 await page.evaluate(()=>{window.testPeer.connectionState='connected';window.testPeer.onconnectionstatechange();});
 await expect(page.locator('#liveTalk')).toHaveText('End call');
 await page.click('#liveTalk');
});


test('disabling voice interruption protects playback from sustained speaker echo',async({page})=>{
 await setup(page);await page.locator('#voiceInterrupt').evaluate(el=>el.checked=false);await page.evaluate(()=>window.inputLevel=.1);await page.waitForTimeout(250);await page.evaluate(()=>window.inputLevel=0);
 await expect.poll(()=>page.evaluate(()=>window.sent.some(e=>e.type==='response.create'))).toBe(true);
 await page.evaluate(()=>{window.emitVoice({type:'response.created'});window.emitVoice({type:'output_audio_buffer.started'});window.outputLevel=.1;window.inputLevel=.2;});
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','speaking');
 await page.waitForTimeout(900);
 await page.evaluate(()=>{window.emitVoice({type:'response.done',response:{status:'completed'}});window.emitVoice({type:'output_audio_buffer.stopped'});});
 await page.waitForTimeout(500);
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','speaking');
 expect(await page.evaluate(()=>window.sent.some(e=>e.type==='response.cancel'||e.type==='output_audio_buffer.clear'))).toBe(false);
 await page.evaluate(()=>{window.inputLevel=0;window.outputLevel=0;});
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');
 const r=await page.evaluate(async()=> (await import('/call.js')).latencyReport());
 expect(r.turns[0].playbackCompleted).toBeGreaterThan(r.turns[0].providerPlaybackStopped);
 expect(r.turns[0].interruptedAt).toBeUndefined();
 await page.click('#liveTalk');
});

test('explicit interruption stops the reply without ending the call',async({page})=>{
 await setup(page);await page.evaluate(()=>{window.emitVoice({type:'response.created'});window.emitVoice({type:'output_audio_buffer.started'});window.outputLevel=.1;});
 await page.click('#interruptReply');
 expect(await page.evaluate(()=>window.sent.some(e=>e.type==='response.cancel')&&window.sent.some(e=>e.type==='output_audio_buffer.clear'))).toBe(true);
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');
 await expect(page.locator('#liveTalk')).toHaveText('End call');
 await page.click('#liveTalk');
});


test('welcome starts a call and mute controls the same microphone session',async({page})=>{
 await setup(page,true);await expect(page.locator('#liveTalk')).toHaveText('End call');
 await page.click('#muteMic');await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','muted');expect(await page.evaluate(()=>window.testTracks[0].enabled)).toBe(false);
 await page.evaluate(()=>window.inputLevel=.2);await page.waitForTimeout(600);expect(await page.evaluate(()=>window.sent.some(e=>e.type==='response.create'))).toBe(false);
 await page.evaluate(()=>window.inputLevel=0);await page.click('#muteMic');expect(await page.evaluate(()=>window.testTracks[0].enabled)).toBe(true);await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');await page.click('#liveTalk');expect(await page.evaluate(()=>window.testTracks.every(t=>t.readyState==='ended'))).toBe(true);
});

test('provider transcript events produce one entry per speaker without resending draft',async({page})=>{
 await setup(page);await page.evaluate(()=>window.inputLevel=.1);await page.waitForTimeout(250);await page.evaluate(()=>window.inputLevel=0);await expect.poll(()=>page.evaluate(()=>window.sent.some(e=>e.type==='response.create'))).toBe(true);
 await page.evaluate(()=>{window.emitVoice({type:'input_audio_buffer.committed',item_id:'guest-1'});window.emitVoice({type:'response.created',response:{id:'answer-1'}});window.emitVoice({type:'response.output_audio_transcript.done',response_id:'answer-1',transcript:'Palm Grill is beside the lagoon.'});for(let i=0;i<2;i++)window.emitVoice({type:'conversation.item.input_audio_transcription.completed',item_id:'guest-1',transcript:'Where is Palm Grill?'});});
 await expect(page.locator('.message.user')).toHaveCount(1);await expect(page.locator('.message[data-voice-turn]')).toHaveCount(2);await expect(page.locator('#messageInput')).toHaveValue('Keep this draft');await page.click('#liveTalk');
});


test('default voice interruption yields and ignores cancelled response events', async({page})=>{
 await setup(page);
 await expect(page.locator('#voiceInterrupt')).toBeChecked();
 await page.evaluate(()=>window.inputLevel=.1);await page.waitForTimeout(250);await page.evaluate(()=>window.inputLevel=0);
 await expect.poll(()=>page.evaluate(()=>window.sent.filter(e=>e.type==='response.create').length)).toBe(1);
 await page.evaluate(()=>{window.emitVoice({type:'response.created',response:{id:'old'}});window.emitVoice({type:'output_audio_buffer.started',response_id:'old'});window.outputLevel=.1;});
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','speaking');
 await page.evaluate(()=>window.inputLevel=.1);
 await expect.poll(()=>page.evaluate(()=>window.sent.some(e=>e.type==='response.cancel'))).toBe(true);
 await page.evaluate(()=>{window.inputLevel=0;window.outputLevel=0;});
 await expect.poll(()=>page.evaluate(()=>window.sent.filter(e=>e.type==='response.create').length)).toBe(2);
 await page.evaluate(()=>{window.emitVoice({type:'response.created',response:{id:'new'}});window.emitVoice({type:'output_audio_buffer.started',response_id:'new'});window.outputLevel=.1;});
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','speaking');
 await page.evaluate(()=>{window.emitVoice({type:'response.output_audio_transcript.done',response_id:'old',transcript:'Abandoned story'});window.emitVoice({type:'response.done',response:{id:'old',status:'cancelled'}});window.emitVoice({type:'output_audio_buffer.cleared',response_id:'old'});});
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','speaking');
 await expect(page.locator('.message.agent')).not.toContainText(['Abandoned story']);
 await expect(page.locator('#liveTalk')).toHaveText('End call');
 await page.click('#liveTalk');
});


test('interrupting before response creation does not revive cancelled audio', async({page})=>{
 await setup(page);
 await page.evaluate(()=>window.inputLevel=.1);await page.waitForTimeout(250);await page.evaluate(()=>window.inputLevel=0);
 await expect.poll(()=>page.evaluate(()=>window.sent.filter(e=>e.type==='response.create').length)).toBe(1);
 await page.click('#interruptReply');
 await page.evaluate(()=>{window.emitVoice({type:'response.created',response:{id:'late'}});window.emitVoice({type:'output_audio_buffer.started',response_id:'late'});window.emitVoice({type:'response.output_audio_transcript.delta',response_id:'late',delta:'Unheard reply'});window.outputLevel=.1;});
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');
 await expect(page.locator('#callAnswer')).toBeHidden();
 await expect(page.locator('#liveTalk')).toHaveText('End call');
 await page.click('#liveTalk');
});


test('bounded timing history does not reuse voice turn IDs after one hundred turns',async({page})=>{
 await setup(page);
 await page.evaluate(()=>{for(let i=0;i<105;i++)window.emitVoice({type:'input_audio_buffer.speech_stopped'});});
 const report=await page.evaluate(async()=>(await import('/realtime.js')).realtimeReport());
 expect(report.turns).toHaveLength(100);
 expect(new Set(report.turns.map(row=>row.voiceId)).size).toBe(100);
 expect(report.turns.at(-1).turn).toBe(105);
 await page.click('#liveTalk');
});
