/* eslint-env jest */

const { createCache } = require("../API/utils/cache.js");

describe("createCache", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("evicts least recently used entry when exceeding max size", () => {
    const cache = createCache({ maxSize: 2, ttlMs: 10_000 });

    cache.set("a", 1);
    cache.set("b", 2);

    expect(cache.get("a")).toBe(1);

    cache.set("c", 3);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
  });

  test("removes entries that exceed their TTL", () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);

    const cache = createCache({ ttlMs: 5_000 });

    cache.set("expiring", 42);

    jest.setSystemTime(5_001);

    expect(cache.get("expiring")).toBeUndefined();
  });
});
