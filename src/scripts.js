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
if (typeof document !== 'undefined' && document.getElementById('amount')) {
  const API = 'https://api.frankfurter.dev/v1';
  const amountInput = document.getElementById('amount');
  const swapBtn = document.getElementById('swap-btn');
  const resultDiv = document.getElementById('result');
  const loadingDiv = document.getElementById('loading');
  const CACHE_KEY = 'currencies_cache';

  /* Blocks the document click handler from closing the dropdown on scrollbar mouseup */
  let _scrollbarDragging = false;
  function isDraggingScrollbar() { return _scrollbarDragging; }

  loadCurrencies();

  function loadCurrencies() {
    /* Serve from localStorage if still fresh — skips a network round-trip on every load */
    const cached = parseCachedData(localStorage.getItem(CACHE_KEY));
    if (cached) {
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
        localStorage.setItem(CACHE_KEY, createCacheEntry(currencies));
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
    const fromWrapper = document.getElementById('from-currency-custom');
    const toWrapper = document.getElementById('to-currency-custom');
    const fromSelected = fromWrapper.querySelector('.selected-option');
    const toSelected = toWrapper.querySelector('.selected-option');
    const fromList = fromWrapper.querySelector('.options-list');
    const toList = toWrapper.querySelector('.options-list');

    fromList.innerHTML = '';
    toList.innerHTML = '';

    currencies.forEach(currency => {
      /* Shared helper — avoids duplicating li-creation for from/to lists */
      const makeOption = (list, selectedEl, isDefault) => {
        const li = document.createElement('li');
        li.textContent = currency;
        li.dataset.value = currency;
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

    selectedEl.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = customSelect.classList.contains('open');
      closeAllDropdowns();
      if (!isOpen) customSelect.classList.add('open');
    });

    list.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', e => {
        e.stopPropagation();
        selectedEl.textContent = li.dataset.value;
        list.querySelectorAll('li').forEach(l => l.classList.remove('selected'));
        li.classList.add('selected');
        customSelect.classList.remove('open');
        convert();
      });
    });

    setupCustomScrollbar(customSelect, list);
  }

  function setupCustomScrollbar(customSelect, list) {
    const bar = document.createElement('div');
    bar.className = 'custom-scrollbar';

    const track = document.createElement('div');
    track.className = 'sb-track';

    const thumb = document.createElement('div');
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

    const observer = new ResizeObserver(updateThumb);
    observer.observe(list);

    customSelect.addEventListener('transitionend', updateThumb);
    customSelect.addEventListener('click', () => setTimeout(updateThumb, 0));

    track.addEventListener('mousedown', e => {
      if (e.target === thumb) return;
      e.preventDefault();
      const trackRect = track.getBoundingClientRect();
      const thumbH    = thumb.offsetHeight;
      const maxTop    = track.clientHeight - thumbH;
      const clickY    = e.clientY - trackRect.top - thumbH / 2;
      const ratio     = Math.min(1, Math.max(0, clickY / maxTop));
      list.scrollTop  = ratio * (list.scrollHeight - list.clientHeight);
    });

    let dragStartY = 0, dragStartScroll = 0;

    thumb.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      thumb.classList.add('dragging');
      _scrollbarDragging = true;
      if (document.activeElement) document.activeElement.blur();
      dragStartY      = e.clientY;
      dragStartScroll = list.scrollTop;

      /* Full-screen overlay captures all mouse events during drag so elements
         underneath don't fire hover/focus effects as the cursor moves */
      const dragOverlay = document.createElement('div');
      dragOverlay.style.cssText = 'position:fixed;inset:0;z-index:99999;cursor:default;';
      document.body.appendChild(dragOverlay);

      function onMove(ev) {
        const delta     = ev.clientY - dragStartY;
        const trackH    = track.clientHeight;
        const thumbH    = thumb.offsetHeight;
        const maxTop    = trackH - thumbH;
        const maxScroll = list.scrollHeight - list.clientHeight;
        list.scrollTop  = dragStartScroll + (delta / maxTop) * maxScroll;
      }

      function onUp() {
        thumb.classList.remove('dragging');
        dragOverlay.remove();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        setTimeout(() => { _scrollbarDragging = false; }, 0);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    list.addEventListener('wheel', e => {
      e.preventDefault();
      list.scrollBy({ top: e.deltaY, behavior: 'smooth' });
    }, { passive: false });

    updateThumb();
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
  }

  document.addEventListener('click', e => {
    if (isDraggingScrollbar()) return;
    if (!e.target.closest('.custom-select')) closeAllDropdowns();
  });

  swapBtn.addEventListener('click', () => {
    const fromEl = document.querySelector('#from-currency-custom .selected-option');
    const toEl = document.querySelector('#to-currency-custom .selected-option');
    [fromEl.textContent, toEl.textContent] = [toEl.textContent, fromEl.textContent];

    /* Keep .selected in sync so the highlighted item matches the displayed value */
    const fromList = document.querySelector('#from-currency-custom .options-list');
    const toList = document.querySelector('#to-currency-custom .options-list');
    fromList.querySelectorAll('li').forEach(l => l.classList.toggle('selected', l.dataset.value === fromEl.textContent));
    toList.querySelectorAll('li').forEach(l => l.classList.toggle('selected', l.dataset.value === toEl.textContent));

    convert();
  });

  amountInput.addEventListener('input', convert);

  function convert() {
    const amount = parseFloat(amountInput.value);
    const fromCurrency = document.querySelector('#from-currency-custom .selected-option').textContent;
    const toCurrency = document.querySelector('#to-currency-custom .selected-option').textContent;

    const validation = validateConversionInputs(amount, fromCurrency, toCurrency);
    if (!validation.valid) {
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
      .then(res => res.json())
      .then(data => {
        const rate = extractConversionRate(data, toCurrency);
        if (rate === null) throw new Error('Rate unavailable');
        resultDiv.textContent = formatConversionResult(amount, fromCurrency, rate, toCurrency, data.date);
      })
      .catch(err => {
        console.error('Conversion error:', err);
        resultDiv.textContent = 'Conversion failed. Please try again later.';
      })
      .finally(() => showLoading(false));
  }

  function showLoading(show) {
    loadingDiv.style.display = show ? 'block' : 'none';
  }
}