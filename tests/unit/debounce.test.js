import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { debounce } from '../../src/scripts.js';

describe('debounce', () => {
  it('runs once with the last arguments after the calls stop', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const calls = [];
    const debounced = debounce((value) => calls.push(value), 250);

    debounced('1');
    debounced('12');
    debounced('123');
    t.mock.timers.tick(249);
    assert.deepEqual(calls, []);

    t.mock.timers.tick(1);
    assert.deepEqual(calls, ['123']);
  });

  it('runs again for a later burst', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let runs = 0;
    const debounced = debounce(() => { runs += 1; }, 250);

    debounced();
    t.mock.timers.tick(250);
    debounced();
    t.mock.timers.tick(250);

    assert.equal(runs, 2);
  });

  it('waits 250ms unless told otherwise', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let runs = 0;

    debounce(() => { runs += 1; })();
    t.mock.timers.tick(249);
    assert.equal(runs, 0);

    t.mock.timers.tick(1);
    assert.equal(runs, 1);
  });
});