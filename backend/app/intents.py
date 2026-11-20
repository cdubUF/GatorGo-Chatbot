"""Small deterministic question planner; policy always runs on the full utterance first."""
import re


def questions(message):
    parts = re.split(r'(?<=[?;])\s+|\s+(?:and|also|plus)\s+(?=(?:is|are|what|where|when|does|can|do|how|tell|which|somewhere|anywhere|costs?|fees?|prices?|availability)\b)', message, flags=re.I)
    parts = [re.sub(r'^(?:and|also|plus)\s+', '', p.strip(), flags=re.I) for p in parts if p.strip()]
    return parts[:4] if len(parts) <= 4 else [message]
