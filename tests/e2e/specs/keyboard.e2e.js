import { Key } from 'webdriverio';
import page from '../support/converter-page.js';

describe('Keyboard control', () => {
  beforeEach(async () => {
    await page.open();
  });

  it('reaches the currency dropdown by tabbing', async () => {
    await page.amountInput.click();
    await browser.keys([Key.Tab]);

    expect(await page.focusedId()).toBe('from-currency-btn');
  });

  /* Reached with a real Tab, since browsers only promise a focus ring for keyboard focus */
  it('shows a focus ring on the dropdown', async () => {
    await page.amountInput.click();
    await browser.keys([Key.Tab]);

    const outline = await browser.execute((id) => {
      const style = getComputedStyle(document.getElementById(id));
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    }, 'from-currency-btn');

    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThan(0);
  });

  /* EUR is not the first entry, so a list that simply opened at the top would fail here */
  it('opens with Enter and starts on the current currency', async () => {
    await page.to.press(Key.Enter);

    expect(await page.to.isOpen()).toBe(true);
    expect(await page.to.activeCode()).toBe('EUR');
    expect(await page.to.activeDescendant()).toBe('to-currency-options-EUR');
  });

  it('moves through the list with the arrow keys', async () => {
    await page.from.press(Key.Enter);

    await browser.keys([Key.ArrowDown]);
    expect(await page.from.activeCode()).toBe('EUR');

    await browser.keys([Key.ArrowUp]);
    expect(await page.from.activeCode()).toBe('USD');
  });

  it('wraps around at the top of the list', async () => {
    await page.from.press(Key.Enter);

    await browser.keys([Key.ArrowUp]);

    expect(await page.from.activeCode()).toBe('CHF');
  });

  it('jumps to the ends of the list with Home and End', async () => {
    await page.from.press(Key.Enter);

    await browser.keys([Key.End]);
    expect(await page.from.activeCode()).toBe('CHF');

    await browser.keys([Key.Home]);
    expect(await page.from.activeCode()).toBe('USD');
  });

  it('chooses the highlighted currency with Enter and keeps focus on the dropdown', async () => {
    await page.from.press(Key.Enter);
    await browser.keys([Key.ArrowDown]);
    await browser.keys([Key.ArrowDown]);
    await browser.keys([Key.Enter]);

    expect(await page.from.value()).toBe('GBP');
    expect(await page.from.isOpen()).toBe(false);
    expect(await page.focusedId()).toBe('from-currency-btn');
  });

  it('closes with Escape and leaves the currency alone', async () => {
    await page.from.press(Key.Enter);
    await browser.keys([Key.ArrowDown]);

    await browser.keys([Key.Escape]);

    expect(await page.from.isOpen()).toBe(false);
    expect(await page.from.value()).toBe('USD');
    expect(await page.from.activeDescendant()).toBe(null);
  });
});