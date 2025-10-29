const Logger = require("./Logger.js");
const fs = require("fs");

const exampleConfig = JSON.parse(fs.readFileSync("config.example.json"));
const config = JSON.parse(fs.readFileSync("config.json"));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyDefaults(target, defaults, path = []) {
  if (target === undefined || target === null) {
    return;
  }

  for (const [key, value] of Object.entries(defaults)) {
    const currentPath = [...path, key].join(".");

    if (key === "messageFormat" && target[key] && target[key].length <= 2) {
      target[key] = value;
      continue;
    }

    if (target[key] === undefined) {
      target[key] = clone(value);
      Logger.configUpdateMessage(`${currentPath}: ${JSON.stringify(value)}`);
      continue;
    }

    if (Array.isArray(value)) {
      if (Array.isArray(target[key]) && value.length > 0 && typeof value[0] === "object") {
        target[key].forEach((item, index) => applyDefaults(item, value[0], [...path, key, index]));
      }
      continue;
    }

    if (value !== null && typeof value === "object") {
      applyDefaults(target[key], value, [...path, key]);
    }
  }
}

function ensureBridgeArray(configuration, example) {
  const exampleBridge = example.bridges?.[0] ?? {};

  if (Array.isArray(configuration.bridges) === false || configuration.bridges.length === 0) {
    const legacyBridge = {
      id: configuration.minecraft?.id ?? "primary",
      minecraft: configuration.minecraft ?? clone(exampleBridge.minecraft ?? {}),
      discord: configuration.discord ?? clone(exampleBridge.discord ?? {}),
      web: configuration.web ?? clone(exampleBridge.web ?? {})
    };

    configuration.bridges = [legacyBridge];
  }

  configuration.bridges = configuration.bridges.map((bridge, index) => {
    const resolvedBridge = clone(bridge);

    applyDefaults(resolvedBridge, exampleBridge, ["bridges", index]);

    if (!resolvedBridge.id) {
      resolvedBridge.id = `bridge-${index + 1}`;
    }

    return resolvedBridge;
  });
}

ensureBridgeArray(config, exampleConfig);

const { bridges, ...exampleRest } = exampleConfig;

for (const [key, value] of Object.entries(exampleRest)) {
  if (config[key] === undefined) {
    config[key] = clone(value);
    Logger.configUpdateMessage(`${key}: ${JSON.stringify(value)}`);
  }

  if (value !== null && typeof value === "object" && Array.isArray(value) === false) {
    applyDefaults(config[key], value, [key]);
  }
}

config.bridges.forEach((bridge, index) => {
  applyDefaults(bridge, exampleConfig.bridges[0], ["bridges", index]);
});

const primaryBridge = config.bridges[0];
config.minecraft = clone(primaryBridge.minecraft ?? {});
config.discord = clone(primaryBridge.discord ?? {});
config.web = clone(primaryBridge.web ?? {});

fs.writeFileSync("config.json", JSON.stringify(config, null, 2));
