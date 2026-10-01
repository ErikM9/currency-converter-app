import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatConversionResult, formatSameCurrencyResult } from '../../src/scripts.js';

describe('formatConversionResult', () => {
  it('reads as a sentence with both currencies and the rate date', () => {
    assert.equal(
      formatConversionResult(100, 'USD', 92.5678, 'EUR', '2024-01-15'),
      '100 USD = 92.57 EUR (as of 2024-01-15)'
    );
  });

  it('rounds up at the halfway point', () => {
    assert.equal(formatConversionResult(1, 'USD', 0.9999, 'EUR', '2024-01-15'), '1 USD = 1.00 EUR (as of 2024-01-15)');
  });

  it('pads a whole number to two decimals', () => {
    assert.equal(formatConversionResult(2, 'USD', 3, 'PLN', '2024-01-15'), '2 USD = 3.00 PLN (as of 2024-01-15)');
  });

  it('shows a tiny conversion as 0.00 rather than hiding it', () => {
    assert.equal(formatConversionResult(1, 'USD', 0.001, 'JPY', '2024-01-15'), '1 USD = 0.00 JPY (as of 2024-01-15)');
  });

  it('keeps the amount exactly as it was typed', () => {
    assert.equal(formatConversionResult(2.5, 'GBP', 3.125, 'USD', '2024-01-15'), '2.5 GBP = 3.13 USD (as of 2024-01-15)');
  });
});

describe('formatSameCurrencyResult', () => {
  it('repeats the amount on both sides', () => {
    assert.equal(formatSameCurrencyResult(100, 'USD'), '100 USD = 100 USD');
  });

  it('keeps decimals untouched', () => {
    assert.equal(formatSameCurrencyResult(99.5, 'EUR'), '99.5 EUR = 99.5 EUR');
  });
});