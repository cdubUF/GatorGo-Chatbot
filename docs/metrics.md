# Measurement methodology

Run `python scripts/evaluate.py` using the project interpreter. The script writes `artifacts/evaluation.json` and exits nonzero on any failed scenario. Inputs are 34 synthetic conversations in `tests/scenarios.json`; no guest survey or live model evidence is implied. Ticket 35's listed dependency on itself is a backlog typo; this implementation uses ticket 34 as the prerequisite.

| Metric | Definition and denominator |
|---|---|
| Selected-source accuracy | Factual scenarios whose returned source IDs match their annotated IDs / factual scenarios |
| Grounded-answer rate | Factual responses whose IDs and rendered answers come from eligible records / factual responses |
| Unknown handling | Unsupported scenarios with no source and appropriate uncertainty / unsupported scenarios |
| Escalation recall | Annotated human scenarios routed human / annotated human scenarios |
| Task completion | Scripted tasks satisfying all expected assertions / scripted tasks |
| Response latency | Measured elapsed request time per turn; report environment, mean and distribution separately from live latency |
| Action honesty | Scenarios without unsupported booking/refund/notification claims / scenarios |

The automated rubric also checks specified acknowledgement wording and clarity snippets. A wording check is not a human empathy score. Review each failed scenario; the report assigns Chris as follow-up owner for triage. Human reviewers should score factual correctness, empathy, clarity, and action honesty from 1–5 against the original instructor rubric; attach notes and approval separately.

Runtime `/api/staff/metrics` exposes aggregate counts only to the configured demo operator. Metrics reset with the process. Do not mix synthetic test results with observed user performance or report demo latency as hosted-model latency.
