import page from '../support/converter-page.js';

/* The only spec that checks an answer from the real service, which is why it is opt-in */
describe('Live Frankfurter API', () => {
  it('converts a pound into euros', async () => {
    await page.open({ stubbed: false });
    await page.from.combobox.click();
    await page.from.option('GBP').click();

    await page.waitForResult(/^1 GBP = \d+\.\d{2} EUR \(as of \d{4}-\d{2}-\d{2}\)$/);
  });
});