const bridges = new Map();

function registerBridge(bridge) {
  bridges.set(bridge.id, bridge);
}

function unregisterBridge(bridge) {
  bridges.delete(bridge.id);
}

function getBridge(id) {
  if (id) {
    return bridges.get(id);
  }

  return undefined;
}

function getDefaultBridge() {
  const iterator = bridges.values();
  const first = iterator.next();
  return first.value;
}

module.exports = {
  registerBridge,
  unregisterBridge,
  getBridge,
  getDefaultBridge
};
