"use strict";

/**
 * Create a bounded TTL cache.
 * @template T
 * @param {{ maxSize?: number, ttlMs?: number }} [options]
 */
function createCache(options = {}) {
  const { maxSize = 256, ttlMs = 5 * 60 * 1000 } = options;
  const store = new Map();

  /**
   * Remove expired entries and shrink the cache if it grew beyond the bound.
   * @param {number} now
   */
  function cleanup(now) {
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) {
        store.delete(key);
      }
    }

    while (store.size > maxSize) {
      const oldestKey = store.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      store.delete(oldestKey);
    }
  }

  return {
    /**
     * @param {string} key
     * @returns {T | undefined}
     */
    get(key) {
      const entry = store.get(key);
      if (!entry) {
        return undefined;
      }

      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }

      return entry.value;
    },

    /**
     * @param {string} key
     * @param {T} value
     */
    set(key, value) {
      const now = Date.now();
      store.set(key, { value, expiresAt: now + ttlMs });
      cleanup(now);
    },

    /**
     * Manually drop expired entries. Useful for tests.
     */
    cleanup() {
      cleanup(Date.now());
    }
  };
}

module.exports = { createCache };
