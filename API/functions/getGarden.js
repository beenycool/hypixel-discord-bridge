/* eslint-disable no-throw-literal */
const config = require("../../src/Configuration.js");
// @ts-ignore
const { get } = require("axios");

const { createCache } = require("../utils/cache.js");

const cache = createCache({ maxSize: 128 });

/**
 * Returns the garden of a profile
 * @param {string} profileID
 * @returns {Promise<{ garden: import("../../types/garden").Garden}>}
 */
async function getGarden(profileID) {
  const cached = cache.get(profileID);
  if (cached) {
    return cached;
  }

  const { data } = await get(`https://api.hypixel.net/v2/skyblock/garden?key=${config.minecraft.API.hypixelAPIkey}&profile=${profileID}`);

  if (data === undefined || data.success === false) {
    throw "Request to Hypixel API failed. Please try again!";
  }

  const gardenData = data.garden;
  if (gardenData === null || Object.keys(gardenData).length === 0) {
    // throw "Profile doesn't have a garden.";
  }

  const result = { garden: gardenData };
  cache.set(profileID, result);

  return result;
}

module.exports = { getGarden };
