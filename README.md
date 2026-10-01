# Currency Converter

![CI](https://github.com/ErikM9/currency-converter-app/actions/workflows/ci.yml/badge.svg)

Currency converter built on the Frankfurter API, with a keyboard-operable currency picker and a currency list cached in localStorage for a day.

## Run it

```bash
npm install
npm run serve
```

Then open http://localhost:3000.

## Testing

Unit tests with the Node.js test runner, end-to-end tests with WebdriverIO. Node 22 or newer is needed for the coverage thresholds.

```bash
npm test                  # unit tests
npm run test:coverage     # unit tests with coverage (fails below the thresholds)
npm run test:e2e          # e2e tests in Chrome
npm run test:e2e:firefox  # e2e tests in Firefox
npm run test:all          # coverage run followed by the e2e suite
```

The e2e suite serves `src/` on port 3200 itself, so there is no need to start a server first. Screenshots of failures land in `screenshots/`.

### Why these tools?

- **node:test** — Built into Node, and its coverage thresholds need no extra dependency either.
- **jsdom** — Runs the page logic headlessly, so the dropdown, keyboard handling and caching are covered in milliseconds.
- **WebdriverIO** — Drives the real thing in Chrome and Firefox, which is where the custom dropdown, focus behaviour and layout have to work.
- **axe-core** — Automated WCAG 2.1 A and AA scans inside the e2e suite.

### How the API is kept out of the tests

No test depends on an answer from the Frankfurter API:

- Unit tests hand `initConverter` a document of their own, with `fetch` and storage supplied by the test (`tests/support/page.js`).
- E2E tests seed the currency list into localStorage before loading the page, and replace `fetch` in the page for every conversion they make (`tests/e2e/support/conversion-stub.js`). The one conversion the page starts by itself on load can still reach the live service, and the app ignores its answer once anything newer is on screen.
- One opt-in spec does call the live service, to catch the day its response shape changes: `RUN_LIVE_API=1 npm run test:e2e`.

### What's tested

**Unit (119 tests, 99% of lines)**
- Amount validation and the limits either side of the cut-off
- Result formatting, rounding and the same-currency answer
- Cache expiry, parsing, writing, and storage that is blocked or full
- Debounce timing
- Loading the currency list: from the API, from the cache, expired, empty, and failing
- The dropdown by mouse and keyboard, including aria state and focus
- Conversion: results, validation messages, one request per burst of typing, stale answers that arrive after a newer amount or a validation message, and failures
- The custom scrollbar, including the drag that must not close the dropdown and a drag that follows the pointer when the converter is zoomed

**E2E (44 specs in Chrome and Firefox, plus the opt-in live check)**
- Page load, dropdown behaviour, swapping
- Keyboard control of the dropdown and its focus ring
- Conversion results, debounce, stale answers, failures, and a loading line that leaves the panel's height unchanged
- Validation messages
- Accessibility: axe scans on load and with a dropdown open, listbox semantics, expanded state
- Responsive layout at phone and tablet sizes

## CI

GitHub Actions runs the unit tests with coverage, and the e2e suite in Chrome and Firefox, on every push and pull request.