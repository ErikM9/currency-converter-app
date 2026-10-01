import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, createApi } from '../support/page.js';
import { createCacheEntry, CACHE_EXPIRY } from '../../src/scripts.js';

describe('loading the currency list', () => {
  it('asks the API once and fills both dropdowns', async () => {
    const page = await loadPage({ api: createApi({ currencies: ['USD', 'EUR', 'GBP'] }) });

    assert.deepEqual(page.from.codes(), ['USD', 'EUR', 'GBP']);
    assert.deepEqual(page.to.codes(), ['USD', 'EUR', 'GBP']);
    assert.equal(page.api.currencyCalls().length, 1);
  });

  it('starts on USD to EUR with those entries marked in the lists', async () => {
    const page = await loadPage();

    assert.equal(page.from.value(), 'USD');
    assert.equal(page.to.value(), 'EUR');
    assert.equal(page.from.selectedOption().dataset.value, 'USD');
    assert.equal(page.to.selectedOption().dataset.value, 'EUR');
  });

  it('keeps the list in storage for next time', async () => {
    const page = await loadPage({ api: createApi({ currencies: ['USD', 'EUR'] }) });

    assert.deepEqual(JSON.parse(page.storage.getItem('currencies_cache')).data, ['USD', 'EUR']);
  });

  it('uses a stored list instead of calling the API again', async () => {
    const api = createApi();

    const page = await loadPage({ cache: createCacheEntry(['USD', 'EUR', 'CHF']), api });

    assert.deepEqual(page.from.codes(), ['USD', 'EUR', 'CHF']);
    assert.deepEqual(api.currencyCalls(), []);
  });

  it('fetches a fresh list once the stored one has expired', async () => {
    const expired = JSON.stringify({ data: ['USD', 'OLD'], timestamp: Date.now() - CACHE_EXPIRY - 1000 });

    const page = await loadPage({ cache: expired, api: createApi({ currencies: ['USD', 'EUR'] }) });

    assert.deepEqual(page.from.codes(), ['USD', 'EUR']);
    assert.equal(page.api.currencyCalls().length, 1);
  });

  it('still loads when storage is blocked, as it is when cookies are turned off', async () => {
    const page = await loadPage({ storage: 'blocked', api: createApi({ currencies: ['USD', 'EUR'] }) });

    assert.deepEqual(page.from.codes(), ['USD', 'EUR']);
    assert.match(page.result(), /^1 USD = /);
  });

  it('treats an empty currency list as a failed load', async () => {
    const page = await loadPage({ api: createApi({ currencies: [] }) });

    assert.equal(page.result(), 'Failed to load currencies. Please try again later.');
    assert.deepEqual(page.from.codes(), []);
  });

  it('says so when the currency list cannot be loaded', async () => {
    const page = await loadPage({ api: createApi({ failCurrencies: true }) });

    assert.equal(page.result(), 'Failed to load currencies. Please try again later.');
    assert.equal(page.loadingShown(), false);
  });

  it('converts the default amount as soon as the page is ready', async () => {
    const page = await loadPage({ api: createApi({ rate: 0.9, date: '2026-09-22' }) });

    assert.equal(page.result(), '1 USD = 0.90 EUR (as of 2026-09-22)');
    assert.equal(page.loadingShown(), false);
  });
});