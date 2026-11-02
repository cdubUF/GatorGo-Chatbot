import json
import logging
import re
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from backend.app.config import Settings
from backend.app.main import create_app
from backend.app.provider import ModelAdapter
from backend.app.reservations import SQLiteReservations, Verification
from scripts import seed_reservations


def test_verified_context_is_scoped_minimized_and_never_survives_authorization(tmp_path, monkeypatch, caplog):
    import backend.app.main as main_module

    db_path = tmp_path / "reservations.sqlite3"
    monkeypatch.setattr(seed_reservations, "PATH", db_path)
    seed_reservations.main()
    original_is_file = Path.is_file
    monkeypatch.setattr(Path, "is_file", lambda path: True if path.name == "synthetic-hotel-reservations.sqlite3" else original_is_file(path))
    monkeypatch.setattr(main_module, "SQLiteReservations", lambda path: SQLiteReservations(db_path))
    now = [1000.0]
    monkeypatch.setattr(main_module, "Verification", lambda provider, mews=None: Verification(provider, clock=lambda: now[0], mews=mews))
    requests = []

    def handler(request):
        content = json.loads(json.loads(request.content)["input"][0]["content"])
        requests.append(content)
        return httpx.Response(200, json={"status": "completed", "output": [{"type": "message", "content": [
            {"type": "output_text", "text": json.dumps({"reply": "I can help with the stay.", "source_ids": []})}]}]})

    settings = Settings(provider="openai", api_key="test", reservation_mode="synthetic", sample_knowledge=True)
    adapter = ModelAdapter(settings, httpx.MockTransport(handler))
    caplog.set_level(logging.WARNING, logger="gatorgo.reservations")
    with TestClient(create_app(settings, provider=adapter)) as client:
        def verify(hotel, confirmation, name):
            caplog.clear()
            challenge = client.post("/api/reservations/lookup", json={
                "hotel": hotel, "confirmation": confirmation, "name": name}).json()
            code = re.search(r"development only\): (\d{6})", caplog.text).group(1)
            response = client.post("/api/reservations/verify", json={"challenge_id": challenge["challenge_id"], "code": code})
            return {"Authorization": "Bearer " + response.json()["access_token"]}

        first = client.post("/api/chat", json={"message": "When is check-in?"}).json()
        sid = first["session_id"]
        assert "verified_test_reservation" not in requests[-1]
        auth = verify("gatorgo", "GG-2026-1048", "Guest1 Sample")
        reply = client.post("/api/chat", headers=auth, json={"session_id": sid, "message": "When do I check out?"})
        assert reply.status_code == 200
        context = requests[-1]["verified_test_reservation"]
        assert context == {"hotel": "Gator Go Resort & Spa (fictional)", "provider": "gatorgo",
                           "check_in": "2026-11-14", "check_out": "2026-11-17", "room_type": "Double Queen",
                           "guests": 2, "status": "confirmed"}
        assert all(secret not in json.dumps(requests[-1]) for secret in ("Guest1", "GG-2026-1048", auth["Authorization"]))
        assert client.post("/api/chat", headers={"Authorization": "Bearer invalid"}, json={"session_id": sid, "message": "When?"}).status_code == 401
        now[0] += 601
        assert client.post("/api/chat", headers=auth, json={"session_id": sid, "message": "When?"}).status_code == 401
        client.post("/api/chat", json={"session_id": sid, "message": "When do I check out?"})
        assert "verified_test_reservation" not in requests[-1]
        assert "[Reservation-related reply omitted]" in json.dumps(requests[-1]["recent_context"])

        hilton = verify("hilton-uf", "GG-2026-1056", "Guest9 Sample")
        client.post("/api/chat", headers=hilton, json={"session_id": sid, "message": "What time is check-in?"})
        assert requests[-1]["verified_test_reservation"]["provider"] == "hilton-uf"
        assert all(record["status"] == "general" for record in requests[-1]["evidence"])
        assert all(item["role"] == "user" for item in requests[-1]["recent_context"])
