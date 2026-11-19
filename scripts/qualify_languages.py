"""Opt-in live qualification. Recordings must be independently supplied PCM WAVs."""
import argparse
import json
from pathlib import Path

import httpx


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8000')
    parser.add_argument('--recordings', type=Path)
    parser.add_argument('--output', type=Path, default=Path('artifacts/language-qualification.json'))
    parser.add_argument('--source', default='checkin')
    parser.add_argument('--fact', default='3:00 PM')
    args = parser.parse_args()
    cases = json.loads(Path('tests/fixtures/language-matrix.json').read_text('utf-8-sig'))
    results = []
    with httpx.Client(base_url=args.url, timeout=240) as client:
        for case in cases:
            for kind in ['typed', 'unknown', 'recorded']:
                entry = {'language': case['language'], 'expected_locale': case['locale'],
                         'kind': kind, 'topic': 'unknown' if kind == 'unknown' else 'check-in',
                         'expected_source': None if kind == 'unknown' else args.source,
                         'expected_fact': None if kind == 'unknown' else args.fact}
                try:
                    text = case['unknown'] if kind == 'unknown' else case['question']
                    if kind == 'recorded':
                        path = args.recordings / f"{case['locale']}.wav" if args.recordings else None
                        if not path or not path.is_file():
                            entry['status'] = 'not_run_missing_independent_recording'
                            results.append(entry)
                            continue
                        speech = client.post('/api/speech', content=path.read_bytes(), headers={'Content-Type': 'audio/wav'})
                        speech.raise_for_status()
                        text = speech.json()['text']
                    response = client.post('/api/chat', json={'message': text, 'locale': 'auto'})
                    response.raise_for_status()
                    result = response.json()
                    entry.update(actual_locale=result['detected_locale'], reply_locale=result['reply_locale'],
                                 answer=result['reply'], sources=result['sources'])
                    checks = result['detected_locale'] == case['locale'] and result['reply_locale'] == case['locale']
                    if kind != 'unknown':
                        checks = checks and args.fact in result['reply'] and any(s['id'] == args.source for s in result['sources'])
                    else:
                        checks = checks and not result['sources']
                    entry['status'] = 'automatic_checks_passed_needs_native_review' if checks else 'failed'
                except (httpx.HTTPError, ValueError, KeyError):
                    entry['status'] = 'service_error'
                results.append(entry)
                args.output.parent.mkdir(parents=True, exist_ok=True)
                args.output.write_text(json.dumps(results, ensure_ascii=False, indent=2), 'utf-8')
    print(f'Wrote {len(results)} qualification entries to {args.output}. Review semantics and playback separately.')


if __name__ == '__main__':
    main()
