import { stubConversions } from './conversion-stub.js';

export const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF'];

/* Too long for a dropdown to show at once, as the list from the live API is */
export const LONG_CURRENCY_LIST = [
  'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF',
  'ILS', 'INR', 'JPY', 'MXN', 'NOK', 'NZD', 'PLN', 'SEK', 'USD', 'ZAR'
];

class Dropdown {
  constructor(side) {
    this.side = side;
  }

  get combobox() { return $(`#${this.side}-currency-btn`); }
  get wrapper() { return $(`#${this.side}-currency-custom`); }
  get list() { return $(`#${this.side}-currency-options`); }
  get options() { return $$(`#${this.side}-currency-options li`); }
  get scrollbar() { return $(`#${this.side}-currency-custom .custom-scrollbar`); }
  get scrollThumb() { return $(`#${this.side}-currency-custom .sb-thumb`); }

  option(code) { return $(`#${this.side}-currency-options li[data-value="${code}"]`); }

  async value() { return this.combobox.getText(); }
  async expanded() { return this.combobox.getAttribute('aria-expanded'); }
  async activeDescendant() { return this.combobox.getAttribute('aria-activedescendant'); }

  async isOpen() {
    return (await this.wrapper.getAttribute('class')).includes('open');
  }

  async codes() {
    return browser.execute(
      (side) => [...document.querySelectorAll(`#${side}-currency-options li`)].map((option) => option.textContent),
      this.side
    );
  }

  async activeCode() {
    const active = await $(`#${this.side}-currency-options li.active`);
    return (await active.isExisting()) ? active.getAttribute('data-value') : null;
  }

  async selectedCode() {
    return $(`#${this.side}-currency-options li.selected`).getAttribute('data-value');
  }

  async scrolledBy() {
    return browser.execute((id) => document.getElementById(id).scrollTop, `${this.side}-currency-options`);
  }

  /* True when the option sits inside the part of the list that is on show */
  async shows(code) {
    return browser.execute((side, value) => {
      const list = document.getElementById(`${side}-currency-options`).getBoundingClientRect();
      const option = document.querySelector(`#${side}-currency-options li[data-value="${value}"]`).getBoundingClientRect();
      return option.top >= list.top - 1 && option.bottom <= list.bottom + 1;
    }, this.side, code);
  }

  /* Joins the texts aria-labelledby points at, which is the name a screen reader gives the dropdown */
  async name() {
    return browser.execute((id) => document.getElementById(id).getAttribute('aria-labelledby').split(' ')
      .map((labelId) => document.getElementById(labelId)?.textContent.trim() ?? '')
      .join(' '), `${this.side}-currency-btn`);
  }

  async focus() {
    await browser.execute((id) => document.getElementById(id).focus(), `${this.side}-currency-btn`);
  }

  async press(key) {
    await this.focus();
    await browser.keys([key]);
  }
}

/* Page model for the converter, holding the locators and actions while the specs keep the assertions */
class ConverterPage {
  constructor() {
    this.from = new Dropdown('from');
    this.to = new Dropdown('to');
  }

  get heading() { return $('h1'); }
  get amountInput() { return $('#amount'); }
  get swapButton() { return $('#swap-btn'); }
  get result() { return $('#result'); }
  get loading() { return $('#loading'); }
  get backgroundSymbols() { return $$('.symbol'); }

  /* Seeds the currency list from a page without the app, then loads the app and answers its conversions from the test */
  async open({ stubbed = true, currencies = DEFAULT_CURRENCIES } = {}) {
    await browser.url('/styles.css');
    await browser.execute(
      (entry) => window.localStorage.setItem('currencies_cache', entry),
      JSON.stringify({ data: currencies, timestamp: Date.now() })
    );
    await browser.url('/');
    await this.amountInput.waitForDisplayed();
    await browser.waitUntil(async () => (await this.from.options).length > 0, {
      timeoutMsg: 'The currency dropdowns stayed empty'
    });
    if (stubbed) await stubConversions();
  }

  async clearAmount() {
    await browser.execute(() => {
      const input = document.getElementById('amount');
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  async resultText() {
    return this.result.getText();
  }

  async focusedId() {
    return browser.execute(() => document.activeElement.id);
  }

  async panelHeight() {
    return browser.execute(() => document.querySelector('.converter-container').getBoundingClientRect().height);
  }

  async waitForResult(match) {
    await browser.waitUntil(async () => match.test(await this.result.getText()), {
      timeoutMsg: `The result never matched ${match}`
    });
  }

  async clickAway() {
    await this.heading.click();
  }
}

export default new ConverterPage();