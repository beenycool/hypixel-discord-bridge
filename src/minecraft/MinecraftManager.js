const CommunicationBridge = require("../contracts/CommunicationBridge.js");
const { replaceVariables } = require("../contracts/helperFunctions.js");
const StateHandler = require("./handlers/StateHandler.js");
const ErrorHandler = require("./handlers/ErrorHandler.js");
const ChatHandler = require("./handlers/ChatHandler.js");
const CommandHandler = require("./CommandHandler.js");
const mineflayer = require("mineflayer");
const Filter = require("bad-words");

class MinecraftManager extends CommunicationBridge {
  constructor(bridge) {
    super();

    this.context = bridge;
    this.app = bridge.app;
    this.config = bridge.config;
    this.minecraftConfig = this.config.minecraft;
    this.discordConfig = this.config.discord;
    this.webConfig = this.config.web;

    this.filter = new Filter();
    const filteredWords = this.discordConfig.other?.filterWords ?? [];
    if (Array.isArray(filteredWords) && filteredWords.length > 0) {
      this.filter.addWords(...filteredWords);
    }

    this.stateHandler = new StateHandler(this);
    this.errorHandler = new ErrorHandler(this);
    this.chatHandler = new ChatHandler(this, new CommandHandler(this));
  }

  connect() {
    this.bot = this.createBotConnection();

    this.errorHandler.registerEvents(this.bot);
    this.stateHandler.registerEvents(this.bot);
    this.chatHandler.registerEvents(this.bot);

    this.bot.on("login", () => {
      console.log("Minecraft bot is ready!");
      require("./other/eventNotifier.js");
      require("./other/skyblockNotifier.js");
      require("./other/alphaPlayerCountTracker.js");
    });
  }

  createBotConnection() {
    return mineflayer.createBot({
      host: "mc.hypixel.net",
      port: 25565,
      auth: "microsoft",
      version: "1.8.9",
      viewDistance: "tiny",
      chatLengthLimit: 256,
      profilesFolder: "./auth-cache"
    });
  }

  async onBroadcast({ channel, username, message, replyingTo, discord }) {
    console.broadcast(`${username}: ${message}`, "Minecraft");
    if (this.bot.player === undefined) {
      return;
    }

    if (
      channel === this.discordConfig.channels.debugChannel &&
      this.discordConfig.channels.debugMode === true
    ) {
      return this.bot.chat(message);
    }

    if (this.discordConfig.other.filterMessages) {
      try {
        message = this.filter.clean(message);
        username = this.filter.clean(username);
      } catch (error) {
        // Do nothing
      }
    }

    if (this.discordConfig.other.stripEmojisFromUsernames) {
      try {
        username = username.replace(/:[\w\-_]+:/g, '');
      } catch (error) {
        // Do nothing
      }
    }

    message = replaceVariables(this.minecraftConfig.bot.messageFormat, { username, message });

    const chat = channel === this.discordConfig.channels.officerChannel ? "/oc" : "/gc";

    if (replyingTo) {
      message = message.replace(username, `${username} replying to ${replyingTo}`);
    }

    let successfullySent = false;
    const messageListener = (receivedMessage) => {
      receivedMessage = receivedMessage.toString();

      if (
        receivedMessage.trim().includes(message.trim()) &&
        (this.chatHandler.isGuildMessage(receivedMessage) || this.chatHandler.isOfficerMessage(receivedMessage))
      ) {
        this.bot.removeListener("message", messageListener);
        successfullySent = true;
      }
    };

    this.bot.on("message", messageListener);
    this.bot.chat(`${chat} ${message}`);

    setTimeout(() => {
      this.bot.removeListener("message", messageListener);
      if (successfullySent === true) {
        return;
      }

      discord.react("❌");
    }, 500);
  }
}

module.exports = MinecraftManager;
