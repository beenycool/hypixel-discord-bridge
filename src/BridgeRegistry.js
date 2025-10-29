const bridges = new Map();

function registerBridge(bridge) {
  if (!bridge || !bridge.id) {
    throw new Error("BridgeRegistry.registerBridge: bridge.id is required");
  }

  if (bridges.has(bridge.id)) {
    console.warn(`BridgeRegistry: overwriting existing bridge id=${bridge.id}`);
  }

  bridges.set(bridge.id, bridge);
}

function unregisterBridge(bridge) {
  if (!bridge) {
    return;
  }

  bridges.delete(bridge.id);
}

function getBridge(id) {
  if (id) {
    return bridges.get(id);
  }

  return undefined;
}

function getBridgeByGuildId(guildId) {
  if (!guildId) {
    return undefined;
  }

  for (const bridge of bridges.values()) {
    if (bridge?.config?.discord?.bot?.serverID === guildId) {
      return bridge;
    }
  }

  return undefined;
}

function getDefaultBridge() {
  const iterator = bridges.values();
  const first = iterator.next();
  return first.done ? undefined : first.value;
}

module.exports = {
  registerBridge,
  unregisterBridge,
  getBridge,
  getBridgeByGuildId,
  getDefaultBridge
};
