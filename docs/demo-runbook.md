# Reproducible offline demonstration

Install dependencies with the launcher while online once. Keep `.venv`, the repository, and a browser on the presentation laptop. Set `MODEL_PROVIDER=mock` and `DEMO_MODE=true`; no API key or internet is needed during the presentation. Set `STAFF_TOKEN` only if demonstrating the operator queue. Keep the `.env` out of recordings and shared archives.

Before presenting, start the launcher, open the displayed URL, ask a spa question, report a dirty room, and try DEMO-2048/Parker. Confirm that sample-data and no-notification disclosures are visible. Test New conversation. If the port is occupied, change `PORT` in `.env`. If knowledge fails validation, run the importer in dry-run mode. If the API is down, the interface offers retry and direct-contact guidance instead of pretending the model responded.

Reset by choosing New conversation. To clear all demo sessions, queued summaries, and aggregate metrics, stop the server with Ctrl+C and restart. Do not publish this loopback prototype as a public guest service. An offline handoff remains a summary to show a human directly.

For recording, run `npm ci` and `npx playwright install chromium` once, start the server, then run `node scripts/record-demo.mjs`. The generated WebM is a source recording. Install the optional `requirements-video.txt` and run `python scripts/convert-demo.py` to export H.264 MP4 and verify duration/codec. The delivered silent screen recording is 58.92 seconds at 1440×900. Narration can follow the storyboard. Team acceptance still requires playback in the intended PowerPoint on another device.
