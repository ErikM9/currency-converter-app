# Currency Converter

![CI](https://github.com/ErikM9/currency-converter-app/actions/workflows/ci.yml/badge.svg)

Real-time currency converter using the Frankfurter API. Caches currency list in localStorage.

## Run it

```bash
npm install
npm run serve
```

## Testing

Unit tests with Node.js built-in test runner, E2E tests with WebdriverIO.

```bash
npm test           # unit tests
npm run test:e2e   # e2e tests (needs npm run serve first)
```

### Why these tools?

- **node:test** — Built into Node.js, no extra dependencies. The pure-function logic (validation, formatting, caching) doesn't need a heavier test framework.
- **WebdriverIO** — Running via DevTools/CDP, it handles the custom dropdown components well: clicking to open, selecting items, and verifying state across the UI.

### What's tested

**Unit (25 tests)**
- Amount validation
- Currency formatting
- Cache handling (expiry, parsing, creation)
- URL building
- API response parsing
- Conversion input validation

**E2E (36 specs)**
- Page load and defaults
- Custom dropdown behavior
- Currency swap
- Amount input handling
- Same currency conversion
- Loading state
- Conversion display
- Responsive design
- Accessibility (labels, aria roles, aria-live, aria-haspopup)
- Error handling

## CI

GitHub Actions runs both test suites on push.