import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, createApi, nextTimer } from '../support/page.js';

/* Nothing is laid out in jsdom, so the sizes the scrollbar maths depends on are set by hand */
const giveSize = (element, sizes) => {
  Object.entries(sizes).forEach(([name, value]) => {
    Object.defineProperty(element, name, { configurable: true, value });
  });
};

const mouse = (page, target, type, position = {}) =>
  target.dispatchEvent(new page.window.MouseEvent(type, { bubbles: true, cancelable: true, ...position }));

describe('dropdown scrollbar', () => {
  let page;
  let list;
  let track;
  let thumb;

  beforeEach(async () => {
    page = await loadPage({ api: createApi({ currencies: ['USD', 'EUR', 'GBP', 'JPY'] }) });
    list = page.from.list;
    track = page.from.wrapper.querySelector('.sb-track');
    thumb = page.from.wrapper.querySelector('.sb-thumb');
  });

  it('gives each dropdown its own scrollbar', () => {
    assert.ok(track && thumb);
    assert.ok(page.to.wrapper.querySelector('.sb-thumb'));
  });

  it('sizes and positions the thumb against the visible slice of the list', () => {
    giveSize(list, { clientHeight: 200, scrollHeight: 400, scrollTop: 100 });
    giveSize(track, { clientHeight: 100 });
    page.click(page.from.combobox);

    list.dispatchEvent(new page.window.Event('scroll'));

    assert.equal(thumb.style.height, '50px');
    assert.equal(thumb.style.top, '25px');
  });

  it('leaves the thumb alone when the list fits without scrolling', () => {
    giveSize(list, { clientHeight: 200, scrollHeight: 200 });

    list.dispatchEvent(new page.window.Event('scroll'));

    assert.equal(thumb.style.height, '');
  });

  it('jumps the list when the track is clicked', () => {
    giveSize(list, { clientHeight: 200, scrollHeight: 400 });
    giveSize(track, { clientHeight: 100 });
    giveSize(thumb, { offsetHeight: 50 });

    mouse(page, track, 'mousedown', { clientY: 50 });

    assert.equal(list.scrollTop, 100);
  });

  it('scrolls the list while the thumb is dragged', () => {
    giveSize(list, { clientHeight: 200, scrollHeight: 400 });
    giveSize(track, { clientHeight: 100 });
    giveSize(thumb, { offsetHeight: 50 });

    mouse(page, thumb, 'mousedown', { clientY: 0 });
    mouse(page, page.document, 'mousemove', { clientY: 25 });

    assert.equal(list.scrollTop, 100);
    assert.equal(thumb.classList.contains('dragging'), true);
  });

  /* A converter zoomed to 125% reports a 100px track as 125 screen pixels tall, so mouse movement is scaled back before it moves the list */
  it('follows the pointer when the converter is zoomed', () => {
    giveSize(list, { clientHeight: 200, scrollHeight: 400 });
    giveSize(track, { clientHeight: 100, getBoundingClientRect: () => ({ top: 0, height: 125 }) });
    giveSize(thumb, { offsetHeight: 50 });

    mouse(page, thumb, 'mousedown', { clientY: 0 });
    mouse(page, page.document, 'mousemove', { clientY: 25 });
    assert.equal(list.scrollTop, 80);

    mouse(page, page.document, 'mouseup', { clientY: 25 });
    mouse(page, track, 'mousedown', { clientY: 62.5 });
    assert.equal(list.scrollTop, 100);
  });

  it('keeps the dropdown open when a drag ends outside it', () => {
    page.click(page.from.combobox);

    mouse(page, thumb, 'mousedown', { clientY: 0 });
    mouse(page, page.document, 'mouseup', { clientY: 40 });
    page.click(page.heading);

    assert.equal(page.from.isOpen(), true);
  });

  it('closes on the next click once the drag is over', async () => {
    page.click(page.from.combobox);
    mouse(page, thumb, 'mousedown', { clientY: 0 });
    mouse(page, page.document, 'mouseup', { clientY: 40 });
    await nextTimer();

    page.click(page.heading);

    assert.equal(page.from.isOpen(), false);
  });

  it('takes away the overlay that blocks hovering during a drag', () => {
    const before = page.document.body.children.length;

    mouse(page, thumb, 'mousedown', { clientY: 0 });
    assert.equal(page.document.body.children.length, before + 1);

    mouse(page, page.document, 'mouseup', { clientY: 0 });
    assert.equal(page.document.body.children.length, before);
  });

  it('scrolls the list rather than the page on a wheel turn', () => {
    const scrolls = [];
    list.scrollBy = (options) => scrolls.push(options);

    const event = new page.window.WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
    list.dispatchEvent(event);

    assert.deepEqual(scrolls, [{ top: 120, behavior: 'smooth' }]);
    assert.equal(event.defaultPrevented, true);
  });

});