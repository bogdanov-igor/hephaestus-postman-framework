# CI templates

Ready-to-copy pipelines. Take the one for your platform, change the four
variables at the top, commit it.

| File | Copy to |
|---|---|
| [`github-actions.yml`](github-actions.yml) | `.github/workflows/api-tests.yml` |
| [`gitlab-ci.yml`](gitlab-ci.yml) | `.gitlab-ci.yml` |
| [`Jenkinsfile`](Jenkinsfile) | `Jenkinsfile` |

All three do the same thing, in the same order:

1. **Pre-flight** — `doctor` checks engine integrity, version drift and required
   environment variables *before* the run burns time.
2. **Run** — Newman, exporting `results.json`. Deliberately non-fatal so the
   gates below still report; the assertion failure is re-raised in step 3.
3. **Gates** — each exits `1` on its own terms:
   - `summary --sla=<ms>` — assertions **and** the p95 budget;
   - `compare baseline.json results.json` — an assertion that used to pass now fails;
   - `coverage --spec openapi.yaml <collection> --min <n>` — spec coverage floor.
4. **Report** — self-contained `report.html`, plus `junit.xml` where the platform
   renders it natively.

## The variables to change

| Variable | Meaning |
|---|---|
| `COLLECTION` | path to your exported Postman collection |
| `ENVIRONMENT` | path to the environment file |
| `SLA_MS` | p95 budget in ms; drop the flag to skip the latency gate |
| `COVERAGE_MIN` | minimum % of the OpenAPI spec the collection must cover |

## Notes

- The templates clone this repo to get the CLI (`node .hephaestus/bin/hephaestus.js`).
  Once the package is published the same commands run as `npx hephaestus …` and the
  clone step goes away.
- `--history` appends one line per run to `.hephaestus/history.jsonl`. Keep it as an
  artifact (or commit it) and `hephaestus trends` will render pass-rate and p95
  sparklines across runs; `hephaestus panel` shows the same locally.
- Running the collection several times and passing the results to
  `hephaestus flaky r1.json r2.json r3.json --fail-on-flaky` catches assertions that
  flap — worth a nightly job rather than every push.
- Prose walkthrough and platform-specific details: [`../newman-ci.md`](../newman-ci.md).
