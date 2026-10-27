/* Replaces fetch in the page so conversions answer from the test rather than the live API, in any browser */
export async function stubConversions({ rate = 0.92, currency = 'EUR', date = '2026-09-22', status = 200, delay = 0, holdFirst = false } = {}) {
  await browser.execute((options) => {
    window.__conversionRequests = [];

    window.fetch = (url) => {
      window.__conversionRequests.push(url);
      /* Frankfurter answers with the amount already converted, not the unit rate */
      const amount = Number(new URL(url).searchParams.get('amount') ?? 1);
      const body = { amount, base: 'USD', date: options.date, rates: { [options.currency]: amount * options.rate } };
      const response = {
        ok: options.status >= 200 && options.status < 300,
        status: options.status,
        json: () => Promise.resolve(body)
      };

      /* A held first answer waits for the test to release it, which is how a stale answer is staged */
      if (options.holdFirst && window.__conversionRequests.length === 1) {
        return new Promise((resolve) => { window.__releaseFirstConversion = () => resolve(response); });
      }

      return new Promise((resolve) => setTimeout(() => resolve(response), options.delay));
    };
  }, { rate, currency, date, status, delay, holdFirst });
}

export const conversionRequests = () => browser.execute(() => window.__conversionRequests ?? []);

export const releaseFirstConversion = () => browser.execute(() => window.__releaseFirstConversion());