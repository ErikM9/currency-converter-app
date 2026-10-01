import page from '../support/converter-page.js';

describe('Page load', () => {
  before(async () => {
    await page.open();
  });

  it('shows the converter and its title', async () => {
    expect(await browser.getTitle()).toBe('Currency Converter');
    await expect(page.heading).toHaveText('Currency Converter');
  });

  it('starts on one unit of USD in EUR', async () => {
    expect(await page.amountInput.getValue()).toBe('1');
    expect(await page.from.value()).toBe('USD');
    expect(await page.to.value()).toBe('EUR');
  });

  it('fills both dropdowns from the stored currency list', async () => {
    expect(await page.from.codes()).toEqual(['USD', 'EUR', 'GBP', 'JPY', 'CHF']);
    expect(await page.to.codes()).toEqual(['USD', 'EUR', 'GBP', 'JPY', 'CHF']);
  });

  it('marks the starting currency in each list', async () => {
    expect(await page.from.selectedCode()).toBe('USD');
    expect(await page.to.selectedCode()).toBe('EUR');
  });

  it('keeps both dropdowns closed to begin with', async () => {
    expect(await page.from.isOpen()).toBe(false);
    expect(await page.from.expanded()).toBe('false');
  });

  it('shows the twelve drifting currency symbols', async () => {
    expect(await page.backgroundSymbols).toHaveLength(12);
  });
});