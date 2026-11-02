# Starting knowledge from the additional datasets

The user supplied `export.csv`, `hotel_bookings.csv`, and `archive (9).zip` as starting material. These have been profiled locally into `knowledge/source-catalog.json`; no raw datasets or identifiable guest rows are copied into the repository.

| Source | Observed contents | How it is used |
|---|---|---|
| export.csv | 1,393 rental-permit rows with property/address, capacity, expiration, and coordinates | Helps identify occupancy/location questions that require approved property-specific answers |
| hotel_bookings.csv | 119,390 historical booking rows; arrival years 2015–2017; City Hotel and Resort Hotel labels | Supplies field structure for arrival, stay length, meals, deposits, room types, and parking-request topics |
| archive (9).zip / hotel_booking.csv | 119,390 historical booking rows with the same aggregate years/hotel labels, plus name, email, phone-number, and credit_card columns | Personal columns are excluded; only non-identifying aggregates and field structure are retained |

The two booking files may overlap substantially. Their selected-field byte signatures differ, so no exact row-level equivalence is asserted. Do not sum their populations or treat them as independent survey responses. These records do not belong to a verified Gator Go reservation system and cannot be used to look up a real guest.

Of the permit rows, 1,051 have parsed expiration dates before November 1, 2026; 342 dates were missing or could not be parsed with the source format. Neither group proves a current valid license. Address/coordinate fields are excluded from the published profile, and no listed property is asserted to be Gator Go.

Six starting entries in `knowledge/unverified.json` cover booking dates, meals, deposits, room categories, occupancy, and parking. Their answers are conservative drafts describing what staff would need to verify. They are **not loaded into guest retrieval**, have no approval status, and do not add hotel facts to production. The supplied original sample policies remain separately marked demo-only. Before promotion, Wyatt/team should replace each draft with instructor-approved property facts, record the actual source and review date, add an expiration where appropriate, and use the approved importer.

To reproduce the profile without copying private rows, run:

```text
python scripts/seed_knowledge.py --permits PATH_TO_EXPORT_CSV --bookings PATH_TO_HOTEL_BOOKINGS_CSV --archive PATH_TO_ZIP --as-of 2026-11-01
```

The ZIP is streamed rather than extracted. Import excludes identifying columns and records only aggregate counts, column names, selected nonpersonal-field hashes, and draft topics. Original publication/license information was not supplied; verify it before redistributing the raw sources. No claims about dataset licensing or real hotel policy are made here.
