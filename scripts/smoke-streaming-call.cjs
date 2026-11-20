const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];
 try {page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const Native=window.AudioContext;
  window.AudioContext=class extends Native{
   createScriptProcessor(){const p={connect(){},disconnect(){}};window.fixtureProcessor=p;return p;}
   createMediaStreamSource(){return {connect(){},disconnect(){}};}
  };
  window.fixtureMicContexts=[];window.fixtureMicStreams=[];navigator.mediaDevices.getUserMedia=async()=>{const c=new Native();window.fixtureMicContexts.push(c);await c.resume();const stream=c.createMediaStreamDestination().stream;window.fixtureMicStreams.push(stream);return stream;};
 });
 await page.route('**/fixture-question.wav',r=>r.fulfill({contentType:'audio/wav',body:fs.readFileSync('artifacts/voice-rehearsal/question-0.wav')}));
 await page.goto(process.env.REHEARSAL_BASE_URL||'http://127.0.0.1:8011');await page.click('#continueGator');await page.fill('#messageInput','Preserve this typed draft');await page.click('#liveTalk');
 await page.waitForFunction(()=>document.querySelector('#gatorStage').dataset.state==='listening',{}, {timeout:45000});
 await page.evaluate(async()=>{
  const c=new AudioContext({sampleRate:16000});const data=await c.decodeAudioData(await (await fetch('/fixture-question.wav')).arrayBuffer());const values=data.getChannelData(0);await c.close();
  for(let i=0;i<values.length;i+=2048){const part=new Float32Array(2048);part.set(values.subarray(i,i+2048));window.fixtureProcessor.onaudioprocess({inputBuffer:{getChannelData:()=>part}});await new Promise(r=>setTimeout(r,128));}
  for(let i=0;i<8;i++){window.fixtureProcessor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(2048)}});await new Promise(r=>setTimeout(r,128));}
 });
 let completed=false;
 for(let i=0;i<120;i++) { const r=await page.evaluate(async()=> (await import('/call.js')).latencyReport()); if(r.turns.some(t=>t.streamCompleted)){completed=true;break;} if(r.turns.some(t=>t.status==='failed')) throw new Error('Live turn failed'); await page.waitForTimeout(1000); }
 if(!completed) throw new Error('Live turn timed out');
 await page.waitForFunction(()=>document.querySelector('#gatorStage').dataset.state==='listening',{}, {timeout:45000});
 const report=await page.evaluate(async()=>({...(await import('/call.js')).latencyReport(),draft:document.querySelector('#messageInput').value,userMessages:document.querySelectorAll('.message.user').length,answer:document.querySelector('#callAnswer').textContent}));
 report.qualification='Real provider stream and browser audio; synthetic input fixture, not physical microphone/speaker qualification';report.pageErrors=errors;
 if(report.answered !== 1 || report.userMessages !== 1 || report.draft !== 'Preserve this typed draft') throw new Error('Live call contract failed');
 fs.writeFileSync('artifacts/live-streaming-call.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 await page.click('#liveTalk');
 if(!await page.evaluate(()=>window.fixtureMicStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))))throw Error('Microphone left active');
 } catch(error) {console.error('Call status:',await page.locator('#callStatus').textContent());console.error('Browser errors:',errors);throw error;} finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
