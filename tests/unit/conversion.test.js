import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, createApi, settle } from '../support/page.js';

/* The amount field is debounced, so tests push the clock past the wait and let the request settle */
const typeAmount = async (t, page, value) => {
  page.typeAmount(value);
  t.mock.timers.tick(250);
  await settle();
};

describe('converting an amount', () => {
  it('shows the converted amount with the date of the rate', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const page = await loadPage({ api: createApi({ rate: 0.92, date: '2026-09-22' }) });

    await typeAmount(t, page, '250');

    assert.equal(page.result(), '250 USD = 230.00 EUR (as of 2026-09-22)');
    assert.match(page.api.conversions().at(-1), /amount=250&from=USD&to=EUR/);
  });

  it('sends one request for a burst of typing', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const page = await loadPage();
    const before = page.api.conversions().length;

    page.typeAmount('2');
    page.typeAmount('25');
    page.typeAmount('250');
    t.mock.timers.tick(250);
    await settle();

    assert.equal(page.api.conversions().length - before, 1);
    assert.match(page.api.conversions().at(-1), /amount=250/);
  });

  it('ignores a slow conversion that a newer one has replaced', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const page = await loadPage({ api: createApi({ rate: 1 }) });

    page.api.holdNextConversion();
    await typeAmount(t, page, '5');
    await typeAmount(t, page, '900');
    page.api.releaseConversion();
    await settle();

    assert.equal(page.result(), '900 USD = 900.00 EUR (as of 2026-09-22)');
  });

  /* A message about the amount must outlive any answer that was already on its way for the previous amount */
  for (const [label, act, message] of [
    ['a validation message', (page) => page.typeAmount(''), 'Please enter a valid amount.'],
    ['a same-currency answer', (page) => page.click(page.to.option('USD')), '1000 USD = 1000 USD']
  ]) {
    it(`keeps ${label} on screen when a slow earlier conversion finally answers`, async (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      const page = await loadPage({ api: createApi({ rate: 0.9 }) });

      page.api.holdNextConversion();
      await typeAmount(t, page, '1000');
      assert.equal(page.loadingShown(), true);

      act(page);
      t.mock.timers.tick(250);
      await settle();
      assert.equal(page.result(), message);
      assert.equal(page.loadingShown(), false);

      page.api.releaseConversion();
      await settle();

      assert.equal(page.result(), message);
      assert.equal(page.loadingShown(), false);
    });
  }

  it('answers a same-currency conversion without asking the API', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const page = await loadPage();
    const before = page.api.conversions().length;

    page.click(page.to.combobox);
    page.click(page.to.option('USD'));
    await settle();

    assert.equal(page.result(), '1 USD = 1 USD');
    assert.equal(page.api.conversions().length, before);
  });

  for (const [label, value, message] of [
    ['zero', '0', 'Please enter a valid amount.'],
    ['a negative amount', '-5', 'Please enter a valid amount.'],
    ['an empty field', '', 'Please enter a valid amount.'],
    ['an amount beyond the limit', '1000000000000000', 'Try smaller numbers.']
  ]) {
    it(`explains ${label} without calling the API`, async (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      const page = await loadPage();
      const before = page.api.conversions().length;

      await typeAmount(t, page, value);

      assert.equal(page.result(), message);
      assert.equal(page.api.conversions().length, before);
    });
  }

  for (const [label, api] of [
    ['the service answers with an error', createApi({ latestStatus: 500 })],
    ['the rate is missing from the answer', createApi({ missingRate: true })]
  ]) {
    it(`says the conversion failed when ${label}`, async (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      const page = await loadPage({ api });

      await typeAmount(t, page, '25');

      assert.equal(page.result(), 'Conversion failed. Please try again later.');
      assert.equal(page.loadingShown(), false);
    });
  }

  it('shows the loading line while the answer is outstanding', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const page = await loadPage();

    page.api.holdNextConversion();
    page.typeAmount('42');
    t.mock.timers.tick(250);
    await settle();
    assert.equal(page.loadingShown(), true);

    page.api.releaseConversion();
    await settle();
    assert.equal(page.loadingShown(), false);
  });
});