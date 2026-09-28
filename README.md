# ScamWise LK

A Sri Lankan scam-awareness expert system with 26 facts, 31 source-mapped rules, and forward and backward chaining in Prolog.


## Run locally

1. Extract the entire ZIP.
2. Install Node.js 22 or newer from https://nodejs.org/en/download.
3. On Windows, double-click **start-windows.bat** and keep the command window open.
4. Open **http://localhost:8080** in a browser.
5. To stop the server, press **Ctrl+C** in the command window.

On macOS or Linux, open a terminal in the extracted project folder and run:

```sh
npm start
```

Do not open `dist/index.html` directly. No `npm install`, database, API key or separate Prolog installation is required to run the app. Tau Prolog 0.3.4 is bundled. Assessment works offline after installation; external source and reporting links require Internet access.

## Use the system

- **Check a situation:** questions start with no option selected. Answer Yes, No or Not sure, or select a sample. Answer all 30 questions across the four sections before checking. Not sure counts as an answer but remains unknown evidence. The check button stays disabled while any question is unanswered; use “Go to unanswered question” to find one. Samples fill only their stated answers, so complete the remaining questions yourself.
- **Forward chaining:** choose “Assess all signs”, then “Check my situation”. The OTP-caller sample produces R01, R05 and R06, including bank-contact guidance.
- **Backward chaining:** choose “Check a suspicion”, select a goal, then run it. The prize-fee sample supports the prize warning through R07.
- **Explanations:** open the applied rules or proof tree to inspect the evidence and source.
- **Get help:** follow the official reporting links. The app does not submit a report.
- **Reset:** clears the case and all selections, and disables checking until every question has an answer. Unanswered questions remain unknown; no match does not establish safety.

Answers remain in page memory. The app does not collect names, account numbers or secret codes.

## Troubleshooting

| Problem | Solution |
| --- | --- |
| `node` is not recognised | Install Node.js and reopen the terminal. |
| Browser cannot connect | Keep the server running and use `http://localhost:8080`. |
| Port 8080 is occupied | Stop the other copy, or set `PORT=8081` before starting and open `http://localhost:8081`. |
| Knowledge or engine fails to load | Extract all folders, including `dist/vendor` and `dist/prolog`; run through the server instead of a file URL. |

## Run the tests

```sh
npm test
```

Expected: **48/48 reasoning tests pass; 31/31 rules exercised.** Results are written to `docs/test-results.json`.

Optional UI tests use a development-only dependency:

```sh
npm install --no-save jsdom@26
npm run test:ui
```

Expected: **18/18 simulated DOM tests pass.** Results are written to `docs/ui-test-results.json`. These do not claim native-browser visual verification.

## Main files

| File | Purpose |
| --- | --- |
| `dist/index.html`, `dist/styles.css`, `dist/app.js` | Interface |
| `dist/prolog/knowledge.pl` | Executable domain facts and rules |
| `dist/prolog/engine.pl` | Forward and backward inference algorithms |
| `dist/prolog-client.js` | Validated interface-to-Prolog bridge |
| `dist/knowledge.json` | Labels, questions, source references and rule descriptions |
| `scripts/build-knowledge.cjs` | Editable knowledge catalogue |
| `scripts/serve.cjs` | Local static-file server |
| `tests/run.cjs`, `tests/ui.cjs` | Automated test suites |


Knowledge originates in nine official CBSL, Sri Lanka CERT and Sri Lanka Police documents, reviewed on 27 September 2026.

Tau Prolog's BSD 3-Clause licence is included in `dist/vendor/TAU-LICENSE.txt`; see `THIRD_PARTY_NOTICES.md`.
