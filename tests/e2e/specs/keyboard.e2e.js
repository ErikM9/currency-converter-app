import { Key } from 'webdriverio';
import page from '../support/converter-page.js';

describe('Keyboard control', () => {
  beforeEach(async () => {
    await page.open();
  });

  it('reaches the currency dropdown by tabbing', async () => {
    await page.amountInput.click();
    await browser.keys([Key.Tab]);

    expect(await browser.execute(() => document.activeElement.id)).toBe('from-currency-btn');
  });

  /* Reached with a real Tab, since browsers only promise a focus ring for keyboard focus and not for focus set by a script */
  it('shows a focus ring on the dropdown', async () => {
    await page.amountInput.click();
    await browser.keys([Key.Tab]);
    expect(await browser.execute(() => document.activeElement.id)).toBe('from-currency-btn');

    const outline = await browser.execute((id) => {
      const style = getComputedStyle(document.getElementById(id));
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    }, 'from-currency-btn');

    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThan(0);
  });

  it('opens with Enter and starts on the current currency', async () => {
    await page.from.press(Key.Enter);

    expect(await page.from.isOpen()).toBe(true);
    expect(await page.from.activeCode()).toBe('USD');
    expect(await page.from.activeDescendant()).toBe('from-currency-options-USD');
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
    expect(await browser.execute(() => document.activeElement.id)).toBe('from-currency-btn');
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