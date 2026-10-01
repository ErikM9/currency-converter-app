import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CACHE_EXPIRY,
  isCacheValid,
  parseCachedData,
  createCacheEntry,
  getStorage,
  readCache,
  writeCache
} from '../../src/scripts.js';
import { memoryStorage } from '../support/page.js';

const entry = (data, age = 0) => JSON.stringify({ data, timestamp: Date.now() - age });

describe('isCacheValid', () => {
  it('accepts a timestamp from a moment ago', () => assert.equal(isCacheValid(Date.now() - 1000), true));
  it('accepts a timestamp just inside the expiry', () => assert.equal(isCacheValid(Date.now() - CACHE_EXPIRY + 5000), true));
  it('rejects a timestamp past the expiry', () => assert.equal(isCacheValid(Date.now() - CACHE_EXPIRY - 1000), false));
  it('rejects a missing timestamp', () => assert.equal(isCacheValid(undefined), false));

  it('respects a custom expiry', () => {
    const timestamp = Date.now() - 5000;

    assert.equal(isCacheValid(timestamp, 10000), true);
    assert.equal(isCacheValid(timestamp, 1000), false);
  });
});

describe('parseCachedData', () => {
  it('returns the data from a fresh entry', () => {
    assert.deepEqual(parseCachedData(entry(['USD', 'EUR'])), ['USD', 'EUR']);
  });

  it('returns nothing for an entry past its expiry', () => {
    assert.equal(parseCachedData(entry(['USD'], CACHE_EXPIRY + 1000)), null);
  });

  for (const [label, value] of [
    ['null', null],
    ['an empty string', ''],
    ['text that is not JSON', 'not json'],
    ['JSON that is not an object', '"just a string"'],
    ['JSON null', 'null']
  ]) {
    it(`returns nothing for ${label}`, () => assert.equal(parseCachedData(value), null));
  }
});

describe('createCacheEntry', () => {
  it('stores the data with the time it was written', () => {
    const before = Date.now();

    const parsed = JSON.parse(createCacheEntry(['USD', 'EUR', 'GBP']));

    assert.deepEqual(parsed.data, ['USD', 'EUR', 'GBP']);
    assert.ok(parsed.timestamp >= before && parsed.timestamp <= Date.now());
  });

  it('writes an entry that parses back to the same data', () => {
    assert.deepEqual(parseCachedData(createCacheEntry(['USD'])), ['USD']);
  });
});

describe('getStorage', () => {
  it('hands back the storage the window offers', () => {
    const storage = memoryStorage();

    assert.equal(getStorage({ localStorage: storage }), storage);
  });

  it('reports nothing when the window has no storage', () => {
    assert.equal(getStorage({}), null);
  });

  it('reports nothing when reading storage throws, as it does when cookies are blocked', () => {
    const win = { get localStorage() { throw new Error('Access denied'); } };

    assert.equal(getStorage(win), null);
  });
});

describe('readCache and writeCache', () => {
  it('write then read returns the same list', () => {
    const storage = memoryStorage();

    assert.equal(writeCache(storage, 'currencies_cache', ['USD', 'EUR']), true);
    assert.deepEqual(readCache(storage, 'currencies_cache'), ['USD', 'EUR']);
  });

  it('reads nothing when there is no storage at all', () => {
    assert.equal(readCache(null, 'currencies_cache'), null);
  });

  it('reads nothing when storage throws on read', () => {
    const storage = { getItem() { throw new Error('Access denied'); } };

    assert.equal(readCache(storage, 'currencies_cache'), null);
  });

  it('reports a failed write rather than throwing when the quota is full', () => {
    const storage = { setItem() { throw new Error('QuotaExceededError'); } };

    assert.equal(writeCache(storage, 'currencies_cache', ['USD']), false);
  });

  it('reports a failed write when there is no storage at all', () => {
    assert.equal(writeCache(null, 'currencies_cache', ['USD']), false);
  });
});