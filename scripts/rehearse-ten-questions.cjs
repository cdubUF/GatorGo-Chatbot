const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:900}});
 const questions=JSON.parse(fs.readFileSync('artifacts/voice-rehearsal/questions.json','utf8').replace(/^\uFEFF/,'')); const answers=[]; let questionIndex=0; const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const Native=window.AudioContext;
  window.AudioContext=class extends Native{
   createScriptProcessor(){const p={connect(){},disconnect(){}};window.fixtureProcessor=p;return p;}
   createMediaStreamSource(){return {connect(){},disconnect(){}};}
  };
  navigator.mediaDevices.getUserMedia=async()=>({getTracks:()=>[],getAudioTracks:()=>[]});
 });
 await page.route('**/fixture-question.wav',r=>r.fulfill({contentType:'audio/wav',body:fs.readFileSync(`artifacts/voice-rehearsal/question-${questionIndex}.wav`)}));
 await page.goto('http://127.0.0.1:8011');await page.click('#continueGator');await page.fill('#messageInput','Preserve this typed draft');await page.click('#liveTalk');
 await page.waitForFunction(()=>document.querySelector('#gatorStage').dataset.state==='listening');
 for(questionIndex=0;questionIndex<questions.length;questionIndex++){
 await page.evaluate(async()=>{
  const c=new AudioContext({sampleRate:16000});const data=await c.decodeAudioData(await (await fetch('/fixture-question.wav')).arrayBuffer());const values=data.getChannelData(0);await c.close();
  for(let i=0;i<values.length;i+=2048){const part=new Float32Array(2048);part.set(values.subarray(i,i+2048));window.fixtureProcessor.onaudioprocess({inputBuffer:{getChannelData:()=>part}});await new Promise(r=>setTimeout(r,128));}
  for(let i=0;i<8;i++){window.fixtureProcessor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(2048)}});await new Promise(r=>setTimeout(r,128));}
 });
 let completed=false;
 for(let i=0;i<120;i++) { const r=await page.evaluate(async()=> (await import('/call.js')).latencyReport()); if(r.turns[questionIndex]?.streamCompleted){completed=true;break;} if(r.turns[questionIndex]?.status==='failed') throw new Error('Live turn failed'); await page.waitForTimeout(1000); }
 if(!completed) throw new Error('Live turn timed out');
 answers.push({question:questions[questionIndex],answer:await page.locator('#callAnswer').textContent()});
 console.log(`Answered ${questionIndex+1}/10`);
 await page.waitForFunction(()=>document.querySelector('#gatorStage').dataset.state==='listening',{},{timeout:60000});
 }
 const report=await page.evaluate(async()=>({...(await import('/call.js')).latencyReport(),draft:document.querySelector('#messageInput').value,userMessages:document.querySelectorAll('.message.user').length,answer:document.querySelector('#callAnswer').textContent}));
 report.qualification='Real provider stream and browser audio; synthetic input fixture, not physical microphone/speaker qualification';report.pageErrors=errors; report.questionsAndAnswers=answers;
 if(report.answered !== 10 || report.userMessages !== 0 || report.draft !== 'Preserve this typed draft') throw new Error('Live call contract failed');
 if(!answers[7].answer.includes('north garden gate') || !answers[8].answer.includes('6:00 PM')) throw new Error('Spoken venue follow-up grounding failed');
 fs.writeFileSync('artifacts/ten-turn-live-provider.json',JSON.stringify(report,null,2));console.log(JSON.stringify({answered:report.answered,unanswered:report.unanswered,medianMs:report.medianMs,slowestMs:report.slowestMs}));
 await page.click('#liveTalk');
 if(await page.locator('#gatorStage').getAttribute('data-state') !== 'idle') throw new Error('Call did not return to idle');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
