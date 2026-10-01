import page from '../support/converter-page.js';

const horizontalOverflow = () =>
  browser.execute(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

describe('Responsive layout', () => {
  afterEach(async () => {
    await browser.setWindowSize(1280, 800);
  });

  for (const [label, width, height] of [['a phone', 375, 667], ['a tablet', 768, 1024]]) {
    it(`fits the page on ${label}`, async () => {
      await browser.setWindowSize(width, height);
      await page.open();

      await expect(page.amountInput).toBeDisplayed();
      await expect(page.swapButton).toBeDisplayed();
      expect(await horizontalOverflow()).toBe(0);
    });
  }

  it('can still pick a currency on a phone-sized window', async () => {
    await browser.setWindowSize(375, 667);
    await page.open();

    await page.from.combobox.click();
    await page.from.option('JPY').click();

    expect(await page.from.value()).toBe('JPY');
  });
});