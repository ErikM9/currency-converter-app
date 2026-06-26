describe('Currency Converter E2E', () => {
  beforeEach(async () => {
    await browser.url('http://localhost:3000');
    await $('h1').waitForDisplayed({ timeout: 5000 });
  });

  describe('Page Load', () => {
    it('displays the page title', async () => {
      const title = await browser.getTitle();
      expect(title).toBe('Currency Converter');
    });

    it('shows main heading', async () => {
      const heading = await $('h1');
      await expect(heading).toHaveText('Currency Converter');
    });

    it('displays instructions', async () => {
      const instructions = await $('h2');
      await expect(instructions).toBeDisplayed();
      const text = await instructions.getText();
      expect(text).toContain('Choose the amount');
    });

    it('displays amount input', async () => {
      const input = await $('#amount');
      await expect(input).toBeDisplayed();
    });

    it('amount input has default value of 1', async () => {
      const input = await $('#amount');
      const value = await input.getValue();
      expect(value).toBe('1');
    });

    it('displays from currency selector', async () => {
      const fromSelect = await $('#from-currency-custom');
      await expect(fromSelect).toBeDisplayed();
    });

    it('displays to currency selector', async () => {
      const toSelect = await $('#to-currency-custom');
      await expect(toSelect).toBeDisplayed();
    });

    it('displays swap button', async () => {
      const swapBtn = await $('#swap-btn');
      await expect(swapBtn).toBeDisplayed();
    });

    it('displays result area', async () => {
      const result = await $('#result');
      await expect(result).toBeDisplayed();
    });

    it('has USD as default from currency', async () => {
      const selected = await $('#from-currency-custom .selected-option');
      await expect(selected).toHaveText('USD');
    });

    it('has EUR as default to currency', async () => {
      const selected = await $('#to-currency-custom .selected-option');
      await expect(selected).toHaveText('EUR');
    });
  });

  describe('Currency Dropdowns', () => {
    it('opens from dropdown on click when currencies loaded', async () => {
      await browser.waitUntil(
        async () => (await $$('#from-currency-custom .options-list li')).length > 0,
        { timeout: 5000, timeoutMsg: 'Currencies did not load in time' }
      );
      const selected = await $('#from-currency-custom .selected-option');
      await selected.click();
      await $('#from-currency-custom .options-list').waitForDisplayed({ timeout: 3000 });
      const optionsList = await $('#from-currency-custom .options-list');
      const display = await optionsList.getCSSProperty('display');
      expect(display.value).not.toBe('none');
    });

    it('opens to dropdown on click when currencies loaded', async () => {
      await browser.waitUntil(
        async () => (await $$('#to-currency-custom .options-list li')).length > 0,
        { timeout: 5000, timeoutMsg: 'Currencies did not load in time' }
      );
      const selected = await $('#to-currency-custom .selected-option');
      await selected.click();
      await $('#to-currency-custom .options-list').waitForDisplayed({ timeout: 3000 });
      const optionsList = await $('#to-currency-custom .options-list');
      const display = await optionsList.getCSSProperty('display');
      expect(display.value).not.toBe('none');
    });

    it('closes dropdown when clicking outside', async () => {
      await browser.waitUntil(
        async () => (await $$('#from-currency-custom .options-list li')).length > 0,
        { timeout: 5000, timeoutMsg: 'Currencies did not load in time' }
      );
      const selected = await $('#from-currency-custom .selected-option');
      await selected.click();
      await $('#from-currency-custom .options-list').waitForDisplayed({ timeout: 3000 });
      const body = await $('body');
      await body.click();
      await $('#from-currency-custom .options-list').waitForDisplayed({ timeout: 3000, reverse: true });
      const optionsList = await $('#from-currency-custom .options-list');
      const display = await optionsList.getCSSProperty('display');
      expect(display.value).toBe('none');
    });

    it('dropdown contains currency options when API loads', async () => {
      await browser.waitUntil(
        async () => (await $$('#from-currency-custom .options-list li')).length > 0,
        { timeout: 5000, timeoutMsg: 'Currencies did not load in time' }
      );
      const selected = await $('#from-currency-custom .selected-option');
      await selected.click();
      await $('#from-currency-custom .options-list').waitForDisplayed({ timeout: 3000 });
      const options = await $$('#from-currency-custom .options-list li');
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe('Swap Functionality', () => {
    it('swaps currencies when swap button clicked', async () => {
      const fromSelected = await $('#from-currency-custom .selected-option');
      const toSelected = await $('#to-currency-custom .selected-option');
      const initialFrom = await fromSelected.getText();
      const initialTo = await toSelected.getText();
      const swapBtn = await $('#swap-btn');
      await swapBtn.click();
      await expect(fromSelected).toHaveText(initialTo);
      await expect(toSelected).toHaveText(initialFrom);
    });

    it('triggers conversion after swap', async () => {
      await browser.waitUntil(
        async () => (await $('#result').getText()).length > 0,
        { timeout: 5000, timeoutMsg: 'Initial conversion did not complete' }
      );
      const swapBtn = await $('#swap-btn');
      await swapBtn.click();
      await browser.waitUntil(
        async () => (await $('#result').getText()).length > 0,
        { timeout: 5000, timeoutMsg: 'Conversion after swap did not complete' }
      );
      const newResult = await $('#result').getText();
      expect(newResult).not.toBe('');
    });
  });

  describe('Amount Input', () => {
    it('accepts numeric input', async () => {
      const input = await $('#amount');
      await input.clearValue();
      await input.setValue('100');
      const value = await input.getValue();
      expect(value).toBe('100');
    });

    it('updates result on input change', async () => {
      const input = await $('#amount');
      await input.clearValue();
      await input.setValue('500');
      await browser.waitUntil(
        async () => (await $('#result').getText()).length > 0,
        { timeout: 5000, timeoutMsg: 'Result did not update in time' }
      );
      const newResult = await $('#result').getText();
      expect(newResult.length).toBeGreaterThan(0);
    });

    it('shows error for invalid amount', async () => {
      const input = await $('#amount');
      await input.clearValue();
      await input.setValue('0');
      await browser.waitUntil(
        async () => (await $('#result').getText()).includes('valid amount'),
        { timeout: 3000, timeoutMsg: 'Error message did not appear' }
      );
      expect(await $('#result').getText()).toContain('valid amount');
    });

    it('shows error for negative amount', async () => {
      const input = await $('#amount');
      await input.clearValue();
      await input.setValue('-5');
      await browser.waitUntil(
        async () => (await $('#result').getText()).includes('valid amount'),
        { timeout: 3000, timeoutMsg: 'Error message did not appear' }
      );
      expect(await $('#result').getText()).toContain('valid amount');
    });
  });

  describe('Same Currency Conversion', () => {
    it('shows same amount for same currency', async () => {
      await browser.waitUntil(
        async () => (await $$('#to-currency-custom .options-list li')).length > 0,
        { timeout: 5000, timeoutMsg: 'Currencies did not load in time' }
      );
      const toSelected = await $('#to-currency-custom .selected-option');
      await toSelected.click();
      await $('#to-currency-custom .options-list').waitForDisplayed({ timeout: 3000 });
      const usdOption = await $('#to-currency-custom .options-list li[data-value="USD"]');
      if (await usdOption.isExisting()) {
        await usdOption.click();
        await browser.waitUntil(
          async () => (await $('#result').getText()).includes('USD = 1 USD'),
          { timeout: 3000, timeoutMsg: 'Same currency result did not appear' }
        );
        expect(await $('#result').getText()).toMatch(/1 USD = 1 USD/);
      }
    });
  });

  describe('Visual Elements', () => {
    it('has correct number of background symbols', async () => {
      const symbols = await $$('.symbol');
      expect(symbols.length).toBe(12);
    });

    it('converter container is visible', async () => {
      const container = await $('.converter-container');
      await expect(container).toBeDisplayed();
    });
  });

  describe('Responsive Design', () => {
    it('displays correctly on mobile viewport', async () => {
      await browser.setWindowSize(375, 667);
      const container = await $('.converter-container');
      await expect(container).toBeDisplayed();
      const input = await $('#amount');
      await expect(input).toBeDisplayed();
    });

    it('displays correctly on tablet viewport', async () => {
      await browser.setWindowSize(768, 1024);
      const container = await $('.converter-container');
      await expect(container).toBeDisplayed();
    });

    it('form elements are usable on mobile', async () => {
      await browser.setWindowSize(375, 667);
      const input = await $('#amount');
      await input.clearValue();
      await input.setValue('50');
      const value = await input.getValue();
      expect(value).toBe('50');
    });
  });

  describe('Accessibility', () => {
    it('amount input has label', async () => {
      const label = await $('label[for="amount"]');
      await expect(label).toBeDisplayed();
    });

    it('swap button has aria-label', async () => {
      const swapBtn = await $('#swap-btn');
      const ariaLabel = await swapBtn.getAttribute('aria-label');
      expect(ariaLabel).toBe('Swap currencies');
    });

    it('result area has aria-live attribute', async () => {
      const result = await $('#result');
      const ariaLive = await result.getAttribute('aria-live');
      expect(ariaLive).toBe('polite');
    });

    it('currency selectors have labels', async () => {
      const fromLabel = await $('#from-currency-custom').$('..');
      const fromLabelText = await fromLabel.$('label');
      await expect(fromLabelText).toBeDisplayed();
      const toLabel = await $('#to-currency-custom').$('..');
      const toLabelText = await toLabel.$('label');
      await expect(toLabelText).toBeDisplayed();
    });

    it('custom dropdowns have combobox role and aria attributes', async () => {
      const fromBtn = await $('#from-currency-btn');
      expect(await fromBtn.getAttribute('role')).toBe('combobox');
      expect(await fromBtn.getAttribute('aria-haspopup')).toBe('listbox');
      expect(await fromBtn.getAttribute('tabindex')).toBe('0');
      const toBtn = await $('#to-currency-btn');
      expect(await toBtn.getAttribute('role')).toBe('combobox');
      expect(await toBtn.getAttribute('tabindex')).toBe('0');
    });

    it('options lists have listbox role', async () => {
      const fromList = await $('#from-currency-custom .options-list');
      expect(await fromList.getAttribute('role')).toBe('listbox');
      const toList = await $('#to-currency-custom .options-list');
      expect(await toList.getAttribute('role')).toBe('listbox');
    });
  });

  describe('Loading State', () => {
    it('loading is hidden by default', async () => {
      await browser.waitUntil(
        async () => {
          const display = await $('#loading').getCSSProperty('display');
          return display.value === 'none';
        },
        { timeout: 5000, timeoutMsg: 'Loading spinner did not hide in time' }
      );
      const loading = await $('#loading');
      const display = await loading.getCSSProperty('display');
      expect(display.value).toBe('none');
    });
  });

  describe('Error Handling', () => {
    it('shows error message for very large numbers', async () => {
      const input = await $('#amount');
      await input.clearValue();
      await input.setValue('9999999999999999');
      await browser.waitUntil(
        async () => (await $('#result').getText()).length > 0,
        { timeout: 3000, timeoutMsg: 'Error message did not appear' }
      );
      expect((await $('#result').getText()).length).toBeGreaterThan(0);
    });

    it('handles empty input gracefully', async () => {
      await browser.execute(() => {
        const input = document.getElementById('amount');
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await browser.waitUntil(
        async () => {
          const text = await $('#result').getText();
          return text.includes('valid amount') || text.includes('Failed') || text.includes('failed');
        },
        { timeout: 3000, timeoutMsg: 'Error message did not appear for empty input' }
      );
      const resultText = await $('#result').getText();
      const hasError = resultText.includes('valid amount') ||
                       resultText.includes('Failed') ||
                       resultText.includes('failed');
      expect(hasError).toBe(true);
    });
  });
});