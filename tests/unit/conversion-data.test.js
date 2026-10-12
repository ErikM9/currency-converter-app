import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractConversionRate } from '../../src/scripts.js';

describe('extractConversionRate', () => {
  it('picks the requested currency out of the rates', () => {
    assert.equal(extractConversionRate({ rates: { EUR: 0.92, GBP: 0.79 } }, 'EUR'), 0.92);
  });

  /* A genuine zero has to survive, since ?? and || behave differently here */
  it('keeps a rate of zero', () => {
    assert.equal(extractConversionRate({ rates: { EUR: 0 } }, 'EUR'), 0);
  });

  for (const [label, data, currency] of [
    ['the currency is missing from the rates', { rates: { EUR: 0.92 } }, 'GBP'],
    ['the payload has no rates', {}, 'EUR'],
    ['the payload is null', null, 'EUR'],
    ['the payload is undefined', undefined, 'EUR'],
    ['the rate itself is null', { rates: { EUR: null } }, 'EUR']
  ]) {
    it(`returns nothing when ${label}`, () => assert.equal(extractConversionRate(data, currency), null));
  }
});