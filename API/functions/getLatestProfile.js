/* eslint-disable no-throw-literal */
const { getUUID, getUsername } = require("../../src/contracts/API/mowojangAPI.js");
const { formatUsername } = require("../../src/contracts/helperFunctions.js");
const { getMuseum } = require("./getMuseum.js");
const { getGarden } = require("./getGarden.js");
const { isUuid } = require("../utils/uuid.js");
const config = require("../../src/Configuration.js");
// @ts-ignore
const { get } = require("axios");
const { createCache } = require("../utils/cache.js");

const cache = createCache({ maxSize: 128 });

/**
 *
 * @param {string} uuid
 * @param {{
 *  museum?: boolean,
 *  garden?: boolean
 * }} options
 * @returns {Promise<{
 * username: string,
 * profile: import("../../types/profiles").Member,
 * profileData: import("../../types/profiles").Profile,
 * museum?: object,
 * garden?: import("../../types/garden.js").Garden
 * }>}
 */
async function getLatestProfile(uuid, options = { museum: false, garden: false }) {
  if (!isUuid(uuid)) {
    uuid = await getUUID(uuid).catch((error) => {
      throw error;
    });
  }

  const cached = cache.get(uuid);
  const needsMuseum = options.museum && (!cached || cached.museum === undefined);
  const needsGarden = options.garden && (!cached || cached.garden === undefined);

  if (cached && !needsMuseum && !needsGarden) {
    return cached;
  }

  let result = cached;

  if (!result) {
    const [username, { data: profileRes }] = await Promise.all([
      getUsername(uuid),
      get(`https://api.hypixel.net/v2/skyblock/profiles?key=${config.minecraft.API.hypixelAPIkey}&uuid=${uuid}`)
    ]).catch((error) => {
      throw error?.response?.data?.cause ?? "Request to Hypixel API failed. Please try again!";
    });

    if (profileRes.success === false) {
      throw "Request to Hypixel API failed. Please try again!";
    }

    /** @type {import("../../types/profiles").Profile[]} */
    const allProfiles = profileRes.profiles;
    if (allProfiles == null || allProfiles.length == 0) {
      throw "Player has no SkyBlock profiles.";
    }

    const profileData = allProfiles.find((a) => a.selected) || null;
    if (profileData == null) {
      throw "Player does not have selected profile.";
    }

    const profile = profileData.members[uuid];
    if (profile === null) {
      throw "Uh oh, this player is not in this Skyblock profile.";
    }

    result = {
      username: formatUsername(username, profileData.game_mode),
      profile: profile,
      profileData: profileData
    };
  }

  const extras = [];

  if (needsMuseum && result?.profileData) {
    extras.push(
      getMuseum(result.profileData.profile_id, uuid).then((museumData) => ({ museum: museumData.museum }))
    );
  }

  if (needsGarden && result?.profileData) {
    extras.push(
      getGarden(result.profileData.profile_id).then((gardenData) => gardenData)
    );
  }

  if (extras.length > 0 && result) {
    const resolvedExtras = await Promise.all(extras);
    for (const extra of resolvedExtras) {
      Object.assign(result, extra);
    }
  }

  if (!result) {
    throw "Unable to resolve SkyBlock profile.";
  }

  cache.set(uuid, result);

  return result;
}

module.exports = { getLatestProfile };
