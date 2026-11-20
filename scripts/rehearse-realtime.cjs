const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const browser=await chromium.launch(); const page=await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
   window.fixtureContexts=[];const NativeAudio=window.AudioContext;window.AudioContext=class extends NativeAudio{constructor(...args){super(...args);window.fixtureContexts.push(this);}};const Peer=window.RTCPeerConnection;window.RTCPeerConnection=class extends Peer {constructor(...args){super(...args);window.fixturePeer=this;window.fixtureStates=[];for(const type of ['iceconnectionstatechange','connectionstatechange','icegatheringstatechange'])this.addEventListener(type,()=>window.fixtureStates.push({type,ice:this.iceConnectionState,connection:this.connectionState,gathering:this.iceGatheringState}));}createDataChannel(...args){const dc=super.createDataChannel(...args);window.fixtureEvents=[];dc.addEventListener('message',e=>{const v=JSON.parse(e.data);window.fixtureEvents.push({type:v.type,error:v.error,status:v.response?.status,details:v.response?.status_details,transcript:v.transcript,delta:v.type.includes('transcript')?v.delta:undefined});});return dc;}};
   navigator.mediaDevices.getUserMedia=async()=>{window.fixtureContext=new AudioContext();await window.fixtureContext.resume();window.fixtureDestination=window.fixtureContext.createMediaStreamDestination();window.fixtureSilence=window.fixtureContext.createConstantSource();window.fixtureSilence.offset.value=0.000001;window.fixtureSilence.connect(window.fixtureDestination);window.fixtureSilence.start();return window.fixtureDestination.stream;};
   window.playQuestion=async()=>{const buffer=await window.fixtureContext.decodeAudioData(await (await fetch('/fixture-question.wav')).arrayBuffer());const source=window.fixtureContext.createBufferSource();source.buffer=buffer;source.connect(window.fixtureDestination);source.start();await new Promise(resolve=>source.onended=resolve);};
 });
 let index=0;const count=Number(process.env.REHEARSAL_COUNT||1); const answers=[];
 await page.route('**/fixture-question.wav',r=>r.fulfill({contentType:'audio/wav',body:fs.readFileSync(`${process.env.REHEARSAL_FIXTURE_DIR||'artifacts/voice-rehearsal'}/question-${index}.wav`)}));
 if(process.env.REHEARSAL_GUIDE) await page.addInitScript(guide=>sessionStorage.setItem('gator',guide),process.env.REHEARSAL_GUIDE);
 await page.goto(process.env.REHEARSAL_BASE_URL||'http://127.0.0.1:8011');await page.click('#continueGator');await page.fill('#messageInput','Preserve this typed draft');await page.click('#liveTalk');
 try {
 await page.waitForFunction(()=>document.querySelector('#gatorStage').dataset.state==='listening',{}, {timeout:45000});
 for(index=0;index<count;index++){
   await page.evaluate(()=>window.playQuestion());
   let completed=false;for(let poll=0;poll<60;poll++){const r=await page.evaluate(async()=> (await import('/call.js')).latencyReport());if(r.turns[index]?.streamCompleted && r.turns[index]?.playbackStart){completed=true;break;}await page.waitForTimeout(500);}if(!completed)throw Error('No completed spoken reply');
   await page.waitForFunction(()=>document.querySelector('#gatorStage').dataset.state==='listening',{}, {timeout:60000});
   await page.waitForFunction(n=>document.querySelectorAll('.message.user').length>=n,index+1,{timeout:15000});
   answers.push(await page.locator('#callAnswer').textContent());console.log(`Answered ${index+1}/${count}`);
 }
 const report=await page.evaluate(async()=>({...((await import('/call.js')).latencyReport()),draft:document.querySelector('#messageInput').value,userMessages:document.querySelectorAll('.message.user').length}));
 report.guide=process.env.REHEARSAL_GUIDE||'desk';report.answers=answers;report.pageErrors=errors;report.qualification='Live WebRTC provider; generated audio input; detected browser output energy, not external acoustic measurement';
 fs.writeFileSync(process.env.REHEARSAL_REPORT||(process.env.REHEARSAL_BARGE_IN==='1'?'artifacts/realtime-interruption-warmup.json':'artifacts/realtime-latency.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 if(report.turns.some(t=>!t.playbackCompleted || t.interruptedAt))throw Error('A reply did not finish playback');
 if(report.answered!==count || report.userMessages!==count || report.draft!=='Preserve this typed draft')throw Error('Realtime contract failed');
 if(process.env.REHEARSAL_BARGE_IN==='1') {
   await page.check('#voiceInterrupt');
   index=0;await page.evaluate(()=>window.playQuestion());
   await page.waitForFunction(()=>document.querySelector('#gatorStage').dataset.state==='speaking',{}, {timeout:15000});
   index=1;await page.evaluate(()=>window.playQuestion());
   let result;for(let poll=0;poll<60;poll++) {
     result=await page.evaluate(async()=>({...((await import('/call.js')).latencyReport()),answer:document.querySelector('#callAnswer').textContent,cleared:window.fixtureEvents.some(e=>e.type==='output_audio_buffer.cleared'),state:document.querySelector('#gatorStage').dataset.state}));
     if(result.turns.length>=count+2 && result.turns.at(-1).playbackStart && result.turns.at(-1).streamCompleted && result.state==='listening')break;
     await page.waitForTimeout(500);
   }
   fs.writeFileSync('artifacts/realtime-barge-in.json',JSON.stringify(result,null,2));
   if(!result.cleared || !/east terrace/i.test(result.answer))throw Error('Live interruption did not produce the grounded follow-up');
   console.log('Live interruption passed');
 }
 await page.click('#liveTalk'); if(await page.locator('#gatorStage').getAttribute('data-state')!=='idle')throw Error('End call failed');
 if(!await page.evaluate(()=>window.fixtureDestination.stream.getTracks().every(t=>t.readyState==='ended')))throw Error('Microphone track left active');
 } catch(e){const partial=await page.evaluate(async()=> (await import('/call.js')).latencyReport());fs.writeFileSync('artifacts/realtime-failed-run.json',JSON.stringify({index,answers,...partial},null,2));console.error('Call status:',await page.locator('#callStatus').textContent());console.error(await page.evaluate(()=>({ice:window.fixturePeer?.iceConnectionState,connection:window.fixturePeer?.connectionState,states:window.fixtureStates,events:window.fixtureEvents.filter(e=>e.error||e.transcript||e.type==='response.done'),context:window.fixtureContext?.state,contexts:window.fixtureContexts.map(c=>c.state)})));throw e;} finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
