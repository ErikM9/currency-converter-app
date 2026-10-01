import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { initConverter } from '../../src/scripts.js';

const indexHtml = readFileSync(new URL('../../src/index.html', import.meta.url), 'utf8');

/* Lets a zero-delay timer inside the app run before the test carries on */
export const nextTimer = () => new Promise((resolve) => setTimeout(resolve, 0));

/* Lets pending promise chains finish before a test looks at the page */
export const settle = async (ticks = 5) => {
  for (let i = 0; i < ticks; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

/* A stand-in for localStorage, so every test starts with a cache of its own */
export function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  };
}

/* Stands in for the Frankfurter API, recording every call and able to hold one conversion back */
export function createApi({
  currencies = ['USD', 'EUR', 'GBP', 'JPY'],
  rate = 0.9,
  date = '2026-09-22',
  currenciesStatus = 200,
  latestStatus = 200,
  failCurrencies = false,
  missingRate = false
} = {}) {
  const calls = [];
  let held = null;

  const respond = (body, status) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

  const fetchImpl = async (url) => {
    calls.push(url);

    if (url.includes('/currencies')) {
      if (failCurrencies) throw new TypeError('Failed to fetch');
      return respond(Object.fromEntries(currencies.map((code) => [code, code])), currenciesStatus);
    }

    const params = new URL(url).searchParams;
    const amount = Number(params.get('amount'));
    const rates = missingRate ? {} : { [params.get('to')]: amount * rate };
    const reply = respond({ amount, base: params.get('from'), date, rates }, latestStatus);

    if (held?.waiting) {
      held.waiting = false;
      return new Promise((resolve) => { held.release = () => resolve(reply); });
    }

    return reply;
  };

  return {
    fetch: fetchImpl,
    calls,
    currencyCalls: () => calls.filter((url) => url.includes('/currencies')),
    conversions: () => calls.filter((url) => url.includes('/latest')),
    holdNextConversion() { held = { waiting: true }; },
    releaseConversion() { held.release(); }
  };
}

/* Boots the real page in jsdom with the network and storage under the test's control */
export async function loadPage({ api = createApi(), storage = 'available', cache = null } = {}) {
  const dom = new JSDOM(indexHtml, { url: 'http://localhost:3000' });
  const { window } = dom;

  /* Neither of these exists in jsdom, and the app uses both while a dropdown is open */
  window.Element.prototype.scrollIntoView = () => {};
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

  if (storage === 'blocked') {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Access denied', 'SecurityError'); }
    });
  } else if (cache) {
    window.localStorage.setItem('currencies_cache', cache);
  }

  globalThis.fetch = api.fetch;
  initConverter(window.document);
  await settle();

  return pageHandle(window, api);
}

function pageHandle(window, api) {
  const { document } = window;
  const byId = (id) => document.getElementById(id);

  const dropdown = (side) => ({
    combobox: byId(`${side}-currency-btn`),
    wrapper: byId(`${side}-currency-custom`),
    list: byId(`${side}-currency-options`),
    options: () => [...document.querySelectorAll(`#${side}-currency-options li`)],
    option: (code) => document.querySelector(`#${side}-currency-options li[data-value="${code}"]`),
    codes: () => [...document.querySelectorAll(`#${side}-currency-options li`)].map((li) => li.dataset.value),
    value: () => byId(`${side}-currency-btn`).textContent,
    isOpen: () => byId(`${side}-currency-custom`).classList.contains('open'),
    expanded: () => byId(`${side}-currency-btn`).getAttribute('aria-expanded'),
    activeDescendant: () => byId(`${side}-currency-btn`).getAttribute('aria-activedescendant'),
    activeOption: () => document.querySelector(`#${side}-currency-options li.active`),
    selectedOption: () => document.querySelector(`#${side}-currency-options li.selected`)
  });

  return {
    window,
    document,
    api,
    get storage() { return window.localStorage; },
    from: dropdown('from'),
    to: dropdown('to'),
    heading: document.querySelector('h1'),
    swapButton: byId('swap-btn'),
    amountInput: byId('amount'),
    result: () => byId('result').textContent,
    loadingShown: () => byId('loading').parentElement.classList.contains('is-loading'),
    focusedId: () => document.activeElement?.id,
    click: (element) => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true })),
    press: (element, key) => {
      const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      return event;
    },
    typeAmount: (value) => {
      const input = byId('amount');
      input.value = value;
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    }
  };
}