import {conversationId, flushConversation, adoptConversation, rememberVoiceTurn, toolCredentials} from './conversation.js';
import {setConversationState} from './conversation-state.js';
/** Persistent speech-to-speech transport. No guest transcript is written to text chat. */
import {avatarPath, replyLocale, stopPlayback, cancelRecording} from './guest.js';
import {captionStart, captionAt, captionStop} from './captions.js';
const $ = id => document.getElementById(id);
let sink, pc, channel, mic, context, input, output, outputSource, inputSource, gain, frame, timer, abort;
let micMuted = false;
let totalTurns = 0;
let generation = 0, running = false, lastSpeech = 0, current, transcript = '', startedAt = 0, outputActive = false;
// Keep enough silence to bridge short pauses inside a question.
const END_OF_TURN_SILENCE_MS = 650;
const measurements = [];
const inputTurns = new Map(), responseTurns = new Map();
const interruptedResponses = new Set();
let activeResponseId = null, awaitingCancelledResponse = false, turnEpoch = 0;
const seenToolCalls = new Set(), handledResponses = new Set();
let toolRounds = 0;
let pendingInputTurns = [];
function transcriptEvent(turn,role,text){if(turn&&text)document.dispatchEvent(new CustomEvent('voice-message',{detail:{id:turn.voiceId,role,text}}));}
let speechStart = 0, userSpeaking = false, responsePending = false, disconnectTimer, playbackTailUntil = 0, playbackStopped = false;
function send(type, payload = {}) { if(channel?.readyState === 'open') channel.send(JSON.stringify({type,...payload})); }
function interruptResponse() {
  if (responsePending && !activeResponseId) awaitingCancelledResponse = true;
  if (activeResponseId) interruptedResponses.add(activeResponseId);
  if (responsePending) send('response.cancel');
  if (outputActive || responsePending) send('output_audio_buffer.clear');
  responsePending = false;
  if (current) current.interrupted = true;
  setConversationState('interrupted', 'Reply interrupted');
  receive({type: 'input_audio_buffer.speech_started'});
  $('callAnswer').hidden = true;
}
function pose(value, label) {
  if(micMuted && value === 'listening') {value='muted';label='Microphone muted';}
  setConversationState(value, label);
}
function rms(analyser) {
  if (!analyser) return 0;
  const values = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(values);
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
}
function summary() {
  const report = realtimeReport();
  $('callTiming').textContent = `${report.answered} answered; ${report.unanswered} unanswered. Median ${Math.round(report.medianMs || 0)} ms; slowest ${Math.round(report.slowestMs || 0)} ms. Browser output estimate, not an acoustic measurement.`;
}
function monitor(life) {
  if (life !== generation || !running) return;
  const now = performance.now();
  const amplitude = rms(output);
  // Provider completion can precede playout at the device. Protect the tail too.
  if (playbackStopped && outputActive) {
    if (amplitude > .002) playbackTailUntil = now + 250;
    if (now >= playbackTailUntil) {
      outputActive = false; playbackStopped = false;
      if (current) current.playbackCompleted = now;
      captionStop(); pose('listening', 'Listening to you'); summary();
    }
  }
  const protectedReply = responsePending || outputActive || now < playbackTailUntil;
  $('interruptReply').hidden = !protectedReply;
  const acceptInput = !micMuted && (!protectedReply || $('voiceInterrupt').checked);
  if (!acceptInput) { speechStart = 0; userSpeaking = false; }
  // Reject brief clicks and residual speaker echo while the guide is talking.
  const interrupting = protectedReply && !userSpeaking;
  if (acceptInput && rms(input) > (interrupting ? .035 : .015)) {
    lastSpeech = now;
    if(!speechStart) {send('input_audio_buffer.clear');speechStart = now;}
    if(!userSpeaking && now - speechStart >= (interrupting ? 220 : 60)) {
      userSpeaking = true;
      if (protectedReply) interruptResponse();
      else receive({type:'input_audio_buffer.speech_started'});
    }
  } else if(!userSpeaking) speechStart = 0;
  if(userSpeaking && (now - lastSpeech >= END_OF_TURN_SILENCE_MS || now - speechStart >= 30000)) {
    userSpeaking = false; speechStart = 0;
    receive({type:'input_audio_buffer.speech_stopped'});
    send('input_audio_buffer.commit'); activeResponseId = null; send('response.create'); responsePending = true;
  }
  if (outputActive && amplitude > .002 && current && !current.playbackStart) {
    current.firstAudioReceived ||= now;
    current.playbackStart = now + ((context.outputLatency || 0) + (context.baseLatency || 0)) * 1000;
    current.status = 'answered'; startedAt = now;
    pose('speaking', $('voiceInterrupt').checked ? 'Speaking - you can interrupt' : 'Speaking - tap Interrupt to talk'); summary();
  }
  $('guideArt').classList.toggle('mouth-open', outputActive && amplitude > .015);
  if (outputActive && startedAt) captionAt((now - startedAt) / 1000);
  frame = requestAnimationFrame(() => monitor(life));
}
async function runTools(calls, life, turn) {
  toolRounds++;
  const exhausted = toolRounds > 4;
  const {id, token} = toolCredentials();
  let completed = false;
  for (const [index, call] of calls.entries()) {
    if (seenToolCalls.has(call.call_id)) continue;
    seenToolCalls.add(call.call_id);
    if (!running || life !== generation || turn !== turnEpoch) return;
    let result;
    try {
      if (exhausted || index >= 4) throw new Error('Tool limit reached');
      if (!id || !token) throw new Error('Missing voice authorization');
      const args = JSON.parse(call.arguments);
      const response = await fetch(`/api/conversations/${id}/tools`, {method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({call_id:call.call_id,name:call.name,arguments:args}),
        signal:AbortSignal.any([abort.signal,AbortSignal.timeout(12000)])});
      if (!response.ok) throw new Error('Lookup unavailable');
      result = await response.json();
      if (running && life === generation && turn === turnEpoch && current && result.ok) {
        document.dispatchEvent(new CustomEvent('voice-evidence', {detail:{id:current.voiceId,result:result.result}}));
      }
    } catch {
      result = {ok:false,error:'Information could not be confirmed. Suggest contacting hotel staff directly. No action was taken.'};
    }
    if (!running || life !== generation || turn !== turnEpoch) return;
    send('conversation.item.create', {item:{type:'function_call_output',call_id:call.call_id,output:JSON.stringify(result)}});
    completed = true;
  }
  if (completed && running && life === generation && turn === turnEpoch) send('response.create', (exhausted || calls.length > 4) ? {response:{tool_choice:'none'}} : {});
}
function receive(event) {
  // Cancellation events can arrive after the next turn has begun.
  const responseId = event.response_id || event.response?.id;
  if (responseId && interruptedResponses.has(responseId)) return;
  if (event.type === 'response.done' && responseId) {
    if (handledResponses.has(responseId)) return;
    handledResponses.add(responseId);
  }
  if(event.type === 'input_audio_buffer.committed') {const turn=pendingInputTurns.shift();if(turn)inputTurns.set(event.item_id,turn);return;}
  if(event.type === 'conversation.item.input_audio_transcription.completed') {
    const turn = inputTurns.get(event.item_id);
    transcriptEvent(turn,'user',event.transcript);
    if (turn) rememberVoiceTurn(turn.voiceId, event.transcript, !!turn.interrupted);
    return;
  }
  if(event.type === 'conversation.item.input_audio_transcription.failed') {transcriptEvent(inputTurns.get(event.item_id),'user','[Spoken question: transcription unavailable]');return;}
  if(event.type === 'response.created') {
    if (awaitingCancelledResponse) {
      awaitingCancelledResponse = false;
      if (event.response?.id) interruptedResponses.add(event.response.id);
      return;
    }
    activeResponseId = event.response?.id || null; responsePending = true;
    if(event.response?.id)responseTurns.set(event.response.id,current);
    return;
  }
  if (event.type === 'input_audio_buffer.speech_started') {
    turnEpoch++; toolRounds = 0;
    if (current && !current.playbackStart && current.status === 'unanswered') current.status = 'interrupted';
    playbackStopped = false; playbackTailUntil = 0;
    if (current && current.playbackStart && !current.playbackCompleted) current.interruptedAt = performance.now();
    outputActive = false; if (gain) gain.gain.value = 0;
    captionStop(); pose('listening', 'Listening to you');
  } else if (event.type === 'input_audio_buffer.speech_stopped') {
    const now = performance.now(); transcript = ''; startedAt = 0;
    const turnNumber = ++totalTurns;
    current = {turn: turnNumber, endOfSpeech: lastSpeech || now,
      voiceId: `${generation}-${turnNumber}`, turnDetected: now, status: 'unanswered', transport: 'webrtc'};
    pendingInputTurns.push(current);
    measurements.push(current); if (measurements.length > 100) measurements.shift();
    $('callAnswer').hidden = true; pose('thinking', 'Thinking');
  } else if (event.type === 'output_audio_buffer.started') {
    playbackStopped = false; playbackTailUntil = 0; outputActive = true; if (gain) gain.gain.value = 1;
    if (current) current.firstAudioReceived = performance.now();
  } else if (event.type === 'response.output_audio_transcript.delta') {
    transcript += event.delta || '';
    document.dispatchEvent(new CustomEvent('concierge-reaction', {detail: {role: 'agent', text: transcript}}));
    $('callAnswer').textContent = transcript; $('callAnswer').hidden = false;
    captionStart(transcript);
  } else if (event.type === 'response.output_audio_transcript.done') {
    transcript = event.transcript || transcript;
    transcriptEvent(responseTurns.get(event.response_id)||current,'agent',transcript);
    document.dispatchEvent(new CustomEvent('call-reply', {detail: {reply: transcript, reply_locale: replyLocale() === 'auto' ? 'en' : replyLocale()}}));
  } else if (event.type === 'response.done') {
    responsePending = false;
    const calls = event.response?.status === 'completed' ? (event.response.output || []).filter(item=>item.type === 'function_call') : [];
    if (calls.length) {
      responsePending = true;
      runTools(calls, generation, turnEpoch).catch(()=>stopRealtime('Voice lookup failed. Reconnect or use chat.'));
      return;
    }
    if (current) { current.streamCompleted = performance.now(); current.playedBeforeStreamCompleted = !!current.playbackStart && current.playbackStart < current.streamCompleted; }
    if (event.response?.status === 'failed') { if(current) current.status = 'failed'; stopRealtime('Voice response failed. Please reconnect or use chat.'); }
  } else if (event.type === 'output_audio_buffer.stopped') {
    playbackStopped = true; playbackTailUntil = performance.now() + Math.max(250, ((context?.outputLatency || 0) + (context?.baseLatency || 0)) * 1000);
    if(current) current.providerPlaybackStopped = performance.now();
  } else if (event.type === 'output_audio_buffer.cleared') {
    playbackStopped = false; playbackTailUntil = performance.now() + 250;
    outputActive = false; $('interruptReply').hidden = true; captionStop(); pose('listening', 'Listening to you'); summary();
  } else if (event.type === 'error') {
    if(event.error?.code === 'response_cancel_not_active') return;
    if (current && !current.playbackStart) current.status = 'failed';
    stopRealtime('Voice connection failed. Please reconnect or use chat.');
  }
}
export function stopRealtime(reason = 'Call ended. Microphone off.') {
  const wasRunning = running || !!pc;
  generation++; running = false; abort?.abort(); abort = null; clearTimeout(timer); clearTimeout(disconnectTimer); cancelAnimationFrame(frame);
  if (current && !current.playbackStart && current.status === 'unanswered') current.status = 'cancelled';
  mic?.getTracks().forEach(track => track.stop()); mic = null;
  channel?.close(); channel = null;
  if (pc) { pc.onconnectionstatechange = null; pc.close(); pc = null; }
  if(sink) {sink.pause();sink.srcObject=null;sink=null;}
  outputSource?.disconnect(); inputSource?.disconnect(); gain?.disconnect(); output?.disconnect();
  context?.close().catch(() => {}); context = null; input = output = null;
  outputActive = false; playbackStopped = false; playbackTailUntil = 0; $('interruptReply').hidden = true; captionStop();
  if (wasRunning) {
    $('guideArt').classList.remove('mouth-open'); pose(/failed|unavailable|lost|could not|invalid/i.test(reason) ? 'error' : 'idle', /failed|unavailable|lost|could not|invalid/i.test(reason) ? 'Voice connection needs attention' : 'Ready to help');
    $('liveTalk').textContent = 'Start call'; $('liveTalk').setAttribute('aria-pressed', 'false'); $('callStatus').textContent = reason;
    document.dispatchEvent(new CustomEvent('call-active', {detail: false})); summary();
  }
}
export function realtimeActive() { return running || !!pc; }
export async function startRealtime() {
  if (realtimeActive()) { stopRealtime(); return; }
  stopPlayback(); cancelRecording(); const life = ++generation;
  inputTurns.clear(); responseTurns.clear(); interruptedResponses.clear(); seenToolCalls.clear(); handledResponses.clear(); toolRounds = 0; turnEpoch = 0; activeResponseId = null; awaitingCancelledResponse = false; pendingInputTurns=[];
  running = true; micMuted = false; lastSpeech = 0; speechStart = 0; userSpeaking = false; responsePending = false; current = null; transcript = ''; outputActive = false;
  $('liveTalk').textContent = 'Cancel call'; $('liveTalk').setAttribute('aria-pressed', 'true'); $('callStatus').textContent = 'Connecting live voice...'; $('reconnectMic').hidden = true;
  let openingMicrophone = false, connectingAudio = false, rejectConnection;
  try {
    pose('connecting', 'Connecting voice');
    // SDP negotiation creates the session when needed. Do not require a separate
    // session-creation route before microphone access (older servers lack it).
    await flushConversation();
    const sessionId = conversationId();
    if (life !== generation) return;
    context = new AudioContext({latencyHint:'interactive'}); await context.resume();
    pc = new RTCPeerConnection(); abort = new AbortController();
    openingMicrophone = true;
    const media = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    openingMicrophone = false;
    if (life !== generation) { media.getTracks().forEach(track => track.stop()); return; }
    mic = media; input = context.createAnalyser(); input.fftSize = 512; inputSource = context.createMediaStreamSource(mic); inputSource.connect(input);
    mic.getAudioTracks().forEach(track => {
      pc.addTrack(track, mic);
      track.onended = () => { if(life === generation) {stopRealtime('Microphone disconnected. Reconnect it, then try again.'); $('reconnectMic').hidden = false;} };
    });
    output = context.createAnalyser(); output.fftSize = 512; gain = context.createGain(); gain.connect(output); output.connect(context.destination);
    pc.ontrack = event => { if(life !== generation) return; if ('jitterBufferTarget' in event.receiver) event.receiver.jitterBufferTarget = 20; sink = new Audio();sink.autoplay=true;sink.muted=true;sink.srcObject=event.streams[0];sink.play().catch(()=>{});outputSource = context.createMediaStreamSource(event.streams[0]); outputSource.connect(gain); };
    pc.onconnectionstatechange = () => {
      if(life !== generation) return;
      clearTimeout(disconnectTimer);
      const lost = () => { if(life === generation) {stopRealtime('Voice connection lost. Please reconnect.'); $('reconnectMic').hidden = false;} };
      if(pc.connectionState === 'failed') {
        if (connectingAudio && rejectConnection) rejectConnection(new Error('Voice audio connection unavailable'));
        else lost();
      }
      else if(pc.connectionState === 'disconnected') disconnectTimer = setTimeout(lost, 3000);
    };
    channel = pc.createDataChannel('oai-events'); channel.onmessage = event => { if(life === generation) { try { receive(JSON.parse(event.data)); } catch { stopRealtime('Invalid voice response. Please reconnect.'); } } };
    const ready = new Promise((resolve, reject) => { rejectConnection = reject; channel.onopen = resolve; channel.onerror = () => reject(new Error('Voice connection unavailable')); });
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    const params = new URLSearchParams({guide:avatarPath(),locale:replyLocale()});
    if (sessionId) params.set('session_id', sessionId);
    const response = await fetch(`/api/realtime?${params}`, {method:'POST',headers:{'Content-Type':'application/sdp'},body:offer.sdp,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(30000)])});
    if (!response.ok) throw new Error(`Voice service could not connect (HTTP ${response.status}). Try the call again. If this continues, restart the project server.`);
    const sdp = await response.text(); if(life !== generation) return;
    adoptConversation(response.headers.get('X-Conversation-ID'), response.headers.get('X-Voice-Token'));
    connectingAudio = true;
    await pc.setRemoteDescription({type:'answer',sdp});
    await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Voice connection timed out.')),15000))]);
    connectingAudio = false;
    if(life !== generation) return;
    $('liveTalk').textContent = 'End call'; $('callStatus').textContent = 'Live voice connected. Speak naturally; you can interrupt your guide at any time.'; pose('listening','Listening to you');
    document.dispatchEvent(new CustomEvent('call-active',{detail:true})); monitor(life);
    timer = setTimeout(()=>stopRealtime('Call time limit reached. Start a new call to continue.'),600000);
  } catch(error) {
    if (life === generation) {
      if (connectingAudio) {
        stopRealtime('Switching to streamed voice...');
        return 'fallback';
      }
      let message = error.message || 'Voice connection unavailable. Try the call again.';
      if (openingMicrophone) {
        if (error.name === 'NotAllowedError') message = 'Microphone access was blocked. Allow microphone access in your browser site settings, then try again.';
        else if (error.name === 'NotFoundError') message = 'No microphone was found. Connect a microphone, then try again.';
        else message = 'Microphone unavailable. Check that it is connected and another app is not using it, then try again.';
      }
      stopRealtime(message);
      pose('error', 'Voice connection needs attention');
      $('reconnectMic').textContent = openingMicrophone ? 'Retry microphone' : 'Retry call';
      $('reconnectMic').hidden = false;
    }
  }
}
export function realtimeReport() {
  const rows = measurements.map(row=>({...row,turnDetectionMs:row.turnDetected-row.endOfSpeech,
    responseWaitMs:row.firstAudioReceived ? row.firstAudioReceived-row.turnDetected : null,
    playbackStartupMs:row.playbackStart ? row.playbackStart-row.firstAudioReceived : null,
    endToEndMs:row.playbackStart ? row.playbackStart-row.endOfSpeech : null}));
  const times = rows.filter(row=>row.status==='answered').map(row=>row.endToEndMs).sort((a,b)=>a-b), mid=Math.floor(times.length/2);
  return {clock:'client performance.now; WebRTC output energy plus AudioContext output latency estimate',physicalSpeakerLatencyMeasured:false,
    firstAudioReceivedDefinition:'WebRTC output-buffer-start event arrival; not raw RTP arrival',
    answered:times.length,unanswered:rows.filter(row=>row.status!=='answered').length,
    medianMs:times.length?(times[(times.length-1)>>1]+times[mid])/2:null,slowestMs:times.length?times.at(-1):null,turns:rows};
}

$('interruptReply').addEventListener('click', () => {
  if (!running) return;
  interruptResponse();
  speechStart = 0; userSpeaking = false;
  send('input_audio_buffer.clear');
  $('interruptReply').hidden = true;
});

export function setRealtimeMuted(value) {
 micMuted=value;mic?.getAudioTracks().forEach(t=>t.enabled=!value);
 speechStart=0;userSpeaking=false;send('input_audio_buffer.clear');
 if(running&&!outputActive&&!responsePending)pose('listening','Listening to you');
}
