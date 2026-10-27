# Currency Converter

![CI](https://github.com/ErikM9/currency-converter-app/actions/workflows/ci.yml/badge.svg)

A currency converter which gets its exchange rates from the Frankfurter API. The currencies are chosen from a custom dropdown which also works from the keyboard, and the currency list is cached in localStorage for a day.

**Live demo:** [erikm9.github.io/currency-converter-app](https://erikm9.github.io/currency-converter-app/)

## Run it

```bash
npm install
npm run serve
```

Then open http://localhost:3000.

## Testing

I used the Node.js test runner for the unit tests and WebdriverIO for the end-to-end tests. jsdom 30 asks for Node 22.22.2 or newer, and 24.15 or newer on Node 24.

```bash
npm test                  # unit tests
npm run test:coverage     # unit tests with coverage (fails below the thresholds)
npm run test:e2e          # e2e tests in Chrome
npm run test:e2e:firefox  # e2e tests in Firefox
npm run test:all          # coverage run followed by the e2e suite
```

The e2e suite serves `src/` on port 3200 by itself, so you don't need to start a server first. Screenshots of failed tests end up in `screenshots/`.

### Why these tools?

I chose the testing tools for my smaller projects so I could learn how various testing tools work, and the test runner and e2e tool here aren't used in any of the others. For the Currency Converter I went with node:test, jsdom, WebdriverIO and axe-core.

- node:test is built into Node, and so are `node:assert`, its mock timers and its coverage thresholds, so the unit tests need no test framework at all. The mock timers let the debounce tests check the moment just before and just after the delay runs out.
- jsdom runs the page logic without a browser, so the dropdown, the keyboard handling and the caching are covered in milliseconds.
- WebdriverIO runs the same specs in Chrome and Firefox, the real browsers where the custom dropdown, the focus behaviour and the layout have to work, with one config shared between them. It drives Chrome over the DevTools protocol, which needs no chromedriver download, and its `expect` matchers keep retrying until the page catches up, so the specs need no fixed pauses.
- axe-core runs automated WCAG 2.1 A and AA scans inside the e2e suite, on load and with a dropdown open.

### How the API is kept out of the tests

No test in a normal run depends on an answer from the Frankfurter API:

- The unit tests hand `initConverter` a document of their own, with `fetch` and the storage supplied by the test (`tests/support/page.js`).
- The e2e tests put the currency list into localStorage before the app loads and then replace `fetch` in the page, so every conversion they make is answered by the test (`tests/e2e/support/conversion-stub.js`). The one conversion the page starts by itself on load can still reach the live service, but the app ignores its answer once anything newer is on screen.
- One opt-in test does call the live service, so I would notice if the shape of a conversion response ever changed: `RUN_LIVE_API=1 npm run test:e2e`.

### What's tested

**Unit (124 tests, 99% of lines)**
- Amount validation and the limits either side of the cut-off
- Result formatting, rounding and the same-currency answer
- The cache: expiry, parsing, writing and storage which is blocked or full
- Debounce timing
- Loading the currency list: from the API, from the cache, expired, empty, refused and failing
- The dropdown by mouse and keyboard, including its aria state and focus
- Conversion: results, validation messages, one request per burst of typing, stale answers which arrive after a newer amount or a validation message, failures and the hidden stand-in which keeps the result's place while loading
- The custom scrollbar, including a drag which must not close the dropdown and a drag which follows the pointer when the converter is zoomed

**End-to-end (48 tests in Chrome and Firefox, plus the opt-in live check)**
- Page load, the dropdown and swapping the currencies
- Keyboard control of the dropdown and its focus ring
- The dropdown's own scrollbar with a list too long to show at once
- Conversion results, debounce, stale answers, failures and a loading line which leaves the height of the panel unchanged
- Validation messages
- Accessibility: axe scans on load and with a dropdown open, listbox semantics and the expanded state
- Responsive layout at phone and tablet sizes

## CI

GitHub Actions runs the unit tests with coverage and the e2e suite in Chrome and Firefox on every push and pull request to `main`. A push to `main` which passes them is then deployed to GitHub Pages, straight from `src/`.