import page from '../support/converter-page.js';
import { wcagViolations } from '../support/axe.js';

describe('Accessibility', () => {
  beforeEach(async () => {
    await page.open();
  });

  it('passes an automated WCAG 2.1 A and AA scan on load', async () => {
    expect(await wcagViolations()).toEqual([]);
  });

  it('passes the same scan with a dropdown open', async () => {
    await page.from.combobox.click();

    expect(await wcagViolations()).toEqual([]);
  });

  it('presents each currency as an option of the listbox', async () => {
    await page.from.combobox.click();

    await expect(page.from.list).toHaveAttribute('role', 'listbox');
    await expect(page.from.option('GBP')).toHaveAttribute('role', 'option');
    await expect(page.from.option('USD')).toHaveAttribute('aria-selected', 'true');
    await expect(page.from.option('GBP')).toHaveAttribute('aria-selected', 'false');
  });

  it('keeps the expanded state in step with the dropdown', async () => {
    expect(await page.from.expanded()).toBe('false');

    await page.from.combobox.click();
    expect(await page.from.expanded()).toBe('true');

    await page.clickAway();
    expect(await page.from.expanded()).toBe('false');
  });

  it('names each dropdown by its visible label and current value', async () => {
    await expect(page.from.combobox).toHaveAttribute('aria-labelledby', 'from-currency-label from-currency-btn');
    await expect(page.to.combobox).toHaveAttribute('aria-labelledby', 'to-currency-label to-currency-btn');
  });

  it('announces results through a live region', async () => {
    await expect(page.result).toHaveAttribute('aria-live', 'polite');
  });
});