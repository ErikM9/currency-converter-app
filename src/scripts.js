/* 24-hour cache — currency lists rarely change */
export const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

export function isValidAmount(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return false;
  return amount > 0;
}

export function isAmountTooLarge(amount) {
  return amount >= 1e15;
}

export function isSameCurrency(from, to) {
  return from === to;
}

export function formatConversionResult(amount, fromCurrency, rate, toCurrency, date) {
  return `${amount} ${fromCurrency} = ${rate.toFixed(2)} ${toCurrency} (as of ${date})`;
}

export function formatSameCurrencyResult(amount, currency) {
  return `${amount} ${currency} = ${amount} ${currency}`;
}

export function isCacheValid(timestamp, expiry = CACHE_EXPIRY) {
  return Date.now() - timestamp < expiry;
}

export function parseCachedData(cachedString) {
  if (!cachedString) return null;
  try {
    const { data, timestamp } = JSON.parse(cachedString);
    return isCacheValid(timestamp) ? data : null;
  } catch {
    return null;
  }
}

export function createCacheEntry(data) {
  return JSON.stringify({ data, timestamp: Date.now() });
}

export function extractConversionRate(conversionData, toCurrency) {
  if (!conversionData?.rates) return null;
  /* Frankfurter returns null for the target key if the rate is missing */
  return conversionData.rates[toCurrency] ?? null;
}

