# Verification evidence

Local environment: Windows, Python 3.11, Node 24, Chromium via Playwright. Mock-mode checks passed. On November 2, 2026, a live OpenAI smoke test and check-in question succeeded; the answer cited and labeled unverified sample information. An earlier attempt had returned HTTP 429.

| Check | Actual result |
|---|---|
| Backend unit/integration/behavior tests | 82 passed |
| Behavior evaluation | 34/34 synthetic scenarios passed |
| Python static checks | Ruff passed |
| Frontend syntax | Node syntax checks passed |
| Browser interaction checks | 5 passed, including 1440px / 1024px / 390px layouts, retry, reset races, reservation pairing, and keyboard interaction |
| Manual screenshot review | Desktop/mobile views inspected; mobile brand width fixed |
| Data intake | Personal columns omitted from profiles; six unverified drafts isolated from retrieval |
| Knowledge importer | Dry-run, duplicate rejection, CSV import, repeatable snapshot, and no-mutation-on-rejection tested |
| Survey workbook | Weighted mean tested with temporary values (3.40), then cleared; blank result displays Not collected; render inspected |
| Demo video | H.264, yuv420p, 1440×900, 25 fps, under 60 seconds; representative frames inspected |
| Windows startup | `run.bat` and `run-all.sh` via Git Bash started the combined service on test ports; health endpoint returned OK |

The automated tests include session isolation, expiry, reset, limited history, invalid input, body size, origin restrictions, secret-safe errors, staff authorization, consent and decline, idempotent queue submission, simulated disposition, production sample exclusion, unsupported facts, stale/conflicting sources, evidence injection, bounded retries/timeouts, and emergency interruption of both reservation stages.

Known limits: one upstream AnyIO deprecation warning in the test runner; no native macOS/Linux run yet; no screen-reader or true 200% browser-zoom signoff; no comparative live-model performance benchmark; no approved hotel facts; no real survey responses; no teammate PowerPoint playback. The model generates conversational replies from retrieved evidence; source labels and prompts do not guarantee factual accuracy. English keyword routing is an MVP heuristic, not a comprehensive safety system.

Synthetic latency in the attached evaluation JSON is a local test measurement, not a production or model-provider benchmark. Screenshots and video use fictional information only. Remote CI status is shown by the GitHub workflow after publication.
