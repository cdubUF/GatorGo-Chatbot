"""Create a local SQLite database of fictional reservations; refuses to overwrite."""
import sqlite3
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data" / "synthetic-reservations.sqlite3"


def main():
    PATH.parent.mkdir(parents=True, exist_ok=True)
    if PATH.exists():
        raise SystemExit("Synthetic reservation database already exists; it was not changed.")
    with sqlite3.connect(PATH) as db:
        db.executescript("""
        CREATE TABLE reservations (
            id INTEGER PRIMARY KEY, confirmation TEXT NOT NULL UNIQUE,
            first_name TEXT NOT NULL, last_name TEXT NOT NULL, contact TEXT NOT NULL,
            room_type TEXT NOT NULL, check_in TEXT NOT NULL, check_out TEXT NOT NULL,
            guests INTEGER NOT NULL, status TEXT NOT NULL
        );
        CREATE TABLE change_requests (
            id INTEGER PRIMARY KEY, reservation_id INTEGER NOT NULL REFERENCES reservations(id),
            details TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL DEFAULT 'pending'
        );
        """)
        statuses = ("confirmed", "checked in", "checked out", "canceled")
        for index in range(1, 25):
            start = date(2026, 11, 14) + timedelta(days=index - 1)
            db.execute("INSERT INTO reservations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (
                index, f"GG-2026-{1047 + index}", f"Guest{index}", "Sample",
                f"guest{index}@example.invalid", ("Deluxe King", "Double Queen")[index % 2],
                start.isoformat(), (start + timedelta(days=3)).isoformat(),
                1 + index % 4, statuses[(index - 1) % len(statuses)],
            ))
    print("Created 24 fictional reservations. Example: GG-2026-1048 / Guest1 Sample.")


if __name__ == "__main__":
    main()
