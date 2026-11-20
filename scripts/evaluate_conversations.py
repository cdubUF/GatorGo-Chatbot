"""Repeatable architecture contracts. Does not claim live-model accuracy or voice latency."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient  # noqa: E402
from backend.app.config import ROOT, Settings  # noqa: E402
from backend.app.main import create_app  # noqa: E402


def main():
    cases = json.loads((ROOT / 'tests/fixtures/conversation-architecture.json').read_text('utf-8'))
    rows = []
    with TestClient(create_app(Settings(demo=False, sample_knowledge=True))) as client:
        for case in cases:
            sid = None
            for question in case['turns']:
                response = client.post('/api/chat', json={'session_id':sid,'message':question})
                response.raise_for_status()
                result = response.json()
                sid = result['session_id']
            passed = (set(case['sources']) == {s['id'] for s in result['sources']}
                      and result['decision']['level'] == case['level']
                      and all(text.lower() in result['reply'].lower() for text in case['contains']))
            rows.append({'id':case['id'],'passed':passed,'timings_ms':result['timings_ms']})
    report = {'mode':'mock; curated architecture contracts', 'passed':sum(r['passed'] for r in rows),
              'total':len(rows),'live_model_accuracy_verified':False,'physical_voice_latency_verified':False,'results':rows}
    (ROOT / 'artifacts').mkdir(exist_ok=True)
    (ROOT / 'artifacts/conversation-evaluation.json').write_text(json.dumps(report,indent=2)+'\n','utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='results'},indent=2))
    return 0 if all(r['passed'] for r in rows) else 1


if __name__ == '__main__':
    sys.exit(main())
