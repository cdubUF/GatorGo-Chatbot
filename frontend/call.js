import {conversationId, adoptConversation, flushConversation} from './conversation.js';
import {setConversationState} from './conversation-state.js';
import {startRealtime, stopRealtime, realtimeActive, realtimeReport, setRealtimeMuted} from './realtime.js';
﻿/** Continuous local microphone capture with cancellable streamed reply playback. */
import {avatarPath, replyLocale, stopPlayback, cancelRecording} from './guest.js';
import {captionStart, captionAt, captionStop} from './captions.js';
const $ = id => document.getElementById(id);
let micMuted = false;
let active = false, connecting = false, generation = 0, turnGeneration = 0;
let stream, context, processor, input, analyser, request, frame, idleTimer;
let chunks = [], preroll = [], size = 0, voiced = 0, quiet = 0, speakingInput = false;
let replyText = '';
let sources = [], nextTime = 0, playbackStart = 0, finished = false, currentTiming, lastSpeech = 0;
const measurements = [];
function state(value, label) {
  if(micMuted && value === 'listening'){value='muted';label='Microphone muted';}
  setConversationState(value, label);
}
function clearAudio() {
  turnGeneration++; request?.abort(); request = null;
  for (const source of sources) { source.onended = null; try { source.stop(); } catch { /* Ended. */ } source.disconnect(); }
  sources = []; cancelAnimationFrame(frame); nextTime = 0; playbackStart = 0;
  $('guideArt').classList.remove('mouth-open', 'talking'); captionStop();
}
function markUnanswered(reason) {
  if (currentTiming && !currentTiming.playbackStart && currentTiming.status === 'unanswered') currentTiming.status = reason;
}
export function endCall(reason = 'Call ended. Microphone off.') {
  stopRealtime(reason);
  generation++; connecting = false; active = false; clearTimeout(idleTimer);
  markUnanswered('cancelled'); clearAudio();
  stream?.getTracks().forEach(t => t.stop()); stream = null;
  input?.disconnect(); processor?.disconnect(); analyser?.disconnect();
  context?.close().catch(() => {}); context = null;
  chunks = []; preroll = []; size = voiced = quiet = 0; speakingInput = false;
  $('liveTalk').textContent = 'Start call'; $('liveTalk').setAttribute('aria-pressed', 'false');
  $('callStatus').textContent = reason; state('idle', 'Ready to help');
  document.dispatchEvent(new CustomEvent('call-active', {detail: false}));
}
function encodeWav(parts, length, rate) {
  const bytes = new ArrayBuffer(44 + length * 2), v = new DataView(bytes);
  const string = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  string(0, 'RIFF'); v.setUint32(4, 36 + length * 2, true); string(8, 'WAVE'); string(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); string(36, 'data'); v.setUint32(40, length * 2, true);
  let offset = 44; for (const part of parts) for (const sample of part) { v.setInt16(offset, Math.max(-1, Math.min(1, sample)) * 32767, true); offset += 2; }
  return new Blob([bytes], {type: 'audio/wav'});
}
function animate(token) {
  if (!active || token !== turnGeneration) return;
  const a = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(a);
  const rms = Math.sqrt(a.reduce((n, v) => n + ((v - 128) / 128) ** 2, 0) / a.length);
  $('guideArt').classList.toggle('mouth-open', rms > .025);
  if (playbackStart) captionAt(Math.max(0, context.currentTime - playbackStart));
  frame = requestAnimationFrame(() => animate(token));
}
function playPCM(base64, token, timing) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  if (!bytes.length || bytes.length % 2) throw new Error('Invalid audio chunk');
  const view = new DataView(bytes.buffer), buffer = context.createBuffer(1, bytes.length / 2, 24000);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  const source = context.createBufferSource(); source.buffer = buffer; source.connect(analyser);
  const start = Math.max(context.currentTime + .015, nextTime);
  if (!timing.firstAudioReceived) timing.firstAudioReceived = performance.now();
  if (!playbackStart) {
    playbackStart = start;
    captionStart(replyText);
    // AudioContext scheduling and performance.now share this client's timeline.
    timing.playbackStart = performance.now() + (start - context.currentTime) * 1000;
    timing.status = 'answered'; timing.firstAudioBeforeDone = !finished;
    state('speaking', 'Speaking — you can interrupt'); animate(token);
  }
  sources.push(source); nextTime = start + buffer.duration;
  source.onended = () => {
    sources = sources.filter(s => s !== source); source.disconnect();
    if (active && token === turnGeneration && finished && !sources.length) {
      cancelAnimationFrame(frame); $('guideArt').classList.remove('mouth-open', 'talking'); captionStop();
      state('listening', 'Listening to you'); $('callStatus').textContent = 'Your turn. Speak naturally.';
    }
  };
  source.start(start);
}
async function sendTurn(blob, speechEnded) {
  clearAudio(); const token = turnGeneration; const life = generation;
  finished = false; request = new AbortController();
  const timing = {turn: measurements.length + 1, endOfSpeech: speechEnded, turnDetected: performance.now(), status: 'unanswered'};
  measurements.push(timing); if (measurements.length > 100) measurements.shift(); currentTiming = timing;
  state('thinking', 'Thinking'); $('callStatus').textContent = 'Finding your answer...';
  try {
    const query = new URLSearchParams({guide: avatarPath(), locale: replyLocale()});
    await flushConversation();
    if (!active || token !== turnGeneration || life !== generation) return;
    if (conversationId()) query.set('session_id', conversationId());
    const response = await fetch(`/api/call?${query}`, {method: 'POST', headers: {'Content-Type': 'audio/wav'}, body: blob,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(120000)])});
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(typeof problem.detail === 'string' ? problem.detail : 'Call unavailable. Please use text chat.');
    }
    if (!response.body) throw new Error('Call unavailable. Please use text chat.');
    const reader = response.body.getReader(), decoder = new TextDecoder(); let pending = '';
    while (true) {
      const {value, done} = await reader.read(); if (done) break;
      if (!active || token !== turnGeneration || life !== generation) { await reader.cancel(); return; }
      pending += decoder.decode(value, {stream: true});
      if (pending.length > 1000000) throw new Error('Stream limit');
      let end;
      while ((end = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, end); pending = pending.slice(end + 1); if (!line) continue;
        const event = JSON.parse(line);
        if (event.type === 'reply') {
          adoptConversation(event.reply.session_id); replyText = event.reply.reply;
          if(event.transcript){for(const [role,text] of [['user',event.transcript],['agent',replyText]])document.dispatchEvent(new CustomEvent('voice-message',{detail:{id:`legacy-${life}-${token}`,role,text}}));}
          $('callAnswer').textContent = event.reply.reply; $('callAnswer').hidden = false;
          document.dispatchEvent(new CustomEvent('call-reply', {detail: event.reply}));
        } else if (event.type === 'audio') playPCM(event.pcm, token, timing);
        else if (event.type === 'done') { finished = true; timing.streamCompleted = performance.now(); timing.playedBeforeStreamCompleted = !!timing.playbackStart && timing.playbackStart < timing.streamCompleted; const report = latencyReport(); $('callTiming').textContent = `${report.answered} answered; ${report.unanswered} unanswered. Median ${Math.round(report.medianMs || 0)} ms; slowest ${Math.round(report.slowestMs || 0)} ms. Output-start estimate, not a physical speaker measurement.`; }
        else if (event.type === 'error') throw new Error(event.message);
      }
    }
    request = null;
    if (!finished || !timing.playbackStart) throw new Error('Incomplete audio');
    if (!sources.length && active && token === turnGeneration) {
      cancelAnimationFrame(frame); captionStop(); state('listening', 'Listening to you');
    }
  } catch (error) {
    if (active && token === turnGeneration && life === generation) {
      markUnanswered('failed');
      endCall(error.message || 'Call unavailable. Please use text chat.');
    }
  }
}
function capture(event) {
  if (!active || micMuted) return;
  if ((sources.length || request) && !$('voiceInterrupt').checked) return;
  const sample = event.inputBuffer.getChannelData(0).slice();
  const rms = Math.sqrt(sample.reduce((sum, v) => sum + v * v, 0) / sample.length);
  const rate = context.sampleRate;
  if (rms > .025) {
    voiced += sample.length; quiet = 0; lastSpeech = performance.now();
    if (!speakingInput && voiced >= rate * .12) {
      markUnanswered('interrupted'); clearAudio(); speakingInput = true;
      chunks = preroll.slice(); size = chunks.reduce((n, p) => n + p.length, 0);
      state('listening', 'Listening to you'); $('callStatus').textContent = 'Listening. Pause when you finish.';
    }
  } else { quiet += sample.length; if (!speakingInput) voiced = 0; }
  if (speakingInput) {
    const part = sample.slice(0, Math.max(0, rate * 30 - size)); chunks.push(part); size += part.length;
    if (quiet >= rate * .65 || size >= rate * 30) {
      const blob = encodeWav(chunks, size, rate); chunks = []; size = voiced = quiet = 0; speakingInput = false; preroll = [];
      sendTurn(blob, lastSpeech);
    }
  } else { preroll.push(sample); while (preroll.length > 3) preroll.shift(); }
}
export async function startCall() {
  if (realtimeActive()) { stopRealtime(); return; }
  let streamedFallback = false;
  if (!active && !connecting) {
    try { const health = await (await fetch('/api/health')).json(); if(health.realtime_enabled) {
      if (await startRealtime() !== 'fallback') return;
      streamedFallback = true;
    } } catch { /* Existing bounded call reports connection errors. */ }
  }
  if (active || connecting) { endCall(); return; }
  stopPlayback(); cancelRecording(); micMuted=false; connecting = true; const life = ++generation;
  $('liveTalk').textContent = 'Cancel call'; $('liveTalk').setAttribute('aria-pressed', 'true');
  state('connecting', 'Connecting voice');
  $('callStatus').textContent = 'Allow microphone access to begin.'; $('reconnectMic').hidden = true;
  try {
    context = new AudioContext({sampleRate: 16000}); await context.resume();
    const media = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true}, video: false});
    if (life !== generation) { media.getTracks().forEach(t => t.stop()); return; }
    stream = media; active = true; connecting = false;
    input = context.createMediaStreamSource(stream); processor = context.createScriptProcessor(2048, 1, 1);
    input.connect(processor); processor.connect(context.destination); processor.onaudioprocess = capture;
    analyser = context.createAnalyser(); analyser.fftSize = 256; analyser.connect(context.destination);
    stream.getAudioTracks().forEach(track => track.onended = () => {
      if (active && life === generation) { endCall('Microphone disconnected. Reconnect it, then try again.'); $('reconnectMic').hidden = false; }
    });
    $('liveTalk').textContent = 'End call'; state('listening', 'Listening to you');
    $('callStatus').textContent = `${streamedFallback ? 'Connected using streamed voice. ' : ''}Ask a question, then pause. You can speak over a reply to interrupt.`;
    document.dispatchEvent(new CustomEvent('call-active', {detail: true}));
    idleTimer = setTimeout(() => endCall('Call time limit reached. Start a new call to continue.'), 10 * 60 * 1000);
  } catch {
    if (life === generation) { endCall('Microphone unavailable or permission denied. Reconnect or use chat.'); $('reconnectMic').hidden = false; }
  }
}
export function latencyReport() {
  const liveReport = realtimeReport(); if(liveReport.turns.length) return liveReport;
  const rows = measurements.map(row => ({...row,
    turnDetectionMs: row.turnDetected - row.endOfSpeech,
    responseWaitMs: row.firstAudioReceived ? row.firstAudioReceived - row.turnDetected : null,
    playbackStartupMs: row.playbackStart ? row.playbackStart - row.firstAudioReceived : null,
    endToEndMs: row.playbackStart ? row.playbackStart - row.endOfSpeech : null}));
  const delays = rows.filter(r => r.status === 'answered').map(r => r.endToEndMs).sort((a, b) => a - b);
  const mid = Math.floor(delays.length / 2);
  return {clock: 'client performance.now; scheduled AudioContext output start', physicalSpeakerLatencyMeasured: false,
    answered: delays.length, unanswered: rows.filter(r => r.status !== 'answered').length,
    medianMs: delays.length ? (delays[(delays.length - 1) >> 1] + delays[mid]) / 2 : null,
    slowestMs: delays.length ? delays.at(-1) : null, turns: rows};
}
$('liveTalk').addEventListener('click', startCall); $('reconnectMic').addEventListener('click', startCall);
for (const id of ['changeGator', 'resetBtn', 'recordStart', 'stopSpeech', 'replayVoice']) $(id).addEventListener('click', () => endCall(), {capture: true});
$('speakReplies').addEventListener('change', () => { if (!$('speakReplies').checked) endCall(); });
$('chatForm').addEventListener('submit', () => { if (active || connecting || realtimeActive()) endCall(); }, {capture: true});
document.addEventListener('visibilitychange', () => { if (document.hidden) endCall(); }); window.addEventListener('pagehide', () => endCall());
$('downloadLatency').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(latencyReport(), null, 2)], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'gatorgo-call-latency.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});

export function setCallMuted(value){
 micMuted=value;setRealtimeMuted(value);stream?.getAudioTracks().forEach(t=>t.enabled=!value);
 chunks=[];preroll=[];size=voiced=quiet=0;speakingInput=false;
 if(active&&!sources.length)state('listening','Listening to you');
}

document.addEventListener('voice-end-request',()=>endCall());
