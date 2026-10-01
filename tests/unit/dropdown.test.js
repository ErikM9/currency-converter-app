import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, createApi, settle } from '../support/page.js';

describe('currency dropdown', () => {
  let page;

  beforeEach(async () => {
    page = await loadPage({ api: createApi({ currencies: ['USD', 'EUR', 'GBP', 'JPY'] }) });
  });

  describe('with the mouse', () => {
    it('opens on click and reports itself as expanded', () => {
      page.click(page.from.combobox);

      assert.equal(page.from.isOpen(), true);
      assert.equal(page.from.expanded(), 'true');
    });

    it('closes again on a second click', () => {
      page.click(page.from.combobox);
      page.click(page.from.combobox);

      assert.equal(page.from.isOpen(), false);
      assert.equal(page.from.expanded(), 'false');
    });

    it('closes when the page is clicked elsewhere', () => {
      page.click(page.from.combobox);

      page.click(page.heading);

      assert.equal(page.from.isOpen(), false);
      assert.equal(page.from.expanded(), 'false');
    });

    it('closes the other dropdown when one is opened', () => {
      page.click(page.from.combobox);

      page.click(page.to.combobox);

      assert.equal(page.from.isOpen(), false);
      assert.equal(page.to.isOpen(), true);
    });

    it('takes the chosen currency, marks it, and converts', async () => {
      page.click(page.from.combobox);
      page.click(page.from.option('GBP'));
      await settle();

      assert.equal(page.from.value(), 'GBP');
      assert.equal(page.from.option('GBP').getAttribute('aria-selected'), 'true');
      assert.equal(page.from.option('USD').getAttribute('aria-selected'), 'false');
      assert.equal(page.from.isOpen(), false);
      assert.match(page.api.conversions().at(-1), /from=GBP/);
      assert.match(page.result(), /^1 GBP = /);
    });
  });

  describe('from the keyboard', () => {
    for (const key of ['Enter', ' ', 'ArrowDown', 'ArrowUp']) {
      it(`opens with ${key === ' ' ? 'Space' : key}`, () => {
        page.press(page.from.combobox, key);

        assert.equal(page.from.isOpen(), true);
        assert.equal(page.from.expanded(), 'true');
      });
    }

    it('starts on the currency already chosen', () => {
      page.press(page.from.combobox, 'Enter');

      assert.equal(page.from.activeOption().dataset.value, 'USD');
      assert.equal(page.from.activeDescendant(), page.from.option('USD').id);
    });

    it('moves down the list and names the active entry for screen readers', () => {
      page.press(page.from.combobox, 'Enter');

      page.press(page.from.combobox, 'ArrowDown');

      assert.equal(page.from.activeOption().dataset.value, 'EUR');
      assert.equal(page.from.activeDescendant(), page.from.option('EUR').id);
    });

    it('wraps around at both ends of the list', () => {
      page.press(page.from.combobox, 'Enter');
      page.press(page.from.combobox, 'ArrowUp');
      assert.equal(page.from.activeOption().dataset.value, 'JPY');

      page.press(page.from.combobox, 'ArrowDown');
      assert.equal(page.from.activeOption().dataset.value, 'USD');
    });

    it('jumps to the ends of the list with Home and End', () => {
      page.press(page.from.combobox, 'Enter');

      page.press(page.from.combobox, 'End');
      assert.equal(page.from.activeOption().dataset.value, 'JPY');

      page.press(page.from.combobox, 'Home');
      assert.equal(page.from.activeOption().dataset.value, 'USD');
    });

    it('chooses the active entry with Enter and hands focus back', async () => {
      page.press(page.from.combobox, 'Enter');
      page.press(page.from.combobox, 'ArrowDown');
      page.press(page.from.combobox, 'ArrowDown');
      page.press(page.from.combobox, 'Enter');
      await settle();

      assert.equal(page.from.value(), 'GBP');
      assert.equal(page.from.isOpen(), false);
      assert.equal(page.focusedId(), 'from-currency-btn');
      assert.match(page.result(), /^1 GBP = /);
    });

    it('closes on Escape without changing the currency', () => {
      page.press(page.from.combobox, 'Enter');
      page.press(page.from.combobox, 'ArrowDown');

      page.press(page.from.combobox, 'Escape');

      assert.equal(page.from.isOpen(), false);
      assert.equal(page.from.value(), 'USD');
      assert.equal(page.from.activeDescendant(), null);
    });

    it('closes when focus moves on with Tab', () => {
      page.press(page.from.combobox, 'Enter');

      page.press(page.from.combobox, 'Tab');

      assert.equal(page.from.isOpen(), false);
    });

    it('keeps the arrow keys from scrolling the page while open', () => {
      const event = page.press(page.from.combobox, 'ArrowDown');

      assert.equal(event.defaultPrevented, true);
    });

    it('stays shut while the currency list is unavailable', async () => {
      const empty = await loadPage({ api: createApi({ currencies: [] }) });

      empty.press(empty.from.combobox, 'Enter');
      empty.click(empty.from.combobox);

      assert.equal(empty.from.isOpen(), false);
    });
  });

  describe('swap button', () => {
    it('exchanges the two currencies and converts again', async () => {
      page.click(page.swapButton);
      await settle();

      assert.equal(page.from.value(), 'EUR');
      assert.equal(page.to.value(), 'USD');
      assert.match(page.api.conversions().at(-1), /from=EUR&to=USD/);
    });

    it('keeps each list marked in step with the values on show', async () => {
      page.click(page.swapButton);
      await settle();

      assert.equal(page.from.selectedOption().dataset.value, 'EUR');
      assert.equal(page.from.option('EUR').getAttribute('aria-selected'), 'true');
      assert.equal(page.to.selectedOption().dataset.value, 'USD');
    });
  });
});