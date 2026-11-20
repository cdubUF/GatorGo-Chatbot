import {expect} from '@playwright/test';
export async function setupRealtime(page, fromWelcome=false) {
 await page.addInitScript(()=>{
  window.testTracks=[];window.inputLevel=0;window.outputLevel=0;window.sent=[];let analyserCount=0;
  class Context {constructor(){this.baseLatency=0;this.outputLatency=0;}resume(){return Promise.resolve();}close(){return Promise.resolve();}createAnalyser(){const input=analyserCount++%2===0;return {fftSize:512,connect(){},disconnect(){},getFloatTimeDomainData(a){a.fill(input?window.inputLevel:window.outputLevel);}};}createGain(){return {gain:{value:1},connect(){},disconnect(){}};}createMediaStreamSource(){return {connect(){},disconnect(){}};}}
  Context.prototype.createScriptProcessor=function(){return {connect(){},disconnect(){}};};
  window.AudioContext=Context;
  navigator.mediaDevices.getUserMedia=async()=>{const track={readyState:'live',stop(){this.readyState='ended';}};window.testTracks.push(track);return {getTracks:()=>[track],getAudioTracks:()=>[track]};};
  window.RTCPeerConnection=class{constructor(){window.testPeer=this;}addTrack(){}createDataChannel(){this.channel={readyState:'open',send(v){window.sent.push(JSON.parse(v));},close(){}};return this.channel;}createOffer(){return Promise.resolve({sdp:'v=0\r\n'});}setLocalDescription(){return Promise.resolve();}setRemoteDescription(){queueMicrotask(()=>this.channel.onopen());return Promise.resolve();}close(){this.closed=true;}};
  window.emitVoice=event=>window.testPeer.channel.onmessage({data:JSON.stringify(event)});
 });
 await page.route('**/api/health',r=>r.fulfill({json:{mode:'openai',demo:false,speech_enabled:true,realtime_enabled:true,languages:{en:'English'}}}));
 await page.route('**/api/realtime?*',r=>r.fulfill({contentType:'application/sdp',body:'v=0\r\n'}));
 await page.goto('/');if(fromWelcome){await page.click('#welcomeTalk');}else{await page.click('#continueGator');await page.fill('#messageInput','Keep this draft');await page.click('#liveTalk');}
 await expect(page.locator('#gatorStage')).toHaveAttribute('data-state','listening');
}
