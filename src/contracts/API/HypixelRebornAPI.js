const HypixelAPIReborn = require("hypixel-api-reborn");
const config = require("../../../config.json");

function createDisabledClient() {
  return new Proxy(
    {},
    {
      get() {
        return () => {
          throw new Error("Hypixel API client is not configured.");
        };
      }
    }
  );
}

function createClient(apiKey) {
  try {
    return new HypixelAPIReborn.Client(apiKey, {
      cache: true
    });
  } catch (error) {
    console.warn("Failed to initialize Hypixel API client:", error?.message ?? error);
    return createDisabledClient();
  }
}

const apiKey = config.minecraft?.API?.hypixelAPIkey;
const hypixel = !apiKey || apiKey === "HYPIXEL_API_KEY" ? createDisabledClient() : createClient(apiKey);

module.exports = hypixel;
