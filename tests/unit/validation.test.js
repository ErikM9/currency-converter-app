import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidAmount,
  isAmountTooLarge,
  isSameCurrency,
  validateConversionInputs
} from '../../src/scripts.js';

describe('isValidAmount', () => {
  for (const amount of [1, 100, 0.5, 0.0001, 1e14]) {
    it(`accepts ${amount}`, () => assert.equal(isValidAmount(amount), true));
  }

  for (const amount of [0, -1, -0.5, NaN]) {
    it(`rejects ${amount}`, () => assert.equal(isValidAmount(amount), false));
  }

  for (const amount of ['100', null, undefined, {}, []]) {
    it(`rejects the non-number ${JSON.stringify(amount)}`, () => assert.equal(isValidAmount(amount), false));
  }
});

describe('isAmountTooLarge', () => {
  /* One quadrillion is the cut-off, so the two values either side of it are the interesting ones */
  it('treats the cut-off itself as too large', () => assert.equal(isAmountTooLarge(1e15), true));
  it('accepts the largest value below the cut-off', () => assert.equal(isAmountTooLarge(999999999999999), false));
  it('treats infinity as too large', () => assert.equal(isAmountTooLarge(Infinity), true));
});

describe('isSameCurrency', () => {
  it('matches identical codes', () => assert.equal(isSameCurrency('USD', 'USD'), true));
  it('separates different codes', () => assert.equal(isSameCurrency('USD', 'EUR'), false));
  it('is case sensitive, as currency codes are always upper case', () => assert.equal(isSameCurrency('USD', 'usd'), false));
});

describe('validateConversionInputs', () => {
  it('passes well-formed inputs', () => {
    assert.deepEqual(validateConversionInputs(100, 'USD', 'EUR'), { valid: true });
  });

  it('reports an unusable amount before anything else', () => {
    assert.deepEqual(validateConversionInputs(0, 'USD', 'USD'), {
      valid: false,
      error: 'Please enter a valid amount.'
    });
  });

  it('reports an amount that is too large', () => {
    assert.deepEqual(validateConversionInputs(1e15, 'USD', 'EUR'), {
      valid: false,
      error: 'Try smaller numbers.'
    });
  });

  for (const [from, to] of [[null, 'EUR'], ['USD', null], ['', 'EUR'], ['USD', '']]) {
    it(`reports missing currencies for ${JSON.stringify([from, to])}`, () => {
      assert.equal(validateConversionInputs(100, from, to).error, 'Please select currencies.');
    });
  }

  it('flags a same-currency conversion and supplies the answer', () => {
    assert.deepEqual(validateConversionInputs(100, 'USD', 'USD'), {
      valid: false,
      error: 'same_currency',
      result: '100 USD = 100 USD'
    });
  });
});