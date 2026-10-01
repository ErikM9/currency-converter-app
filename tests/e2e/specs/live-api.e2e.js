import page from '../support/converter-page.js';

/* The rest of the suite stubs the API, so this opt-in check is the one that proves the real service still answers */
const liveApi = process.env.RUN_LIVE_API ? describe : describe.skip;

liveApi('Live Frankfurter API', () => {
  it('converts a pound into euros', async () => {
    await page.open();
    await page.from.combobox.click();
    await page.from.option('GBP').click();

    await page.waitForResult(/^1 GBP = \d+\.\d{2} EUR \(as of \d{4}-\d{2}-\d{2}\)$/);
  });
});