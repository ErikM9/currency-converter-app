import { Key } from 'webdriverio';
import page, { LONG_CURRENCY_LIST } from '../support/converter-page.js';

describe('Dropdown scrollbar', () => {
  it('stays hidden while the whole list fits in the dropdown', async () => {
    await page.open();
    await page.from.combobox.click();

    await expect(page.from.scrollbar).not.toBeDisplayed();
  });

  describe('with a list too long to show at once', () => {
    beforeEach(async () => {
      await page.open({ currencies: LONG_CURRENCY_LIST });
      await page.from.combobox.click();
    });

    it('shows the scrollbar', async () => {
      await expect(page.from.scrollbar).toBeDisplayed();
    });

    it('takes the scrollbar away when the dropdown closes', async () => {
      await browser.keys([Key.Escape]);

      await expect(page.from.scrollbar).not.toBeDisplayed();
    });

    it('keeps the highlighted currency in view as the keyboard moves through the list', async () => {
      await browser.keys([Key.Home]);
      expect(await page.from.activeCode()).toBe('AUD');
      expect(await page.from.shows('AUD')).toBe(true);

      await browser.keys([Key.End]);
      expect(await page.from.activeCode()).toBe('ZAR');
      expect(await page.from.shows('ZAR')).toBe(true);
    });

    it('scrolls the list as its thumb is dragged and leaves the dropdown open', async () => {
      const before = await page.from.scrolledBy();

      await browser.action('pointer')
        .move({ origin: await page.from.scrollThumb })
        .down()
        .move({ origin: 'pointer', x: 0, y: -40 })
        .up()
        .perform();

      await browser.waitUntil(async () => (await page.from.scrolledBy()) < before, {
        timeoutMsg: 'The list did not scroll'
      });
      expect(await page.from.isOpen()).toBe(true);
    });
  });
});