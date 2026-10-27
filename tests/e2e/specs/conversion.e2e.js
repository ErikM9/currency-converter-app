import page from '../support/converter-page.js';
import { stubConversions, conversionRequests, releaseFirstConversion } from '../support/conversion-stub.js';

const firstRequestSent = () =>
  browser.waitUntil(async () => (await conversionRequests()).length === 1, {
    timeoutMsg: 'The first conversion was never requested'
  });

describe('Conversion', () => {
  beforeEach(async () => {
    await page.open();
  });

  it('shows the converted amount with the date of the rate', async () => {
    await page.amountInput.setValue('250');

    await page.waitForResult(/^250 USD = 230\.00 EUR \(as of 2026-09-22\)$/);
  });

  it('asks for the amount and the pair on screen', async () => {
    await page.amountInput.setValue('250');
    await page.waitForResult(/^250 USD/);

    expect((await conversionRequests()).at(-1)).toContain('amount=250&from=USD&to=EUR');
  });

  it('sends one request for a burst of typing', async () => {
    await page.amountInput.setValue('123');
    await page.waitForResult(/^123 USD = /);

    expect(await conversionRequests()).toHaveLength(1);
  });

  it('converts again when a different currency is chosen', async () => {
    await stubConversions({ rate: 157.2, currency: 'JPY' });

    await page.to.combobox.click();
    await page.to.option('JPY').click();

    await page.waitForResult(/^1 USD = 157\.20 JPY/);
    expect((await conversionRequests()).at(-1)).toContain('to=JPY');
  });

  it('converts the other way round after a swap', async () => {
    await stubConversions({ rate: 1.09, currency: 'USD' });

    await page.swapButton.click();

    await page.waitForResult(/^1 EUR = 1\.09 USD/);
    expect((await conversionRequests()).at(-1)).toContain('from=EUR&to=USD');
  });

  it('ignores a slow answer that a newer conversion has replaced', async () => {
    await stubConversions({ rate: 0.5, holdFirst: true });
    await page.amountInput.setValue('5');
    await firstRequestSent();
    await page.amountInput.setValue('900');
    await page.waitForResult(/^900 USD = 450\.00 EUR/);

    await releaseFirstConversion();

    expect(await page.resultText()).toMatch(/^900 USD = 450\.00 EUR/);
  });

  it('keeps a validation message when a slow earlier conversion finally answers', async () => {
    await stubConversions({ holdFirst: true });
    await page.amountInput.setValue('5');
    await firstRequestSent();
    await page.clearAmount();
    await page.waitForResult(/^Please enter a valid amount\.$/);

    await releaseFirstConversion();

    expect(await page.resultText()).toBe('Please enter a valid amount.');
    await expect(page.loading).not.toBeDisplayed();
  });

  it('shows the loading line while the answer is outstanding', async () => {
    await stubConversions({ delay: 1500 });

    await page.amountInput.setValue('7');
    await expect(page.loading).toBeDisplayed();

    await page.waitForResult(/^7 USD = /);
    await expect(page.loading).not.toBeDisplayed();
  });

  /* Starting from a one-line message makes the check bite, as a result wraps onto two lines */
  it('keeps the panel the same height from the loading line to the result', async () => {
    await stubConversions({ delay: 1500 });
    await page.clearAmount();
    await page.waitForResult(/^Please enter a valid amount\.$/);

    await page.amountInput.setValue('250');
    await expect(page.loading).toBeDisplayed();
    const whileLoading = await page.panelHeight();

    await page.waitForResult(/^250 USD = /);
    expect(await page.panelHeight()).toBe(whileLoading);
  });

  it('says so when the conversion service fails', async () => {
    await stubConversions({ status: 500 });

    await page.amountInput.setValue('5');

    await page.waitForResult(/^Conversion failed\. Please try again later\.$/);
    await expect(page.loading).not.toBeDisplayed();
  });
});