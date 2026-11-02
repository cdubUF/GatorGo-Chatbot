import io
import json
from datetime import date

from backend.app.config import ROOT
from backend.app.retrieval import read_records
from scripts.seed_knowledge import profile


def test_personal_fields_never_enter_profile():
    data = "hotel,arrival_date_year,name,email,phone-number,credit_card\nResort Hotel,2015,PRIVATE NAME,private@example.test,5551234567,4111111111111111\n"
    result = profile(io.StringIO(data), "fixture.csv", date(2026, 11, 1))
    serialized = json.dumps(result)
    for value in ["PRIVATE NAME", "private@example.test", "5551234567", "4111111111111111"]:
        assert value not in serialized
    assert result["excluded_columns"] == ["credit_card", "email", "name", "phone-number"]
    assert result["arrival_year_counts"] == {"2015": 1}


def test_expiration_and_address_exclusion():
    data = 'Name,Address,Type,Expiration date\nPrivate property,123 Private Street,Permit,2025 Nov 26 11:59:00 PM\nOther,999 Private St,Permit,unknown\n'
    result = profile(io.StringIO(data), "fixture.csv", date(2026, 11, 1))
    assert result["expired_permits"] == 1 and result["unparsed_expiration_count"] == 1
    assert "Private Street" not in json.dumps(result)


def test_dataset_seed_requires_approval():
    records = read_records(ROOT / "knowledge/unverified.json")
    assert len(records) == 6 and all(r.status == "unverified" for r in records)
    assert read_records(ROOT / "knowledge/approved.json") == []
