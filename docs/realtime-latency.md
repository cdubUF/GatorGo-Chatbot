# Local live voice: measured latency

The local call now uses a persistent WebRTC speech-to-speech session with `gpt-realtime-2.1-mini`, minimal reasoning, and grounded resort reference data. Audio begins as it arrives; the former transcription, text-answer, and separate speech-generation round trips are no longer on the live-call path. If WebRTC audio setup times out, the client automatically falls back to the streamed `/api/call` endpoint. This mode uses transcription, text generation and streamed speech and has higher turn latency.

## Latest complete ten-question run

- 10 answered, 0 unanswered, 0 browser page errors.
- Median end-of-speech to browser output: **1058.3 ms**.
- Fastest: **833.6 ms**. Slowest: **1349.1 ms**.
- Four of ten replies began within one second. The requested 500 ms target was not achieved. This run used Trail Guide Gator; voice and network variation prevent treating the earlier 955.5 ms Front Desk run as a guaranteed speed.
- Answers covered check-in, four venue locations and hours, a venue follow-up, and the Garden Discovery Walk. Review the exact answers and phase timings in `artifacts/realtime-latency.json`.
- Typed draft remained intact; no call input was inserted into text chat.
- A separate real-provider interruption test stopped the first reply and answered the Palm Grill follow-up in **966.4 ms**; End call released the input track. Evidence: `artifacts/realtime-barge-in.json`.

## What is measured

The rehearsal feeds generated question audio into a real browser MediaStream and uses the actual remote voice service. One `performance.now()` clock records the last detected input speech, turn commitment, remote output-buffer-start event, and first detected non-silent browser output. The output estimate includes AudioContext base/output latency. It is not an external acoustic microphone-to-speaker measurement. The remote buffer event is not a raw RTP packet arrival measurement. Initial connection time is separate from conversational turn latency.

The client now waits 650 ms after detected speech before committing a question, allowing more natural pauses. The measurements above predate this conversational tuning and must be remeasured before making new latency claims. A regression verifies a brief mid-question pause remains one turn. Responses contain actual answers; no canned acknowledgement is counted as a reply.

Provider response time, network jitter, microphone processing, and output hardware vary. The roughly one-second typical response must not be presented as a hard upper bound. The previous ten-question pipeline measured 3926.8 ms median and 9681.6 ms slowest; the latest median is about 73% lower.

## Running locally

Run `run-local-live.bat`, refresh the URL it prints (normally http://127.0.0.1:8000), and start a new call. The local launcher enables realtime calling. The permanent provider key stays on the server; SDP negotiation is same-origin and the realtime route is restricted to the explicitly enabled local profile. Resort facts remain labeled sample data. Audio is streamed to the provider only while the call is active. End call, disconnect, changing guide, leaving the page, and the call time limit release capture.

To reproduce the provider test with existing WAV fixtures:

```powershell
$env:REHEARSAL_COUNT='10'
node scripts/rehearse-realtime.cjs
```

To exercise real-provider interruption:

```powershell
$env:REHEARSAL_COUNT='1'
$env:REHEARSAL_BARGE_IN='1'
node scripts/rehearse-realtime.cjs
```

The browser process needs network access for WebRTC. The earlier user confirmation that real laptop audio works predates this transport change; this new timing result is an automated real-provider browser measurement, not a claim of a new human acoustic acceptance test.

## Half-second target investigation

The shorter 240 ms pause setting passed the 200 ms mid-question-pause regression, interruption and capture-cleanup tests. It saves 60 ms of configured local waiting; it does not establish a 60 ms reduction in every end-to-end call because provider and network times vary.

Disabling provider noise reduction and adding a direct-lookup prompt produced 1091.2 ms median / 1616.1 ms maximum over ten questions. Both changes were reverted. Evidence: `artifacts/realtime-no-filter-experiment.json`.

Restoring the provider filter with the 240 ms pause gave 1058.3 ms median / 1349.1 ms maximum, ten correct venue/check-in/activity responses and no failed turns. Phase medians were 250.5 ms detection, 569.2 ms response wait, and 212.6 ms output startup (phase medians do not sum exactly to the end-to-end median). Evidence: `artifacts/realtime-240ms-filtered.json`. Earlier baseline preserved as `artifacts/realtime-956ms-baseline.json`.

The measured response wait alone exceeded 500 ms on most turns. The app cannot honestly promise a half-second audible answer with these observed service timings. No filler, prerecorded acknowledgement, changed timing origin, or omission of slow turns was used to present a false improvement.


## Conversational characters and interruptions

Character direction lives in `backend/app/personalities.py` and applies to live voice and model-generated text. Front Desk Gator is concise and attentive, Poolside Gator is more sociable and expansive, and Trail Guide Gator is curious and descriptive. Direct hours/location questions stay short. Guest requests for brevity or detail override the default style. Open-ended amenity replies may include an explicitly imagined holiday moment; customer anecdotes must come from approved anonymous material, never invented testimonials or guest directory records.

Voice interruption is on by default. Sustained microphone speech cancels generation and clears the WebRTC output buffer, which also truncates unplayed conversation audio according to the [OpenAI Realtime guide](https://developers.openai.com/api/docs/guides/realtime-conversations). Local playback is muted immediately; late events for interrupted responses are ignored. Brief noise still has to pass the speech threshold. The checkbox can disable speech interruption if speaker echo causes false triggers; the Interrupt button remains available. Test coverage simulates microphone and output levels; actual acoustic performance depends on device echo cancellation and still needs a live listening check.

Text requests now include the selected `guide`; old clients default to `desk`. Structured venue resolution still determines dates, closures, ambiguity, sources and map/menu actions before model phrasing. Missing-source or unavailable-model replies retain the deterministic venue answer. In the legacy call pipeline, narrow factual questions retain the fast local answer, while open-ended amenity questions use the selected character. Offline FAQ and handoff behavior stay deterministic.


## Facial reactions

`frontend/expressions.js` directs cheerful, curious, empathetic and neutral faces using reply text, guest transcript text, routing decisions and the listening/thinking state. Typed replies and streamed voice transcripts share this controller. It uses local English phrase rules, not camera analysis or vocal emotion detection, and does not retain text. Human handoffs keep an empathetic face; a new guest turn can change the mood. Reset, guide changes and ending a call clear the expression. Idle expressions relax after eight seconds. The expression atlas pairs each mood with closed/open mouth frames, preserving audio-driven mouth movement and reduced-motion behavior. The original neutral artwork retains its blink frames.

## Microphone connection repair (November 19, 2026)

An older server on port 8011 returned HTTP 405 for `/api/conversations`. Call startup no longer requires that separate request; realtime negotiation creates or resumes the session. Permission errors now explain browser settings, while server failures offer Retry call.

Live qualification on port 8000 successfully opened synthetic microphone capture, but WebRTC ICE remained in checking until the connection timeout. Automatic streamed fallback then completed one real-provider question and finished playing its spoken answer and released the microphone on End call, with zero page errors and the typed draft preserved. End-of-speech to scheduled browser output was 4144.3 ms in that single run; this excludes the initial WebRTC connection timeout and does not measure physical microphone or speaker hardware. Evidence: `artifacts/live-streaming-call.json`. The older ten-question WebRTC measurements above do not represent current connection availability.
