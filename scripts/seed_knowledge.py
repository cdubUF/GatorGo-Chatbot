"""Profile user-supplied CSVs without importing guest records into concierge knowledge."""
import argparse
import csv
import hashlib
import io
import json
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {"name", "email", "phone-number", "credit_card", "Name", "Address", "Location", "x", "y"}
BOOKING_FIELDS = ["hotel", "is_canceled", "arrival_date_year", "arrival_date_month",
                  "stays_in_weekend_nights", "stays_in_week_nights", "adults", "children", "babies",
                  "meal", "reserved_room_type", "deposit_type", "reservation_status"]


def profile(stream, label, as_of):
    reader = csv.DictReader(stream)
    fields = reader.fieldnames or []
    booking = "hotel" in fields
    digest = hashlib.sha256()
    count, expired, invalid_expiration = 0, 0, 0
    years, hotels, categories = Counter(), Counter(), Counter()
    for row in reader:
        count += 1
        if booking:
            # Do not hash, persist, print, or transmit personal columns.
            digest.update(json.dumps([row.get(k, "") for k in BOOKING_FIELDS],
                                     separators=(",", ":")).encode())
            years[row.get("arrival_date_year", "unknown")] += 1
            hotels[row.get("hotel", "unknown")] += 1
        else:
            categories[row.get("Type", "unknown")] += 1
            value = row.get("Expiration date", "")
            try:
                expired += datetime.strptime(value, "%Y %b %d %I:%M:%S %p").date() < as_of
            except ValueError:
                invalid_expiration += 1
    return {
        "source_file": label, "approval": "unverified", "row_count": count,
        "columns": fields, "excluded_columns": sorted(set(fields) & EXCLUDED),
        "kind": "historical_bookings" if booking else "rental_permit_inventory",
        "hotel_label_counts": dict(sorted(hotels.items())), "arrival_year_counts": dict(sorted(years.items())),
        "permit_type_counts": dict(sorted(categories.items())),
        "expired_permits_as_of": str(as_of) if not booking else None,
        "expired_permits": expired if not booking else None,
        "unparsed_expiration_count": invalid_expiration if not booking else None,
        "selected_nonpersonal_fields_sha256": digest.hexdigest() if booking else None,
        "approved_property_mapping": False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--permits", type=Path, required=True)
    parser.add_argument("--bookings", type=Path, required=True)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--as-of", type=date.fromisoformat, required=True)
    args = parser.parse_args()
    reports = []
    for path in (args.permits, args.bookings):
        with path.open(encoding="utf-8-sig", newline="") as stream:
            reports.append(profile(stream, path.name, args.as_of))
    with ZipFile(args.archive) as archive:
        for member in archive.infolist():
            if member.filename.lower().endswith(".csv"):
                # Stream without extracting paths from the untrusted archive.
                if member.file_size > 100_000_000:
                    raise ValueError("Archive member too large")
                with archive.open(member) as binary:
                    with io.TextIOWrapper(binary, encoding="utf-8-sig", newline="") as stream:
                        reports.append(profile(stream, args.archive.name + "/" + member.filename, args.as_of))
    hashes = {}
    for report in reports:
        signature = report["selected_nonpersonal_fields_sha256"]
        if signature:
            report["same_selected_rows_as"] = hashes.get(signature)
            hashes.setdefault(signature, report["source_file"])
    catalog = {"review_date": str(args.as_of), "sources": reports,
               "notice": "Local aggregate profile only. No personal rows imported. Not verified Gator Go policies."}
    (ROOT / "knowledge/source-catalog.json").write_text(json.dumps(catalog, indent=2) + "\n", "utf-8")
    topics = [
        ("booking-dates", "Arrival dates and length of stay", "Arrival date and stay length need confirmation against the guest's actual booking. This prototype cannot access real bookings.", ["arrival", "length of stay"], "arrival_date_year; arrival_date_month; stays_in_week_nights; stays_in_weekend_nights"),
        ("booking-meals", "Meal inclusion", "Meal inclusion must be confirmed from the guest's booking or by hotel staff. The historical meal field does not establish Gator Go dining policy.", ["meal plan", "meal inclusion"], "meal"),
        ("booking-deposit", "Deposit terms", "Deposit and cancellation terms need confirmation from the booking's actual terms and hotel staff. Historical deposit labels do not authorize refunds or establish current fees.", ["deposit", "deposit terms"], "deposit_type; is_canceled"),
        ("booking-room", "Requested room type", "Room categories in the historical dataset are coded. Gator Go's room descriptions, availability, and assignments still require approved information and staff confirmation.", ["room type", "room category"], "reserved_room_type"),
        ("booking-occupancy", "Guest occupancy limits", "The historical booking guest counts and rental-permit capacities do not establish Gator Go occupancy limits. Ask staff to confirm the room's approved capacity.", ["occupancy", "guest limit"], "adults; children; babies; export.csv: Guest limit"),
        ("booking-parking", "Parking requests", "A historical request for a parking space does not guarantee parking or establish Gator Go parking prices. Availability and terms need approved property information.", ["parking availability", "parking fees"], "required_car_parking_spaces"),
    ]
    records = [{"id": id_, "category": "Reservations", "topic": topic, "answer": answer,
        "source": "User-supplied historical CSV field structure: " + source,
        "status": "unverified", "updated": str(args.as_of), "expires": None, "tags": tags}
        for id_, topic, answer, tags, source in topics]
    (ROOT / "knowledge/unverified.json").write_text(json.dumps(records, indent=2) + "\n", "utf-8")
    print(json.dumps({"sources": [{"file": r["source_file"], "rows": r["row_count"],
        "excluded_column_count": len(r["excluded_columns"]), "duplicate_of": r.get("same_selected_rows_as")}
        for r in reports], "unverified_topic_drafts": len(records), "approved_records_added": 0}, indent=2))


if __name__ == "__main__":
    main()
