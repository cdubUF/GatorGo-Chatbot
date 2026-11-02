"""Build a small question-phrasing index from the downloaded Bitext datasets.

Only instructions are used; dataset answers, placeholders, and customer information
are not copied. The index supports search and does not train the model.
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "hospitality": {
        "check_in": "checkin", "check_out": "checkout", "bring_pets": "pets",
        "check_hotel_facilities": "amenities", "check_menu": "dining",
        "book_parking_space": "parking", "store_luggage": "general-luggage",
        "shuttle_service": "general-transport", "check_hotel_prices": "general-pricing",
        "cancellation_fees": "general-cancellation", "get_refund": "general-refund",
    },
    "customer_support": {"check_payment_methods": "general-payment"},
}
BAD = re.compile(r"\b(fuck\w*|shit\w*|damn|bitch\w*|asshole\w*)\b|[{}@<>\d]", re.I)


def main():
    aliases = {}
    for folder, mapping in SOURCES.items():
        files = list((ROOT / "data/external" / folder).glob("*.csv"))
        if len(files) != 1:
            raise SystemExit(f"Download the {folder} dataset first; expected one CSV.")
        with files[0].open(encoding="utf-8-sig", newline="") as stream:
            for row in csv.DictReader(stream):
                target = mapping.get(row.get("intent", ""))
                phrase = " ".join(row.get("instruction", "").split())
                if not target or BAD.search(phrase) or not 5 <= len(phrase.split()) <= 18:
                    continue
                items = aliases.setdefault(target, [])
                if len(items) < 30 and phrase.lower() not in {item.lower() for item in items}:
                    items.append(phrase)
    (ROOT / "knowledge/dataset-phrases.json").write_text(
        json.dumps(aliases, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Indexed {sum(map(len, aliases.values()))} example questions across {len(aliases)} topics.")


if __name__ == "__main__":
    main()
