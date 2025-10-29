const HypixelAPIReborn = require("hypixel-api-reborn");
const BridgeRegistry = require("../../BridgeRegistry.js");

function createDisabledClient(reason = "Hypixel API client is not configured.") {
  return new Proxy(
    {},
    {
      get() {
        return () => Promise.reject(new Error(reason));
      }
    }
  );
}

function createClient(apiKey) {
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key || key === "HYPIXEL_API_KEY") {
    return createDisabledClient("Hypixel API key is missing or uses the default placeholder.");
  }

  try {
    return new HypixelAPIReborn.Client(key, {
      cache: true
    });
  } catch (error) {
    console.warn("Failed to initialize Hypixel API client:", error?.message ?? error);
    return createDisabledClient("Failed to initialize Hypixel API client.");
  }
}

function getHypixelClientForConfig(config) {
  if (!config) {
    return createDisabledClient("Bridge configuration is not available.");
  }

  return createClient(config.minecraft?.API?.hypixelAPIkey);
}

function getHypixelClient(options = {}) {
  if (options?.hypixel) {
    return options.hypixel;
  }

  if (options?.bridge) {
    const bridgeClient = options.bridge.minecraft?.hypixel ?? options.bridge.hypixel;
    if (bridgeClient) {
      return bridgeClient;
    }
    return getHypixelClientForConfig(options.bridge.config);
  }

  if (options?.bridgeId) {
    const bridgeById = BridgeRegistry.getBridge(options.bridgeId);
    if (bridgeById) {
      return getHypixelClient({ bridge: bridgeById });
    }
  }

  if (options?.guildId) {
    const bridgeByGuild = BridgeRegistry.getBridgeByGuildId(options.guildId);
    if (bridgeByGuild) {
      return getHypixelClient({ bridge: bridgeByGuild });
    }
  }

  const defaultBridge = BridgeRegistry.getDefaultBridge();
  if (!defaultBridge) {
    return createDisabledClient("No bridges are registered.");
  }

  return getHypixelClient({ bridge: defaultBridge });
}

module.exports = {
  createClient,
  createDisabledClient,
  getHypixelClientForConfig,
  getHypixelClient
};
