import page from '../support/converter-page.js';

describe('Currency dropdown', () => {
  beforeEach(async () => {
    await page.open();
  });

  it('opens on click and reports itself as expanded', async () => {
    await page.from.combobox.click();

    expect(await page.from.isOpen()).toBe(true);
    expect(await page.from.expanded()).toBe('true');
    await expect(page.from.list).toBeDisplayed();
  });

  it('closes again when clicked a second time', async () => {
    await page.from.combobox.click();
    await page.from.combobox.click();

    expect(await page.from.isOpen()).toBe(false);
    expect(await page.from.expanded()).toBe('false');
  });

  it('closes when the page is clicked elsewhere', async () => {
    await page.from.combobox.click();

    await page.clickAway();

    expect(await page.from.isOpen()).toBe(false);
    await expect(page.from.list).not.toBeDisplayed();
  });

  it('closes the other dropdown when one is opened', async () => {
    await page.from.combobox.click();

    await page.to.combobox.click();

    expect(await page.from.isOpen()).toBe(false);
    expect(await page.to.isOpen()).toBe(true);
  });

  it('takes the chosen currency and closes', async () => {
    await page.from.combobox.click();

    await page.from.option('GBP').click();

    expect(await page.from.value()).toBe('GBP');
    expect(await page.from.selectedCode()).toBe('GBP');
    expect(await page.from.isOpen()).toBe(false);
    expect(await page.from.expanded()).toBe('false');
  });

  it('swaps the two currencies over', async () => {
    await page.from.combobox.click();
    await page.from.option('GBP').click();

    await page.swapButton.click();

    expect(await page.from.value()).toBe('EUR');
    expect(await page.to.value()).toBe('GBP');
    expect(await page.to.selectedCode()).toBe('GBP');
  });
});