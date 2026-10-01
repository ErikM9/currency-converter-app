/* Replaces fetch in the page so conversions answer from the test rather than the live API, in any browser */
export async function stubConversions({ rate = 0.92, currency = 'EUR', date = '2026-09-22', status = 200, delay = 0, delayFirst = 0 } = {}) {
  await browser.execute((options) => {
    window.__conversionRequests = [];

    window.fetch = (url) => {
      window.__conversionRequests.push(url);
      const body = { amount: 1, base: 'USD', date: options.date, rates: { [options.currency]: options.rate } };
      const response = {
        ok: options.status >= 200 && options.status < 300,
        status: options.status,
        json: () => Promise.resolve(body)
      };
      const wait = window.__conversionRequests.length === 1 ? options.delayFirst || options.delay : options.delay;

      return new Promise((resolve) => setTimeout(() => resolve(response), wait));
    };
  }, { rate, currency, date, status, delay, delayFirst });
}

export const conversionRequests = () => browser.execute(() => window.__conversionRequests ?? []);