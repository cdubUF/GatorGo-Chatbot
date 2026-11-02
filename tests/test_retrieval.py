from datetime import date, timedelta

import pytest

from backend.app.retrieval import Retriever, validate_records
from backend.app.schemas import KnowledgeRecord


def record(**updates):
    values = dict(id="pool", category="Amenities", topic="Pool", answer="Pool opens at 8 AM.",
                  source="Test fixture only", status="approved", updated=date.today(), tags=["pool", "swimming"])
    return KnowledgeRecord(**{**values, **updates})


def test_approved_and_whole_word_matching():
    retriever = Retriever([record()])
    assert retriever.search("pool hours")[0][0].id == "pool"
    assert not retriever.search("carpool")


@pytest.mark.parametrize("status,demo,expected", [("approved", False, True),
    ("demo_only", False, False), ("demo_only", True, True), ("unverified", True, False)])
def test_status_filter(status, demo, expected):
    assert bool(Retriever([record(status=status)], demo=demo).search("pool")) == expected


def test_conflict_stale_duplicate_and_threshold():
    assert not Retriever([record(expires=date.today() - timedelta(days=1))]).search("pool")
    assert not Retriever([record(), record(id="pool2", answer="Pool opens at 9 AM.")]).search("pool")
    assert not Retriever([record(), record()]).search("pool")
    assert not Retriever([record()], threshold=20).search("pool")
    with pytest.raises(ValueError):
        validate_records([record(), record()])
    with pytest.raises(ValueError):
        validate_records([record(), record(id="pool2", answer="Contradiction")])