/* Reading localStorage throws where cookies are blocked, so the app treats storage as simply absent */
export function getStorage(win = globalThis) {
  try {
    return win.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readCache(storage, key) {
  if (!storage) return null;

  try {
    return parseCachedData(storage.getItem(key));
  } catch {
    return null;
  }
}

export function writeCache(storage, key, data) {
  if (!storage) return false;

  try {
    storage.setItem(key, createCacheEntry(data));
    return true;
  } catch {
    return false;
  }
}

/* Delays a call until the caller stops firing it, so typing an amount starts one request rather than one per key */
export function debounce(fn, wait = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/* Runs all pre-fetch checks so convert() stays clean */
export function validateConversionInputs(amount, fromCurrency, toCurrency) {
  if (!isValidAmount(amount)) return { valid: false, error: 'Please enter a valid amount.' };
  if (isAmountTooLarge(amount)) return { valid: false, error: 'Try smaller numbers.' };
  if (!fromCurrency || !toCurrency) return { valid: false, error: 'Please select currencies.' };
  if (isSameCurrency(fromCurrency, toCurrency)) {
    return { valid: false, error: 'same_currency', result: formatSameCurrencyResult(amount, fromCurrency) };
  }
  return { valid: true };
}

/* --- Browser UI --- */

/* Wires up a page so the converter can also be started against a document supplied by a test */
export function initConverter(doc = globalThis.document) {
  const API = 'https://api.frankfurter.dev/v1';
  const view = doc.defaultView ?? globalThis;
  const amountInput = doc.getElementById('amount');
  const swapBtn = doc.getElementById('swap-btn');
  const resultDiv = doc.getElementById('result');
  const loadingDiv = doc.getElementById('loading');
  const CACHE_KEY = 'currencies_cache';

  const storage = getStorage(view);

  /* Discards the answer to a conversion that a newer one has already replaced */
  let conversionToken = 0;

  /* The last rate seen for each pair, which lets the stand-in for a pending answer run to the same length as the answer */
  const knownRates = new Map();

  /* Blocks the document click handler from closing the dropdown on scrollbar mouseup */
  let _scrollbarDragging = false;
  function isDraggingScrollbar() { return _scrollbarDragging; }

  loadCurrencies();

  function loadCurrencies() {
    /* Serve from localStorage if still fresh — skips a network round-trip on every load */
    const cached = readCache(storage, CACHE_KEY);
    if (cached?.length) {
      populateCurrencyOptions(cached);
      convert();
      return;
    }
    showLoading(true);
    fetch(`${API}/currencies`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const currencies = Object.keys(data);
        if (!currencies.length || currencies.includes('message') || currencies.includes('error')) {
          throw new Error('Invalid API response');
        }
        writeCache(storage, CACHE_KEY, currencies);
        populateCurrencyOptions(currencies);
        convert();
      })
      .catch(err => {
        console.error('Error fetching currencies:', err);
        resultDiv.textContent = 'Failed to load currencies. Please try again later.';
      })
      .finally(() => showLoading(false));
  }

  function populateCurrencyOptions(currencies) {
    const fromWrapper = doc.getElementById('from-currency-custom');
    const toWrapper = doc.getElementById('to-currency-custom');
    const fromSelected = fromWrapper.querySelector('.selected-option');
    const toSelected = toWrapper.querySelector('.selected-option');
    const fromList = fromWrapper.querySelector('.options-list');
    const toList = toWrapper.querySelector('.options-list');

    fromList.innerHTML = '';
    toList.innerHTML = '';

    currencies.forEach(currency => {
      /* Shared helper — avoids duplicating li-creation for from/to lists */
      const makeOption = (list, selectedEl, isDefault) => {
        const li = doc.createElement('li');
        li.textContent = currency;
        li.dataset.value = currency;

        /* Each entry is an option of the listbox so screen readers can read and track the dropdown */
        li.id = `${list.id}-${currency}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(isDefault));

        if (isDefault) {
          li.classList.add('selected');
          selectedEl.textContent = currency;
        }
        list.appendChild(li);
      };
      makeOption(fromList, fromSelected, currency === 'USD');
      makeOption(toList, toSelected, currency === 'EUR');
    });

    setupDropdown(fromSelected, fromList);
    setupDropdown(toSelected, toList);
  }

  function setupDropdown(selectedEl, list) {
    const customSelect = selectedEl.closest('.custom-select');

    const options = () => [...list.querySelectorAll('li')];

    /* Marks the option the keyboard is on and names it for the combobox, without changing the chosen value */
    const highlight = li => {
      options().forEach(l => l.classList.toggle('active', l === li));
      selectedEl.setAttribute('aria-activedescendant', li.id);
      li.scrollIntoView({ block: 'nearest' });
    };

    const open = () => {
      closeAllDropdowns();
      customSelect.classList.add('open');
      selectedEl.setAttribute('aria-expanded', 'true');
      highlight(list.querySelector('li.selected') ?? options()[0]);
    };

    const close = () => {
      customSelect.classList.remove('open');
      selectedEl.setAttribute('aria-expanded', 'false');
      selectedEl.removeAttribute('aria-activedescendant');
      options().forEach(l => l.classList.remove('active'));
    };

    const choose = li => {
      selectedEl.textContent = li.dataset.value;
      markSelected(list, li.dataset.value);
      close();
      selectedEl.focus();
      convert();
    };

    selectedEl.addEventListener('click', e => {
      e.stopPropagation();
      if (customSelect.classList.contains('open')) close();
      else open();
    });

    /* The dropdown is a combobox, so it follows the arrow, Enter, Space and Escape keys a native select would */
    selectedEl.addEventListener('keydown', e => {
      const items = options();
      if (!items.length) return;

      const isOpen = customSelect.classList.contains('open');
      const current = items.findIndex(li => li.classList.contains('active'));

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isOpen) open();
        else if (current > -1) choose(items[current]);
        else close();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          open();
          return;
        }
        const next = e.key === 'ArrowDown'
          ? (current + 1) % items.length
          : (current <= 0 ? items.length - 1 : current - 1);
        highlight(items[next]);
      } else if (e.key === 'Home' || e.key === 'End') {
        if (!isOpen) return;
        e.preventDefault();
        highlight(e.key === 'Home' ? items[0] : items[items.length - 1]);
      } else if (e.key === 'Escape') {
        if (!isOpen) return;
        e.preventDefault();
        close();
      } else if (e.key === 'Tab') {
        close();
      }
    });

    list.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', e => {
        e.stopPropagation();
        choose(li);
      });
    });

    setupCustomScrollbar(customSelect, list);
  }

  /* Keeps the highlighted entry and its aria state in step with the value on display */
  function markSelected(list, value) {
    list.querySelectorAll('li').forEach(li => {
      const chosen = li.dataset.value === value;
      li.classList.toggle('selected', chosen);
      li.setAttribute('aria-selected', String(chosen));
    });
  }

  function setupCustomScrollbar(customSelect, list) {
    const bar = doc.createElement('div');
    bar.className = 'custom-scrollbar';

    const track = doc.createElement('div');
    track.className = 'sb-track';

    const thumb = doc.createElement('div');
    thumb.className = 'sb-thumb';

    track.appendChild(thumb);
    bar.appendChild(track);
    customSelect.appendChild(bar);

    function updateThumb() {
      const isOpen     = customSelect.classList.contains('open');
      const scrollable = list.scrollHeight > list.clientHeight;
      bar.classList.toggle('visible', isOpen && scrollable);
      if (!scrollable) return;
      const trackH      = track.clientHeight;
      const ratio       = list.clientHeight / list.scrollHeight;
      const thumbH      = Math.max(16, trackH * ratio);
      const maxTop      = trackH - thumbH;
      const scrollRatio = list.scrollTop / (list.scrollHeight - list.clientHeight);
      thumb.style.height = thumbH + 'px';
      thumb.style.top    = (scrollRatio * maxTop) + 'px';
    }

    list.addEventListener('scroll', updateThumb);

    const observer = new view.ResizeObserver(updateThumb);
    observer.observe(list);

    customSelect.addEventListener('transitionend', updateThumb);
    customSelect.addEventListener('click', () => setTimeout(updateThumb, 0));

    /* Mouse positions come in screen pixels and sizes in the page's own, which differ once the converter is zoomed on larger screens */
    const zoomOf = el => (el.clientHeight && el.getBoundingClientRect().height / el.clientHeight) || 1;

    track.addEventListener('mousedown', e => {
      if (e.target === thumb) return;
      e.preventDefault();
      const trackRect = track.getBoundingClientRect();
      const thumbH    = thumb.offsetHeight;
      const maxTop    = track.clientHeight - thumbH;
      const clickY    = (e.clientY - trackRect.top) / zoomOf(track) - thumbH / 2;
      const ratio     = Math.min(1, Math.max(0, clickY / maxTop));
      list.scrollTop  = ratio * (list.scrollHeight - list.clientHeight);
    });

    let dragStartY = 0, dragStartScroll = 0;

    thumb.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      thumb.classList.add('dragging');
      _scrollbarDragging = true;
      if (doc.activeElement) doc.activeElement.blur();
      dragStartY      = e.clientY;
      dragStartScroll = list.scrollTop;
      const zoom      = zoomOf(track);

      /* Full-screen overlay captures all mouse events during drag so elements
         underneath don't fire hover/focus effects as the cursor moves */
      const dragOverlay = doc.createElement('div');
      dragOverlay.style.cssText = 'position:fixed;inset:0;z-index:99999;cursor:default;';
      doc.body.appendChild(dragOverlay);

      function onMove(ev) {
        const delta     = (ev.clientY - dragStartY) / zoom;
        const trackH    = track.clientHeight;
        const thumbH    = thumb.offsetHeight;
        const maxTop    = trackH - thumbH;
        const maxScroll = list.scrollHeight - list.clientHeight;
        list.scrollTop  = dragStartScroll + (delta / maxTop) * maxScroll;
      }

      function onUp() {
        thumb.classList.remove('dragging');
        dragOverlay.remove();
        doc.removeEventListener('mousemove', onMove);
        doc.removeEventListener('mouseup', onUp);
        setTimeout(() => { _scrollbarDragging = false; }, 0);
      }

      doc.addEventListener('mousemove', onMove);
      doc.addEventListener('mouseup', onUp);
    });

    list.addEventListener('wheel', e => {
      e.preventDefault();
      list.scrollBy({ top: e.deltaY, behavior: 'smooth' });
    }, { passive: false });

    updateThumb();
  }

  function closeAllDropdowns() {
    doc.querySelectorAll('.custom-select.open').forEach(el => {
      el.classList.remove('open');
      el.querySelectorAll('li.active').forEach(li => li.classList.remove('active'));

      const combobox = el.querySelector('.selected-option');
      combobox.setAttribute('aria-expanded', 'false');
      combobox.removeAttribute('aria-activedescendant');
    });
  }

  doc.addEventListener('click', e => {
    if (isDraggingScrollbar()) return;
    if (!e.target.closest('.custom-select')) closeAllDropdowns();
  });

  swapBtn.addEventListener('click', () => {
    const fromEl = doc.querySelector('#from-currency-custom .selected-option');
    const toEl = doc.querySelector('#to-currency-custom .selected-option');
    [fromEl.textContent, toEl.textContent] = [toEl.textContent, fromEl.textContent];

    /* Keep .selected in sync so the highlighted item matches the displayed value */
    markSelected(doc.querySelector('#from-currency-custom .options-list'), fromEl.textContent);
    markSelected(doc.querySelector('#to-currency-custom .options-list'), toEl.textContent);

    convert();
  });

  amountInput.addEventListener('input', debounce(convert, 250));

  function convert() {
    /* Taken before validating, so an answer still on its way for an earlier amount cannot overwrite whatever is shown for this one */
    const token = ++conversionToken;
    const amount = parseFloat(amountInput.value);
    const fromCurrency = doc.querySelector('#from-currency-custom .selected-option').textContent;
    const toCurrency = doc.querySelector('#to-currency-custom .selected-option').textContent;

    const validation = validateConversionInputs(amount, fromCurrency, toCurrency);
    if (!validation.valid) {
      showLoading(false);
      /* 'same_currency' is a sentinel — the formatted result is already on the object */
      if (validation.error === 'same_currency') {
        resultDiv.textContent = validation.result;
      } else {
        resultDiv.textContent = validation.error;
      }
      return;
    }

    showLoading(true);
    fetch(`${API}/latest?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (token !== conversionToken) return;
        const rate = extractConversionRate(data, toCurrency);
        if (rate === null) throw new Error('Rate unavailable');
        knownRates.set(`${fromCurrency}>${toCurrency}`, rate / amount);
        resultDiv.textContent = formatConversionResult(amount, fromCurrency, rate, toCurrency, data.date);
      })
      .catch(err => {
        if (token !== conversionToken) return;
        console.error('Conversion error:', err);
        resultDiv.textContent = 'Conversion failed. Please try again later.';
      })
      .finally(() => {
        if (token === conversionToken) showLoading(false);
      });
  }

  /* Stands in for the answer on its way, in the same format and roughly the same length, so the result already has the size it will keep */
  function pendingResult() {
    const amount = parseFloat(amountInput.value);
    const shown = isValidAmount(amount) ? amount : 1;
    const fromCurrency = doc.querySelector('#from-currency-custom .selected-option').textContent;
    const toCurrency = doc.querySelector('#to-currency-custom .selected-option').textContent;
    const inverse = knownRates.get(`${toCurrency}>${fromCurrency}`);
    const unitRate = knownRates.get(`${fromCurrency}>${toCurrency}`) ?? (inverse ? 1 / inverse : 1);
    return formatConversionResult(shown, fromCurrency, shown * unitRate, toCurrency, '0000-00-00');
  }

  /* The stand-in stays hidden under the loading line, which is switched on through the class on the area they share */
  function showLoading(show) {
    if (show) resultDiv.textContent = pendingResult();
    loadingDiv.parentElement.classList.toggle('is-loading', show);
  }
}

/* Start the converter when a browser loads this module */
if (typeof document !== 'undefined' && document.getElementById('amount')) {
  initConverter();
}