const MinecraftManager = require("./minecraft/MinecraftManager.js");
const { existsSync, mkdirSync, writeFileSync } = require("fs");
const DiscordManager = require("./discord/DiscordManager.js");
const WebsiteManager = require("./web/WebsiteManager.js");
const BridgeRegistry = require("./BridgeRegistry.js");

class BridgeInstance {
  constructor(app, bridgeConfig, index) {
    this.app = app;
    this.config = bridgeConfig;
    this.id = bridgeConfig.id ?? `bridge-${index + 1}`;

    this.minecraft = new MinecraftManager(this);
    this.discord = new DiscordManager(this);
    this.web = new WebsiteManager(this);

    this.discord.setBridge(this.minecraft);
    this.minecraft.setBridge(this.discord);

    BridgeRegistry.registerBridge(this);
  }

  connect() {
    this.discord.connect();
    this.minecraft.connect();
    this.web.connect();
  }
}

class Application {
  constructor() {
    require("./Configuration.js");
    require("./Updater.js");
    require("./Logger.js");
    if (!existsSync("./data/")) mkdirSync("./data/", { recursive: true });
    if (!existsSync("./data/linked.json")) writeFileSync("./data/linked.json", JSON.stringify({}));
    if (!existsSync("./data/inactivity.json")) writeFileSync("./data/inactivity.json", JSON.stringify({}));
  }

  async register() {
    delete require.cache[require.resolve("../config.json")];
    this.config = require("../config.json");

    if (Array.isArray(this.bridges)) {
      this.bridges.forEach((bridge) => {
        try {
          BridgeRegistry.unregisterBridge(bridge);
        } catch (error) {
          console.warn("Failed to unregister bridge during reload:", error);
        }
      });
    }

    this.bridges = this.config.bridges.map((bridgeConfig, index) => new BridgeInstance(this, bridgeConfig, index));
  }

  async connect() {
    this.bridges.forEach((bridge) => bridge.connect());
  }
}

module.exports = new Application();
