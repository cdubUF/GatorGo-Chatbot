"""Opt-in local voice roundtrip; generated fixture, no microphone recording."""
import io
import json
import wave
from pathlib import Path
import httpx

with httpx.Client(base_url='http://127.0.0.1:8011', timeout=120) as client:
    voice = client.post('/api/voice', json={'text': 'What time is check-in?', 'guide': 'trail'})
    voice.raise_for_status()
    Path('artifacts/ai-voice-smoke.wav').write_bytes(voice.content)
    import audioop
    with wave.open(io.BytesIO(voice.content), 'rb') as source:
        frames = source.readframes(source.getnframes())
        if source.getnchannels() == 2:
            frames = audioop.tomono(frames, source.getsampwidth(), .5, .5)
        frames = audioop.lin2lin(frames, source.getsampwidth(), 2)
        frames, _ = audioop.ratecv(frames, 2, 1, source.getframerate(), 16000, None)
    output = io.BytesIO()
    with wave.open(output, 'wb') as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(16000)
        target.writeframes(frames)
    transcript = client.post('/api/speech?locale=en', content=output.getvalue(), headers={'Content-Type': 'audio/wav'})
    transcript.raise_for_status()
    answer = client.post('/api/chat', json={'message': transcript.json()['text'], 'locale': 'en'})
    answer.raise_for_status()
    data = answer.json()
    spoken = client.post('/api/voice', json={'text': data['reply'], 'guide': 'trail'})
    spoken.raise_for_status()
    Path('artifacts/ai-answer-smoke.wav').write_bytes(spoken.content)
    report = {'transcript': transcript.json()['text'], 'reply': data['reply'], 'voice_bytes': len(spoken.content), 'sources': [s['id'] for s in data['sources']], 'input': 'AI-generated test question, not a human microphone recording'}
    Path('artifacts/live-voice-smoke.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report))
