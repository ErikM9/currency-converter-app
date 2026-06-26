import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  isValidAmount,
  isAmountTooLarge,
  isSameCurrency,
  formatConversionResult,
  formatSameCurrencyResult,
  isCacheValid,
  parseCachedData,
  createCacheEntry,
  extractConversionRate,
  validateConversionInputs,
  CACHE_EXPIRY,
} from '../../src/scripts.js';

describe('isValidAmount', () => {
  test('accepts positive integers and decimals', () => {
    assert.strictEqual(isValidAmount(1), true);
    assert.strictEqual(isValidAmount(100), true);
    assert.strictEqual(isValidAmount(0.5), true);
  });

  test('rejects zero, negatives, and NaN', () => {
    assert.strictEqual(isValidAmount(0), false);
    assert.strictEqual(isValidAmount(-1), false);
    assert.strictEqual(isValidAmount(NaN), false);
  });

  test('rejects non-number types', () => {
    assert.strictEqual(isValidAmount('100'), false);
    assert.strictEqual(isValidAmount(null), false);
    assert.strictEqual(isValidAmount(undefined), false);
  });
});

describe('isAmountTooLarge', () => {
  test('returns true at and above 1e15', () => {
    assert.strictEqual(isAmountTooLarge(1e15), true);
    assert.strictEqual(isAmountTooLarge(1e16), true);
  });

  test('returns false below 1e15', () => {
    assert.strictEqual(isAmountTooLarge(1e14), false);
    assert.strictEqual(isAmountTooLarge(999999999999999), false);
  });
});

describe('isSameCurrency', () => {
  test('returns true for identical codes', () => {
    assert.strictEqual(isSameCurrency('USD', 'USD'), true);
    assert.strictEqual(isSameCurrency('EUR', 'EUR'), true);
  });

  test('returns false for different codes', () => {
    assert.strictEqual(isSameCurrency('USD', 'EUR'), false);
    assert.strictEqual(isSameCurrency('GBP', 'JPY'), false);
  });
});

describe('formatConversionResult', () => {
  test('formats to two decimal places with date', () => {
    assert.strictEqual(
      formatConversionResult(100, 'USD', 92.5678, 'EUR', '2024-01-15'),
      '100 USD = 92.57 EUR (as of 2024-01-15)'
    );
  });

  test('rounds correctly at boundary', () => {
    assert.strictEqual(
      formatConversionResult(1, 'USD', 0.9999, 'EUR', '2024-01-15'),
      '1 USD = 1.00 EUR (as of 2024-01-15)'
    );
  });

  test('small rates round to 0.00', () => {
    assert.strictEqual(
      formatConversionResult(1, 'USD', 0.001, 'JPY', '2024-01-15'),
      '1 USD = 0.00 JPY (as of 2024-01-15)'
    );
  });
});

describe('formatSameCurrencyResult', () => {
  test('produces symmetrical string', () => {
    assert.strictEqual(formatSameCurrencyResult(100, 'USD'), '100 USD = 100 USD');
    assert.strictEqual(formatSameCurrencyResult(99.5, 'EUR'), '99.5 EUR = 99.5 EUR');
  });
});

describe('isCacheValid', () => {
  test('accepts a recent timestamp', () => {
    assert.strictEqual(isCacheValid(Date.now() - 1000), true);
  });

  test('rejects an expired timestamp', () => {
    assert.strictEqual(isCacheValid(Date.now() - CACHE_EXPIRY - 1000), false);
  });

  test('respects a custom expiry', () => {
    const ts = Date.now() - 5000;
    assert.strictEqual(isCacheValid(ts, 10000), true);
    assert.strictEqual(isCacheValid(ts, 1000), false);
  });
});

describe('parseCachedData', () => {
  test('returns data from a fresh cache entry', () => {
    const cached = JSON.stringify({ data: ['USD', 'EUR'], timestamp: Date.now() });
    assert.deepStrictEqual(parseCachedData(cached), ['USD', 'EUR']);
  });

  test('returns null for expired cache', () => {
    const expired = JSON.stringify({ data: ['USD'], timestamp: Date.now() - CACHE_EXPIRY - 1000 });
    assert.strictEqual(parseCachedData(expired), null);
  });

  test('returns null for null, empty string, or invalid JSON', () => {
    assert.strictEqual(parseCachedData(null), null);
    assert.strictEqual(parseCachedData(''), null);
    assert.strictEqual(parseCachedData('not json'), null);
  });
});

describe('createCacheEntry', () => {
  test('serialises data with a current timestamp', () => {
    const before = Date.now();
    const entry = createCacheEntry(['USD', 'EUR', 'GBP']);
    const parsed = JSON.parse(entry);
    assert.deepStrictEqual(parsed.data, ['USD', 'EUR', 'GBP']);
    assert.ok(parsed.timestamp >= before && parsed.timestamp <= Date.now());
  });
});

describe('extractConversionRate', () => {
  test('extracts the correct rate', () => {
    assert.strictEqual(extractConversionRate({ rates: { EUR: 0.92, GBP: 0.79 } }, 'EUR'), 0.92);
  });

  test('returns null for missing currency, missing rates, or null data', () => {
    assert.strictEqual(extractConversionRate({ rates: { EUR: 0.92 } }, 'GBP'), null);
    assert.strictEqual(extractConversionRate({}, 'EUR'), null);
    assert.strictEqual(extractConversionRate(null, 'EUR'), null);
  });
});

describe('validateConversionInputs', () => {
  test('returns valid for well-formed inputs', () => {
    assert.strictEqual(validateConversionInputs(100, 'USD', 'EUR').valid, true);
  });

  test('rejects invalid amount', () => {
    const r = validateConversionInputs(0, 'USD', 'EUR');
    assert.strictEqual(r.valid, false);
    assert.strictEqual(r.error, 'Please enter a valid amount.');
  });

  test('rejects amount that is too large', () => {
    const r = validateConversionInputs(1e15, 'USD', 'EUR');
    assert.strictEqual(r.valid, false);
    assert.strictEqual(r.error, 'Try smaller numbers.');
  });

  test('rejects missing currencies', () => {
    assert.strictEqual(validateConversionInputs(100, null, 'EUR').error, 'Please select currencies.');
    assert.strictEqual(validateConversionInputs(100, 'USD', null).error, 'Please select currencies.');
  });

  test('returns same_currency with formatted result for matching currencies', () => {
    const r = validateConversionInputs(100, 'USD', 'USD');
    assert.strictEqual(r.valid, false);
    assert.strictEqual(r.error, 'same_currency');
    assert.strictEqual(r.result, '100 USD = 100 USD');
  });
});