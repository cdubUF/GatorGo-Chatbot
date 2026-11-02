#!/usr/bin/env python3
"""Gator Go external dataset downloader. Stdlib only; downloads are never used as hotel policy facts.

Usage:
 python scripts/download_datasets.py --list
 python scripts/download_datasets.py --only hospitality meridian customer_support
 python scripts/download_datasets.py --all
 python scripts/download_datasets.py --all --dry-run

Downloaded data is stored under data/external/, which should be gitignored.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "external"

# Dataset homepages and license details are maintained in README.md.
DATASETS = {
    "hospitality": {"repo": "bitext/Bitext-hospitality-llm-chatbot-training-dataset", "file": "bitext-hospitality-llm-chatbot-training-dataset.csv", "license": "CDLA-Sharing-1.0", "role": "conversation_examples"},
    "meridian": {"repo": "himu1780/meridian-palace-training", "auto": True, "license": "MIT", "role": "synthetic_hotel_dialogues"},
    "multiwoz": {"repo": "ConvLab/multiwoz21", "file": "data.zip", "license": "Apache-2.0", "role": "hotel_booking_dialogue_tests"},
    "customer_support": {"repo": "bitext/Bitext-customer-support-llm-chatbot-training-dataset", "file": "Bitext_Sample_Customer_Support_Training_Dataset_27K_responses-v11.csv", "license": "CDLA-Sharing-1.0", "role": "support_intents"},
    "travel": {"repo": "bitext/Bitext-travel-llm-chatbot-training-dataset", "file": "bitext-travel-llm-chatbot-training-dataset.csv", "license": "CDLA-Sharing-1.0", "role": "travel_intents"},
    "restaurants": {"repo": "bitext/Bitext-restaurants-llm-chatbot-training-dataset", "file": "bitext-restaurants-llm-chatbot-training-dataset.csv", "license": "CDLA-Sharing-1.0", "role": "dining_intents"},
    "events": {"repo": "bitext/Bitext-events-ticketing-llm-chatbot-training-dataset", "file": "bitext-events-ticketing-llm-chatbot-training-dataset .csv", "license": "CDLA-Sharing-1.0", "role": "event_service_intents"},
    "hotel_booking_demand": {"url": "https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/data/2020/2020-02-11/hotels.csv", "file": "hotels.csv", "license": "Check upstream dataset terms", "role": "analytics_only"},
    "tripadvisor_reviews": {"repo": "argilla/tripadvisor-hotel-reviews", "file": "data/train-00000-of-00001-0e99e58b23dccc25.parquet", "license": "CC-BY-NC-4.0", "role": "complaint_testing_noncommercial"},
    "empathetic": {"repo": "Adapting/empathetic_dialogues_v2", "file": "train.csv", "license": "AFL-3.0 (derivative; check upstream CC-BY-NC-4.0)", "role": "empathy_testing_noncommercial"},
    "support_dialogues": {"repo": "ai-training-datasets/customer-service", "auto": True, "license": "MIT (per dataset card)", "role": "multi_turn_customer_personas"},
    "synthetic_hotel_reviews": {"repo": "LocalLLaMA/datainventor-hotel-reviews", "auto": True, "license": "Apache-2.0", "role": "synthetic_hotel_review_testing"},
}

GOOD_EXTS = (".csv", ".json", ".jsonl", ".parquet", ".zip", ".gz")
MAX_BYTES = 100 * 1024 * 1024  # avoid unexpectedly huge files


def request(url):
    req = urllib.request.Request(url, headers={"User-Agent": "GatorGo-course-project-dataset-downloader/1.0", "Accept": "application/json, */*"})
    return urllib.request.urlopen(req, timeout=45)


def resolve_url(repo, path):
    return f"https://huggingface.co/datasets/{repo}/resolve/main/" + "/".join(urllib.parse.quote(x, safe="") for x in path.split("/"))


def discover(repo):
    # Hugging Face's public repository-tree API, not arbitrary code execution.
    api_url = f"https://huggingface.co/api/datasets/{repo}/tree/main?recursive=true"
    with request(api_url) as response:
        entries = json.load(response)
    candidates = []
    for entry in entries:
        path = entry.get("path", "")
        size = entry.get("size") or entry.get("lfs", {}).get("size") or 0
        if entry.get("type") != "file" or not path.lower().endswith(GOOD_EXTS):
            continue
        if size and size > MAX_BYTES:
            continue
        # Don't download metadata or saved checkpoints by accident.
        score = sum((8 if word in path.lower() else 0) for word in ("dialogues", "train", "conversation", "hotel"))
        score += 4 if path.lower().endswith((".csv", ".jsonl", ".json")) else 0
        candidates.append((-score, path, size))
    candidates.sort()
    if not candidates:
        raise RuntimeError(f"No manageable CSV/JSON/JSONL/Parquet/ZIP file found in {repo}. See the dataset homepage.")
    # Some repos store multiple partitions; select up to 2 representative files.
    return [entry[1] for entry in candidates[:2]]


def download(url, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file() and path.stat().st_size > 0:
        print(f"  SKIP already exists: {path.relative_to(ROOT)}")
        return "existing"
    partial = path.with_name(path.name + ".part")
    try:
        with request(url) as response, partial.open("wb") as f:
            read = 0
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                read += len(chunk)
                if read > MAX_BYTES:
                    raise RuntimeError(f"Stopped large download (>100 MB): {url}")
                f.write(chunk)
        if partial.stat().st_size == 0:
            raise RuntimeError("Downloaded an empty file")
        if partial.suffix.lower() in (".html", ".htm") or partial.open("rb").read(128).lstrip().lower().startswith(b"<!doctype html"):
            raise RuntimeError("Server returned an HTML page, not the dataset")
        os.replace(partial, path)
        print(f"  OK {path.relative_to(ROOT)} ({read / (1024*1024):.1f} MiB)")
        return "downloaded"
    finally:
        if partial.exists():
            partial.unlink()


def main():
    p = argparse.ArgumentParser(description="Download public hotel-concierge example datasets")
    group = p.add_mutually_exclusive_group()
    group.add_argument("--all", action="store_true", help="Get all 12 sources; may need several hundred MB")
    group.add_argument("--only", nargs="+", choices=sorted(DATASETS), help="Choose dataset keys")
    group.add_argument("--list", action="store_true", help="List datasets and exit")
    p.add_argument("--dry-run", action="store_true", help="Show source URLs without downloading; auto-discovery only runs during actual download")
    args = p.parse_args()
    if args.list:
        for key, value in DATASETS.items():
            print(f"{key:24} {value['role']:34} {value.get('repo', value.get('url'))}")
        return 0
    selected = list(DATASETS) if args.all else args.only or ["hospitality", "meridian", "customer_support"]
    failures = []
    for key in selected:
        obj = DATASETS[key]
        print(f"\n[{key}] {obj['role']}; license: {obj['license']}")
        try:
            if "repo" in obj:
                if obj.get("auto") and args.dry_run:
                    print(f"  Discover data filenames from https://huggingface.co/datasets/{obj['repo']}/tree/main at download time")
                    continue
                paths = [obj["file"]] if not obj.get("auto") else discover(obj["repo"])
                pairs = [(path, resolve_url(obj["repo"], path)) for path in paths]
            else:
                pairs = [(obj["file"], obj["url"])]
            for remote_path, url in pairs:
                target = DEST / key / Path(remote_path).name
                if args.dry_run:
                    print(f"  {url} -> {target.relative_to(ROOT)}")
                else:
                    download(url, target)
            if not args.dry_run:
                (DEST / key / "SOURCE.json").write_text(json.dumps({"dataset": key, "homepage": f"https://huggingface.co/datasets/{obj['repo']}" if "repo" in obj else obj['url'], "license": obj["license"], "purpose": obj['role'], "retrieved_utc": datetime.now(timezone.utc).isoformat(), "filenames": [Path(a).name for a, _ in pairs]}, indent=2), encoding="utf-8")
        except (RuntimeError, ValueError, OSError, urllib.error.URLError, json.JSONDecodeError) as exc:
            print(f"  ERROR {type(exc).__name__}: {exc}")
            failures.append(key)
    print("\nIMPORTANT: All external datasets are examples or testing material, NOT verified Gator Go hotel facts.")
    if failures:
        print("Failed datasets:", ", ".join(failures))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
