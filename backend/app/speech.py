"""Bounded in-memory PCM audio. No audio is written to disk."""
import asyncio
import io
import wave

import httpx

from fastapi import HTTPException

from .personalities import PROFILES

MAX_AUDIO_BYTES = 4 * 1024 * 1024
MAX_RECORDING_SECONDS = 30


def validate_audio(data):
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(413, 'Recording exceeds the upload limit.')
    try:
        with wave.open(io.BytesIO(data), 'rb') as audio:
            rate, frames = audio.getframerate(), audio.getnframes()
            if audio.getnchannels() != 1 or audio.getsampwidth() != 2 or not 8000 <= rate <= 48000:
                raise ValueError()
            if frames <= 0 or frames / rate > MAX_RECORDING_SECONDS:
                raise HTTPException(413, 'Record between 0 and 30 seconds.')
            if len(data) != 44 + frames * 2 or data[12:16] != b"fmt " or data[36:40] != b"data":
                raise ValueError()
            if len(audio.readframes(frames)) != frames * 2:
                raise ValueError()
    except (wave.Error, EOFError, ValueError):
        raise HTTPException(415, 'Use mono 16-bit PCM WAV audio.') from None


async def transcribe(settings, usage, data, locale, transport=None):
    validate_audio(data)
    usage.reserve(speech=True)
    try:
        async with asyncio.timeout(settings.provider_timeout):
            async with httpx.AsyncClient(timeout=settings.provider_timeout, transport=transport) as client:
                response = await client.post('https://api.openai.com/v1/audio/transcriptions',
                    headers={'Authorization': f'Bearer {settings.api_key}'},
                    files={'file': ('utterance.wav', data, 'audio/wav')},
                    data={'model': settings.speech_model, 'response_format': 'json',
                          **({'language': locale} if locale != 'auto' else {})})
                response.raise_for_status()
                text = response.json().get('text')
                if not isinstance(text, str) or not text.strip() or len(text) > 1000:
                    raise ValueError()
                return text.strip()
    except (httpx.HTTPError, TimeoutError, ValueError, TypeError):
        raise HTTPException(503, 'Transcription unavailable. Please type your question.') from None


async def synthesize(settings, usage, text, guide, transport=None):
    """Generate bounded audio in memory; secrets stay on the server."""
    usage.reserve(speech=True)
    try:
        async with asyncio.timeout(settings.provider_timeout):
            async with httpx.AsyncClient(timeout=settings.provider_timeout, transport=transport) as client:
                response = await client.post('https://api.openai.com/v1/audio/speech',
                    headers={'Authorization': f'Bearer {settings.api_key}'},
                    json={'model': settings.voice_model, 'voice': 'marin' if guide == 'desk' else 'cedar',
                          'input': text, 'response_format': 'wav',
                          'instructions': PROFILES.get(guide, PROFILES['desk']) + ' Read the supplied text exactly in its language, warmly and naturally.'})
                response.raise_for_status()
                if not response.content.startswith(b'RIFF') or len(response.content) > 16 * 1024 * 1024:
                    raise ValueError()
                return response.content
    except (httpx.HTTPError, TimeoutError, ValueError):
        raise HTTPException(503, 'AI voice unavailable. Your answer is still in chat.') from None

async def stream_speech(settings, usage, text, guide, transport=None):
    """Yield provider PCM as it arrives; never buffer the whole spoken reply."""
    usage.reserve(speech=True)
    async with asyncio.timeout(settings.provider_timeout):
        async with httpx.AsyncClient(timeout=settings.provider_timeout, transport=transport) as client:
            async with client.stream('POST', 'https://api.openai.com/v1/audio/speech',
                headers={'Authorization': f'Bearer {settings.api_key}'},
                json={'model': settings.voice_model, 'voice': 'marin' if guide == 'desk' else 'cedar',
                      'input': text[:4000], 'response_format': 'pcm',
                      'instructions': PROFILES.get(guide, PROFILES['desk']) + ' Read the supplied text exactly in its language, warmly and naturally.'}) as response:
                response.raise_for_status()
                size = 0
                async for chunk in response.aiter_bytes(2400):
                    size += len(chunk)
                    if size > 16 * 1024 * 1024:
                        raise ValueError('Audio limit exceeded')
                    yield chunk
