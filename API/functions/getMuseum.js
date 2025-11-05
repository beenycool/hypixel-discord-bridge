/* eslint-disable no-throw-literal */
const config = require("../../src/Configuration.js");
// @ts-ignore
const { get } = require("axios");

const { createCache } = require("../utils/cache.js");

const cache = createCache({ maxSize: 128 });

/**
 *
 * @param {string} profileID
 * @param {string} uuid
 * @returns {Promise<object>}
 */
async function getMuseum(profileID, uuid) {
  const cacheKey = `${profileID}:${uuid}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { data } = await get(`https://api.hypixel.net/v2/skyblock/museum?key=${config.minecraft.API.hypixelAPIkey}&profile=${profileID}`);
  if (data === undefined || data.success === false) {
    throw "Request to Hypixel API failed. Please try again!";
  }

  if (data.members === null || Object.keys(data.members).length === 0) {
    // throw "Profile doesn't have a museum.";
  }

  if (data.members[uuid] === undefined) {
    // throw "Player doesn't have a museum.";
  }

  const result = {
    museum: data.members ? data.members[uuid] ?? null : null
  };

  cache.set(cacheKey, result);

  return result;
}

module.exports = { getMuseum };
