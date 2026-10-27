import page from '../support/converter-page.js';
import { wcagViolations } from '../support/axe.js';

describe('Accessibility', () => {
  beforeEach(async () => {
    await page.open();
  });

  it('passes an automated WCAG 2.1 A and AA scan on load', async () => {
    expect(await wcagViolations()).toEqual([]);
  });

  it('passes an automated WCAG 2.1 A and AA scan with a dropdown open', async () => {
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

  it('names each dropdown by its visible label and current value', async () => {
    expect(await page.from.name()).toBe('From: USD');
    expect(await page.to.name()).toBe('To: EUR');
  });

  it('announces results through a live region', async () => {
    await expect(page.result).toHaveAttribute('aria-live', 'polite');
  });
});