import page from '../support/converter-page.js';

describe('Amount validation', () => {
  beforeEach(async () => {
    await page.open();
  });

  for (const [label, amount] of [['zero', '0'], ['a negative amount', '-5']]) {
    it(`asks for a usable amount when given ${label}`, async () => {
      await page.amountInput.setValue(amount);

      await page.waitForResult(/Please enter a valid amount\./);
    });
  }

  it('asks for a usable amount when the field is emptied', async () => {
    await page.clearAmount();

    await page.waitForResult(/Please enter a valid amount\./);
  });

  it('asks for something smaller beyond a quadrillion', async () => {
    await page.amountInput.setValue('1000000000000000');

    await page.waitForResult(/Try smaller numbers\./);
  });

  it('echoes the amount when both currencies are the same', async () => {
    await page.amountInput.setValue('25');
    await page.to.combobox.click();
    await page.to.option('USD').click();

    await page.waitForResult(/^25 USD = 25 USD$/);
  });
});