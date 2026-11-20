import {setConversationState} from './conversation-state.js';
import {captionStart, captionAt, captionStop} from './captions.js';
const $ = id => document.getElementById(id);
const guides = {desk: 'Front Desk Gator', pool: 'Poolside Gator', trail: 'Trail Guide Gator'};
let selected = 'trail', thinking = false, speaking = false, spokenGeneration = 0;
let cameraStream, cameraGeneration = 0, recordingGeneration = 0, recording = null, upload;
let lastReply = '', lastLocale = 'en';
document.addEventListener('call-reply', event => { lastReply = event.detail.reply; lastLocale = event.detail.reply_locale || 'en'; });
try { selected = sessionStorage.getItem('gator') || 'trail'; } catch { /* Storage is optional. */ }
if (!guides[selected]) selected = 'desk';
export const avatarPath = () => selected;
export const guideProfile = () => ({
  desk: {greeting: "Welcome! Let's get you settled in. Ask me about arrival, dining, or your stay.", questions: ['What time is check-in?', 'Tell me about Palm Grill', 'What amenities do you have?']},
  pool: {greeting: "Hello, sunshine! Ready for a little poolside relaxation?", questions: ['What are Lagoon Pool hours today?', 'Where is Lagoon Pool?', 'Tell me about Blue Heron Cafe']},
  trail: {greeting: "Adventure starts here. Let's explore the resort together.", questions: ['Where is Nature Walk?', 'What are Nature Walk hours?', 'Tell me about Garden Discovery Walk']}
})[selected];
export const replyLocale = () => $('replyLocale').value;
const note = text => { $('mediaStatus').textContent = text; };
let callActive = false;
document.addEventListener('call-active', event => { callActive = event.detail; });
function pose() {
  if (callActive) return;
  const state = thinking ? 'thinking' : speaking ? 'speaking' : 'idle';
  setConversationState(state, {thinking: 'Thinking?', speaking: 'Speaking', idle: 'Ready to help'}[state]);
}
export function setThinking(value) { thinking = value; pose(); }
export function conversationFailed() { endConversation(); }
function choose(key) {
  selected = key;
  document.querySelector('.gator-panel').dataset.scene = key;
  $('guideWelcome').textContent = guideProfile().greeting;
  document.dispatchEvent(new CustomEvent('guide-changed', {detail: key}));
  try { sessionStorage.setItem('gator', key); } catch { /* Storage is optional. */ }
  document.querySelectorAll('[data-gator]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.gator === key)));
  for (const id of ['pickerPreview', 'guideArt']) $(id).dataset.character = selected;
  $('selectionName').textContent = $('guideName').textContent = guides[key];
  document.querySelector('.agent-detail strong').textContent = guides[key];
  document.querySelectorAll('.avatar .mascot-sprite, .mini-avatar').forEach(img => { img.dataset.character = selected; });
}
let voiceContext, voiceSource, voiceFetch, mouthFrame, pendingAudio;
async function unlockAudio() {
  voiceContext ||= new AudioContext();
  await voiceContext.resume();
}
export function stopPlayback() {
  captionStop();
  spokenGeneration += 1;
  voiceFetch?.abort(); voiceFetch = null;
  if (voiceSource) { voiceSource.onended = null; try { voiceSource.stop(); } catch { /* Already ended. */ } voiceSource.disconnect(); }
  voiceSource = null; pendingAudio = null;
  cancelAnimationFrame(mouthFrame);
  $('resumeVoice').hidden = true;
  $('guideArt').classList.remove('mouth-open');
  speaking = false; pose();
}
async function playBuffer(buffer, generation) {
  await unlockAudio();
  if (generation !== spokenGeneration) return;
  if (voiceContext.state !== 'running') {
    pendingAudio = {buffer, generation}; $('resumeVoice').hidden = false;
    note('Tap Play reply to enable audio.'); return;
  }
  const source = voiceContext.createBufferSource(), analyser = voiceContext.createAnalyser();
  analyser.fftSize = 256; source.buffer = buffer;
  source.connect(analyser); analyser.connect(voiceContext.destination); voiceSource = source;
  const samples = new Uint8Array(analyser.fftSize);
  const playbackStarted = voiceContext.currentTime;
  captionStart(lastReply);
  const animate = () => {
    if (generation !== spokenGeneration) return;
    captionAt(voiceContext.currentTime - playbackStarted, buffer.duration);
    analyser.getByteTimeDomainData(samples);
    const energy = Math.sqrt(samples.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / samples.length);
    $('guideArt').classList.toggle('mouth-open', energy > 0.025);
    mouthFrame = requestAnimationFrame(animate);
  };
  source.onended = () => {
    if (generation !== spokenGeneration) return;
    captionStop(); cancelAnimationFrame(mouthFrame); source.disconnect(); analyser.disconnect(); voiceSource = null;
    speaking = false; $('guideArt').classList.remove('mouth-open'); pose();
    note('Your turn. Tap Talk to gator to record another question, or Start call for hands-free conversation.');
  };
  speaking = true; pose(); source.start(); animate(); note('');
}
export async function speakReply(text, locale = 'en') {
  lastReply = text; lastLocale = locale; stopPlayback();
  if (!$('speakReplies').checked || $('conciergeScreen').hidden) return;
  const generation = spokenGeneration;
  voiceFetch = new AbortController(); note('Preparing AI voice...');
  try {
    const response = await fetch('/api/voice', {method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text, guide: selected}), signal: AbortSignal.any([voiceFetch.signal, AbortSignal.timeout(60000)])});
    if (!response.ok) throw new Error('Voice unavailable');
    voiceContext ||= new AudioContext();
    const buffer = await voiceContext.decodeAudioData(await response.arrayBuffer());
    if (generation !== spokenGeneration) return;
    voiceFetch = null;
    await playBuffer(buffer, generation);
  } catch {
    if (generation === spokenGeneration) { speaking = false; pose(); note('AI voice unavailable. Your answer is in chat. Try Replay reply.'); endConversation(); }
  }
}
function endConversation() {
  if (callActive) return;
  $('liveTalk').setAttribute('aria-pressed', 'false'); $('liveTalk').textContent = 'Start call';
}
function recordButtons(state) {
  $('recordStart').hidden = state !== 'idle';
  $('recordStop').hidden = state !== 'recording';
  $('recordCancel').hidden = state === 'idle';
}
function releaseRecording() {
  if (!recording) return;
  clearTimeout(recording.timer);
  recording.stream.getTracks().forEach(track => track.stop());
  recording.processor?.disconnect(); recording.source?.disconnect();
  recording.context?.close().catch(() => {});
}
export function cancelRecording() {
  recordingGeneration += 1;
  upload?.abort(); upload = null;
  releaseRecording(); recording = null; recordButtons('idle');
}
function wav(chunks, size, rate) {
  const buffer = new ArrayBuffer(44 + size * 2), view = new DataView(buffer);
  const str = (offset, text) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  str(0, 'RIFF'); view.setUint32(4, 36 + size * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, size * 2, true);
  let index = 44;
  for (const chunk of chunks) for (const value of chunk) {
    view.setInt16(index, Math.max(-1, Math.min(1, value)) * (value < 0 ? 32768 : 32767), true); index += 2;
  }
  return new Blob([buffer], {type: 'audio/wav'});
}
async function stopRecording() {
  if (!recording) return;
  const generation = recordingGeneration, current = recording;
  releaseRecording(); recording = null; recordButtons('uploading');
  note('Transcribing… You can review and edit before sending.');
  upload = new AbortController();
  try {
    const blob = wav(current.chunks, current.size, current.context.sampleRate);
    current.chunks = [];
    if (blob.size <= 44) { endConversation(); pose(); note('No speech detected. Tap Talk to gator to try again.'); return; }
    if (blob.size > 4 * 1024 * 1024) throw new Error('Invalid recording');
    const response = await fetch(`/api/speech?locale=${encodeURIComponent(replyLocale())}`, {
      method: 'POST', headers: {'Content-Type': 'audio/wav'}, body: blob,
      signal: AbortSignal.any([upload.signal, AbortSignal.timeout(60000)])});
    if (!response.ok) throw new Error('Transcription failed');
    const result = await response.json();
    if (generation !== recordingGeneration) return;
    $('messageInput').value = result.text;
    $('messageInput').dispatchEvent(new Event('input'));
    $('messageInput').focus();
    note('Transcript ready. Review or correct it, then press Send.');
    if ($('autoSend').checked) {
      upload = null; recordButtons('idle');
      $('chatForm').requestSubmit();
    }
  } catch {
    if (generation === recordingGeneration) { note('Transcription unavailable. Please try again or type your question.'); endConversation(); }
  } finally {
    current.chunks = [];
    if (generation === recordingGeneration) { upload = null; recordButtons('idle'); }
  }
}
async function startRecording() {
  stopPlayback(); cancelRecording();
  const generation = recordingGeneration;
  recordButtons('requesting'); note('Allow microphone access to record up to 30 seconds.');
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Unsupported');
    const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: false});
    if (generation !== recordingGeneration) { stream.getTracks().forEach(t => t.stop()); return; }
    recording = {stream, chunks: [], size: 0, heardSpeech: false, quietSamples: 0};
    const context = new AudioContext({sampleRate: 16000}); recording.context = context;
    await context.resume();
    if (generation !== recordingGeneration) return;
    const source = context.createMediaStreamSource(stream), processor = context.createScriptProcessor(4096, 1, 1);
    Object.assign(recording, {source, processor});
    processor.onaudioprocess = event => {
      if (!recording || generation !== recordingGeneration) return;
      const samples = event.inputBuffer.getChannelData(0);
      const available = context.sampleRate * 30 - recording.size;
      const chunk = samples.slice(0, Math.max(0, available));
      recording.chunks.push(chunk); recording.size += chunk.length;
      const rms = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
      if (rms > 0.018) { recording.heardSpeech = true; recording.quietSamples = 0; }
      else recording.quietSamples += samples.length;
      if (recording.size >= context.sampleRate * 30) stopRecording();
    };
    source.connect(processor); processor.connect(context.destination);
    stream.getAudioTracks().forEach(track => track.onended = () => {
      if (generation === recordingGeneration && recording) { cancelRecording(); note('Microphone disconnected. Typed chat is still available.'); }
    });
    recording.timer = setTimeout(stopRecording, 30000);
    $('gatorStage').dataset.state = 'listening'; $('gatorState').textContent = 'Listening to you';
    recordButtons('recording'); note('Recording… Stop when finished, or Cancel to discard. Maximum 30 seconds.');
  } catch {
    if (generation === recordingGeneration) { endConversation(); cancelRecording(); note('Microphone unavailable or permission denied. You can still type.'); }
  }
}
function stopCamera() {
  cameraGeneration += 1;
  cameraStream?.getTracks().forEach(track => track.stop()); cameraStream = null;
  $('selfPreview').srcObject = null; $('cameraTile').hidden = true;
  $('cameraToggle').textContent = 'Turn camera on'; $('cameraToggle').setAttribute('aria-pressed', 'false');
}
async function toggleCamera() {
  if (cameraStream || $('cameraToggle').getAttribute('aria-pressed') === 'true') { stopCamera(); return; }
  const generation = ++cameraGeneration;
  $('cameraToggle').setAttribute('aria-pressed', 'true'); $('cameraToggle').textContent = 'Cancel camera';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
    if (generation !== cameraGeneration) { stream.getTracks().forEach(track => track.stop()); return; }
    cameraStream = stream; $('selfPreview').srcObject = stream; $('cameraTile').hidden = false;
    $('cameraToggle').textContent = 'Turn camera off'; $('cameraStatus').textContent = '';
    stream.getVideoTracks().forEach(track => track.onended = () => { stopCamera(); $('cameraStatus').textContent = 'Camera disconnected. You can turn it on again.'; });
  } catch {
    if (generation === cameraGeneration) { stopCamera(); $('cameraStatus').textContent = 'Camera unavailable or permission denied. You can try again; chat still works.'; }
  }
}
export function releaseMedia() { endConversation(); cancelRecording(); stopPlayback(); stopCamera(); }
export function configureMedia(config) {
  $('recordStart').disabled = config.speech_enabled !== true;
  $('liveTalk').disabled = config.speech_enabled !== true;
  $('speakReplies').checked = config.speech_enabled === true;
  $('speakReplies').disabled = config.speech_enabled !== true;
  $('replayVoice').disabled = config.speech_enabled !== true;
  if (!config.speech_enabled) {
    note(config.service_notice || 'Voice input is not configured. Typed chat is ready.');
    $('callStatus').textContent = config.service_notice || 'Voice is unavailable. Typed chat is ready.';
  }
  const selectedLocale = replyLocale();
  $('replyLocale').replaceChildren(new Option('Detect automatically', 'auto'));
  Object.entries(config.languages || {en: 'English'}).forEach(([key, name]) => $('replyLocale').add(new Option(name, key)));
  if ([...$('replyLocale').options].some(o => o.value === selectedLocale)) $('replyLocale').value = selectedLocale;
}
document.querySelectorAll('[data-gator]').forEach(button => button.addEventListener('click', () => choose(button.dataset.gator)));
$('continueGator').addEventListener('click', () => { $('gatorPicker').hidden = true; $('conciergeScreen').hidden = false; document.querySelector('.content').scrollTop = 0; $('liveTalk').focus({preventScroll: true}); });
$('changeGator').addEventListener('click', () => { releaseMedia(); $('conciergeScreen').hidden = true; $('gatorPicker').hidden = false; document.querySelector(`[data-gator=${selected}]`).focus(); });
$('recordStart').addEventListener('click', () => { unlockAudio().catch(() => {}); startRecording(); });
$('resumeVoice').addEventListener('click', () => { if (pendingAudio) { const next = pendingAudio; pendingAudio = null; $('resumeVoice').hidden = true; playBuffer(next.buffer, next.generation); } });
$('replayVoice').addEventListener('click', () => { unlockAudio().catch(() => {}); if (lastReply) speakReply(lastReply, lastLocale); });
$('recordStop').addEventListener('click', stopRecording);
$('recordCancel').addEventListener('click', () => { endConversation(); cancelRecording(); pose(); note('Recording discarded.'); });
$('cameraToggle').addEventListener('click', toggleCamera);
$('stopSpeech').addEventListener('click', () => { endConversation(); stopPlayback(); });
$('speakReplies').addEventListener('change', () => { if ($('speakReplies').checked && lastReply) speakReply(lastReply, lastLocale); else { endConversation(); stopPlayback(); } });
$('replyLocale').addEventListener('change', stopPlayback);
window.addEventListener('pagehide', releaseMedia);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseMedia(); });
choose(selected);

function greet() {
  if (thinking || speaking) return;
  const art = $('guideArt'); art.classList.remove('gator-wave'); void art.offsetWidth; art.classList.add('gator-wave');
  $('gatorState').textContent = `Hi! I'm ${guides[selected]}. What can I help with?`;
}
$('gatorStage').addEventListener('click', greet);
$('gatorStage').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); greet(); } });

function blink() {
  if (!document.hidden && !$('conciergeScreen').hidden) {
    $('guideArt').classList.add('blinking');
    setTimeout(() => $('guideArt').classList.remove('blinking'), 160);
  }
  setTimeout(blink, 2800 + Math.random() * 3500);
}
setTimeout(blink, 2400);
