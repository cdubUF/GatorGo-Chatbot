# Downloaded conversation datasets

The existing `scripts/download_datasets.py` was used to fetch three relevant sources under ignored `data/external/`. Re-run:

```text
python scripts/download_datasets.py --only hospitality customer_support multiwoz
```

| Dataset | Downloaded material | Intended use |
|---|---|---|
| [Bitext Hospitality](https://huggingface.co/datasets/bitext/Bitext-hospitality-llm-chatbot-training-dataset) | 25,000 CSV examples; approximately 15.4 MiB | Guest-question phrasing, hotel-service intents, paraphrase coverage |
| [Bitext Customer Support](https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset) | 26,872 CSV examples; approximately 18.3 MiB | Complaint, refund-request, contact, and escalation language |
| [ConvLab MultiWOZ 2.1](https://huggingface.co/datasets/ConvLab/multiwoz21) | Actual `data.zip` dialogue archive; approximately 12.3 MiB | Multi-turn hotel/travel task context and follow-up evaluation |

The Bitext dataset cards label their license CDLA-Sharing-1.0; the ConvLab card labels Apache-2.0. Source URLs, download timestamps, exact byte sizes, SHA-256 hashes, and available aggregate counts are recorded in `knowledge/external-dataset-catalog.json`. Keep upstream attribution/license material with any redistributed derivative. Raw downloads stay out of Git.

The downloader originally selected MultiWOZ's `dummy_data.json` and `shuffled_dial_ids.json` via filename ranking. The entry now explicitly downloads `data.zip`, so repeat runs fetch the actual conversations. The incidental metadata files can remain in ignored local storage; the catalog identifies the intended artifact.

Use these as language and test material only. Their assistant responses may assume actions, account portals, phone numbers, or operational abilities this prototype does not have. Do not add their responses to approved hotel knowledge, claim they describe Gator Go, or train the bot to promise their actions. Any future sampled evaluation should annotate expected Gator Go routing and action limits independently. No model training or automatic guest-facing import has been performed.
