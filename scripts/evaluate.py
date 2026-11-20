"""Reproducible contract evaluation; no live provider or guest data."""
import json
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient  # noqa: E402
from backend.app.config import ROOT, Settings  # noqa: E402
from backend.app.main import create_app  # noqa: E402


def evaluate():
    cases = json.loads((ROOT / "tests/scenarios.json").read_text("utf-8"))
    rows = []
    with TestClient(create_app(Settings())) as client:
        for case in cases:
            sid, replies, latencies = None, [], []
            for prompt in case["turns"]:
                start = time.perf_counter()
                response = client.post("/api/chat", json={"message": prompt, "session_id": sid})
                latencies.append((time.perf_counter() - start) * 1000)
                response.raise_for_status()
                reply = response.json()
                sid = reply["session_id"]
                replies.append(reply)
            result = replies[-1]
            source_ids = [s["id"] for s in result["sources"]]
            checks = {
                "routing": result["decision"]["level"] == case["level"],
                "grounding": source_ids == case.get("sources", []),
                "clarity": all(text.lower() in result["reply"].lower() for text in case.get("contains", [])),
                "empathy": not case.get("empathy") or "sorry" in result["reply"].lower(),
                "action_honesty": not any(text in result["reply"].lower() for text in [
                    "i have notified", "i have booked", "refund issued", "help is on the way"]),
            }
            rows.append({"id": case["id"], "checks": checks, "pass": all(checks.values()),
                         "latency_ms": round(statistics.mean(latencies), 2),
                         "follow_up_owner": None if all(checks.values()) else "Chris"})
    report = {"mode": "mock; synthetic scenarios", "scenario_count": len(rows),
              "passed": sum(row["pass"] for row in rows),
              "mean_latency_ms": round(statistics.mean(row["latency_ms"] for row in rows), 2),
              "note": "Automated contract checks, not human empathy ratings or live-model accuracy.",
              "results": rows}
    directory = ROOT / "artifacts"
    directory.mkdir(exist_ok=True)
    (directory / "evaluation.json").write_text(json.dumps(report, indent=2) + "\n", "utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "results"}, indent=2))
    return 0 if report["passed"] == len(rows) else 1


def coverage_report(records, cases):
    """Group missing curated expectations; never collect real guest questions."""
    from backend.app.retrieval import Retriever
    retriever = Retriever(records, demo=True)
    groups = {}
    for case in cases:
        matched = {r.id for r, _ in retriever.search(case['question'], limit=100)}
        expected = case['expected_record']
        key = (case['topic'], expected)
        group = groups.setdefault(key, {'topic': key[0], 'expected_record': expected, 'missing': [], 'resolved': []})
        group['resolved' if expected in matched else 'missing'].append(case['id'])
    return {'mode': 'curated fixtures; no guest text', 'gaps': [g for g in groups.values() if g['missing']],
            'resolved': [g for g in groups.values() if not g['missing']]}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--coverage', action='store_true')
    parser.add_argument('--records', type=Path, default=ROOT / 'knowledge/venues.json')
    parser.add_argument('--fixtures', type=Path, default=ROOT / 'tests/fixtures/coverage-gaps.json')
    args = parser.parse_args()
    if args.coverage:
        from backend.app.retrieval import read_records
        report = coverage_report(read_records(args.records), json.loads(args.fixtures.read_text('utf-8')))
        (ROOT / 'artifacts/coverage-gaps.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps(report, indent=2))
    else:
        sys.exit(evaluate())
