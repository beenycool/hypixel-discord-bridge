// @ts-ignore
const { get } = require("axios");
const { createCache } = require("../../../API/utils/cache.js");

const HALF_DAY_MS = 12 * 60 * 60 * 1000;
const uuidCache = createCache({ maxSize: 1024, ttlMs: HALF_DAY_MS });
const usernameCache = createCache({ maxSize: 1024, ttlMs: HALF_DAY_MS });

/**
 * Get UUID from username
 * @param {string} username
 * @returns {Promise<string>}
 */
async function getUUID(username) {
  try {
    const cached = uuidCache.get(username);
    if (cached) {
      return cached;
    }

    const { data } = await get(`https://mowojang.matdoes.dev/${username}`);

    if (data.errorMessage || data.id === undefined) {
      throw data.errorMessage ?? "Invalid username.";
    }

    uuidCache.set(username, data.id);

    return data.id;
  } catch (error) {
    // @ts-ignore
    if (error.response?.data === "Not found") throw "Invalid username.";
    console.error(error);
    throw error;
  }
}

/**
 * Get username from UUID
 * @param {string} uuid
 * @returns {Promise<string>}
 */
async function getUsername(uuid) {
  try {
    const cached = usernameCache.get(uuid);
    if (cached) {
      return cached;
    }

    const { data } = await get(`https://mowojang.matdoes.dev/${uuid}`);
    if (data.errorMessage || data.name === undefined) {
      throw data.errorMessage ?? "Invalid UUID.";
    }

    usernameCache.set(uuid, data.name);

    return data.name;
  } catch (error) {
    console.error(error);
    // @ts-ignore
    if (error.response?.data === "Not found") throw "Invalid UUID.";
    throw error;
  }
}

/**
 * Get UUID from username
 * @param {string} username
 * @returns {Promise<{ username: string, uuid: string }>}
 */
async function resolveUsernameOrUUID(username) {
  try {
    const { data } = await get(`https://mowojang.matdoes.dev/${username}`);

    return {
      username: data.name,
      uuid: data.id
    };
  } catch (error) {
    // @ts-ignore
    if (error.response?.data === "Not found") throw "Invalid Username Or UUID.";
    console.error(error);
    throw error;
  }
}

module.exports = { getUUID, getUsername, resolveUsernameOrUUID };
