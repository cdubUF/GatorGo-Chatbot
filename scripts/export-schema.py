import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.app.config import ROOT  # noqa: E402
from backend.app.schemas import KnowledgeRecord  # noqa: E402

schema = {"$schema": "https://json-schema.org/draft/2020-12/schema", "type": "array",
          "items": KnowledgeRecord.model_json_schema()}
(ROOT / "knowledge/schema.json").write_text(json.dumps(schema, indent=2) + "\n", "utf-8")
