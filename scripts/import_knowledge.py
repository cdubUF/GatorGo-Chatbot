"""Validate JSON/CSV and import an entire approved snapshot explicitly."""
import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.app.config import ROOT  # noqa: E402
from backend.app.retrieval import read_records, validate_records  # noqa: E402
from backend.app.schemas import KnowledgeRecord  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        if args.input.suffix.lower() == ".csv":
            with args.input.open(encoding="utf-8-sig", newline="") as handle:
                rows = list(csv.DictReader(handle))
            for row in rows:
                row["tags"] = [x.strip() for x in row.get("tags", "").split("|") if x.strip()]
                row["expires"] = row.get("expires") or None
            records = [KnowledgeRecord.model_validate(row) for row in rows]
        else:
            records = read_records(args.input)
        validate_records(records)
        if any(r.status != "approved" for r in records):
            raise ValueError("Only approved records may be imported to approved.json")
        current = read_records(ROOT / "knowledge/approved.json")
        old = {r.id: r for r in current}
        new = {r.id: r for r in records}
        data = json.dumps([r.model_dump(mode="json") for r in sorted(records, key=lambda r: r.id)],
                          indent=2, ensure_ascii=False) + "\n"
        snapshot = hashlib.sha256(data.encode()).hexdigest()
        print(json.dumps({"snapshot": snapshot, "added": len(new.keys() - old.keys()),
                          "updated": sum(old[k] != new[k] for k in old.keys() & new.keys()),
                          "removed": len(old.keys() - new.keys()), "rejected": 0,
                          "dry_run": args.dry_run}))
        if not args.dry_run:
            directory = ROOT / "knowledge/snapshots"
            directory.mkdir(exist_ok=True)
            archive = directory / f"{snapshot}.json"
            if not archive.exists():
                archive.write_text(data, encoding="utf-8")
            target = ROOT / "knowledge/approved.json"
            temporary = target.with_suffix(".tmp")
            temporary.write_text(data, encoding="utf-8")
            temporary.replace(target)
    except (ValueError, OSError):
        # Never print raw records or validation inputs, which may include guest details.
        print("Import rejected: malformed records, duplicate IDs, conflicting topics, or unapproved status. "
              "Check knowledge/schema.json. No files changed.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
