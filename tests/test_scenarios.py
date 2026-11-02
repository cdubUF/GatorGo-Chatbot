import json

import pytest

from backend.app.config import ROOT

CASES = json.loads((ROOT / "tests/scenarios.json").read_text("utf-8"))


@pytest.mark.parametrize("case", CASES, ids=[c["id"] for c in CASES])
def test_behavior(client, case):
    sid = None
    for message in case["turns"]:
        response = client.post("/api/chat", json={"message": message, "session_id": sid})
        assert response.status_code == 200
        result = response.json()
        sid = result["session_id"]
    assert result["decision"]["level"] == case["level"]
    assert [s["id"] for s in result["sources"]] == case.get("sources", [])
    for text in case.get("contains", []):
        assert text.lower() in result["reply"].lower()
    if case.get("empathy"):
        assert "sorry" in result["reply"].lower()
