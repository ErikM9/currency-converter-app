export const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF'];

class Dropdown {
  constructor(side) {
    this.side = side;
  }

  get combobox() { return $(`#${this.side}-currency-btn`); }
  get wrapper() { return $(`#${this.side}-currency-custom`); }
  get list() { return $(`#${this.side}-currency-options`); }
  get options() { return $$(`#${this.side}-currency-options li`); }

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
    return active.isExisting() ? active.getAttribute('data-value') : null;
  }

  async selectedCode() {
    return $(`#${this.side}-currency-options li.selected`).getAttribute('data-value');
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

  /* Seeds the currency list into storage first, so loading the page never waits on the live API */
  async open({ currencies = DEFAULT_CURRENCIES } = {}) {
    await browser.url('/');
    await browser.execute(
      (entry) => window.localStorage.setItem('currencies_cache', entry),
      JSON.stringify({ data: currencies, timestamp: Date.now() })
    );
    await browser.url('/');
    await this.amountInput.waitForDisplayed();
    await browser.waitUntil(async () => (await this.from.options).length > 0, {
      timeoutMsg: 'The currency dropdowns stayed empty'
    });
  }

  async setAmount(value) {
    await this.amountInput.setValue(value);
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