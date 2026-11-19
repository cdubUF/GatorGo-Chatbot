"""Bounded opt-in live smoke test; fictional questions, no guest data."""
import json
from dataclasses import replace
from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.config import load_settings
from backend.app.main import create_app


def main():
    settings = replace(load_settings(), provider='openai', demo=False, sample_knowledge=True,
        reservation_mode='disabled', mews_sandbox=False, multilingual=True,
        speech_enabled=True, provider_budget_usd=10,
        budget_path='data/expansion-smoke-budget.sqlite3', provider_timeout=30)
    results = []
    with TestClient(create_app(settings)) as client:
        for locale, question in [('en', 'What time is check-in?'), ('es', 'A que hora es el check-in?')]:
            response = client.post('/api/chat', json={'message': question, 'locale': 'auto'})
            result = {'expected_locale': locale, 'status_code': response.status_code}
            if response.status_code == 200:
                data = response.json()
                result.update(actual_locale=data['detected_locale'], reply_locale=data['reply_locale'],
                              answer=data['reply'], sources=data['sources'])
            else:
                result['detail'] = response.json().get('detail', 'unavailable')
            results.append(result)
    Path('artifacts').mkdir(exist_ok=True)
    Path('artifacts/live-expansion-smoke.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), 'utf-8')
    print(json.dumps(results, ensure_ascii=True))


if __name__ == '__main__':
    main()
