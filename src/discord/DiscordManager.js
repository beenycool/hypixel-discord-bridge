const { Client, Collection, AttachmentBuilder, GatewayIntentBits } = require("discord.js");
const CommunicationBridge = require("../contracts/CommunicationBridge.js");
const { replaceVariables } = require("../contracts/helperFunctions.js");
const messageToImage = require("../contracts/messageToImage.js");
const MessageHandler = require("./handlers/MessageHandler.js");
const StateHandler = require("./handlers/StateHandler.js");
const CommandHandler = require("./CommandHandler.js");
const fs = require("fs");
const { ErrorEmbed } = require("../contracts/embedHandler.js");

class DiscordManager extends CommunicationBridge {
  constructor(bridge) {
    super();

    this.context = bridge;
    this.app = bridge.app;
    this.config = bridge.config;
    this.discordConfig = this.config.discord;
    this.minecraftConfig = this.config.minecraft;
    this.webConfig = this.config.web;

    this.stateHandler = new StateHandler(this);
    this.messageHandler = new MessageHandler(this);
    this.commandHandler = new CommandHandler(this);
  }

  connect() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
    });

    this.client.bridge = this.context;
    this.context.client = this.client;
    globalThis.clients ??= new Map();
    globalThis.clients.set(this.context.id, this.client);
    if (!globalThis.client) {
      globalThis.client = this.client;
    }

    this.client.on("ready", () => this.stateHandler.onReady());
    this.client.on("messageCreate", (message) => this.messageHandler.onMessage(message));

    this.client.login(this.discordConfig.bot.token).catch((error) => {
      console.error(error);
    });

    this.client.commands = new Collection();
    const commandFiles = fs.readdirSync("src/discord/commands").filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const command = require(`./commands/${file}`);
      const verificationConfig = this.config.verification ?? this.app.config.verification;
      if (command.verificationCommand === true && verificationConfig?.enabled === false) {
        continue;
      }

      const inactivityConfig = verificationConfig?.inactivity ?? this.app.config.verification?.inactivity;
      if (command.inactivityCommand === true && inactivityConfig?.enabled === false) {
        continue;
      }

      const statsChannelsConfig = this.config.statsChannels ?? this.app.config.statsChannels;
      if (command.channelsCommand === true && statsChannelsConfig?.enabled === false) {
        continue;
      }

      this.client.commands.set(command.name, command);
    }

    const eventFiles = fs.readdirSync("src/discord/events").filter((file) => file.endsWith(".js"));
    for (const file of eventFiles) {
      const event = require(`./events/${file}`);
      event.once ? this.client.once(event.name, (...args) => event.execute(...args)) : this.client.on(event.name, (...args) => event.execute(...args));
    }

    process.on("SIGINT", async () => {
      await this.stateHandler.onClose();

      process.kill(process.pid, "SIGTERM");
    });
  }

  async getWebhook(type) {
    const channel = await this.stateHandler.getChannel(type);
    if (!channel) {
      return undefined;
    }
    try {
      const webhooks = await channel.fetchWebhooks();

      if (webhooks.size === 0) {
        await channel.createWebhook({
          name: "Hypixel Chat Bridge",
          avatar: "https://imgur.com/tgwQJTX.png"
        });

        return this.getWebhook(type);
      }

      return webhooks.first();
    } catch (error) {
      console.log(error);
      await channel.send({
        embeds: [new ErrorEmbed("An error occurred while trying to fetch the webhooks. Please make sure the bot has the `MANAGE_WEBHOOKS` permission.")]
      });
    }
  }

  async onBroadcast({ fullMessage, chat, chatType, username, rank, guildRank, message, color = 1752220 }) {
    if ((chat === undefined && chatType !== "debugChannel") || ((username === undefined || message === undefined) && chat !== "debugChannel")) {
      return;
    }

    const mode = chat === "debugChannel" ? this.discordConfig.channels.debugChannelMessageMode.toLowerCase() : this.discordConfig.other.messageMode.toLowerCase();
    message = ["text"].includes(mode) ? fullMessage : message;
    if (message !== undefined && chat !== "debugChannel") {
      console.broadcast(`${username} [${guildRank.replace(/§[0-9a-fk-or]/g, "").replace(/^\[|\]$/g, "")}]: ${message}`, `Discord`);
    }

    if (mode === "minecraft") {
      message = replaceVariables(this.discordConfig.other.messageFormat, { chatType, username, rank, guildRank, message });
    }

    const target = chat ?? "Guild";
    const channel = await this.stateHandler.getChannel(target);
    if (!channel) {
      console.error(
        `Channel ${String(target)
          .replace(/§[0-9a-fk-or]/g, "")
          .trim()} not found!`
      );
      return;
    }

    switch (mode) {
      case "bot":
        await channel.send({
          embeds: [
            {
              description: message,
              color: this.hexToDec(color),
              timestamp: new Date(),
              footer: {
                text: guildRank
              },
              author: {
                name: username,
                icon_url: `https://www.mc-heads.net/avatar/${username}`
              }
            }
          ]
        });

        if (message.includes("https://")) {
          const links = message.match(/https?:\/\/[^\s]+/g).join("\n");

          channel.send(links);
        }

        break;

      case "webhook":
        message = this.cleanMessage(message);
        if (message.length === 0) {
          return;
        }

        this.webhook = await this.getWebhook(chat ?? "Guild");
        if (this.webhook === undefined) {
          return;
        }

        this.webhook.send({
          content: message,
          username: username,
          avatarURL: `https://www.mc-heads.net/avatar/${username}`
        });
        break;

      case "minecraft":
        if (fullMessage.length === 0) {
          return;
        }

        await channel.send({
          files: [
            new AttachmentBuilder(await messageToImage(message, username), {
              name: `${username}.png`
            })
          ]
        });

        if (message.includes("https://")) {
          const links = message.match(/https?:\/\/[^\s]+/g).join("\n");

          channel.send(links);
        }
        break;

      case "text":
        if (message.trim().length === 0) {
          return;
        }

        await channel.send({
          content: message
        });
        break;

      default:
        throw new Error("Invalid message mode: must be bot, webhook or minecraft");
    }
  }

  async onBroadcastCleanEmbed({ message, color, channel }) {
    console.broadcast(message, "Event");

    const target = channel ?? "Guild";
    const resolvedChannel = await this.stateHandler.getChannel(target);
    if (!resolvedChannel) {
      console.log(
        `Channel ${String(target)
          .replace(/§[0-9a-fk-or]/g, "")
          .trim()} not found!`
      );
      return;
    }

    resolvedChannel.send({
      embeds: [
        {
          color: color,
          description: message
        }
      ]
    });
  }

  async onBroadcastHeadedEmbed({ message, title, icon, color, channel }) {
    console.broadcast(message, "Event");

    const target = channel ?? "Guild";
    const resolvedChannel = await this.stateHandler.getChannel(target);
    if (!resolvedChannel) {
      console.log(
        `Channel ${String(target)
          .replace(/§[0-9a-fk-or]/g, "")
          .trim()} not found!`
      );
      return;
    }

    resolvedChannel.send({
      embeds: [
        {
          color: color,
          author: {
            name: title,
            icon_url: icon
          },
          description: message
        }
      ]
    });
  }

  async onPlayerToggle({ fullMessage, username, message, color, channel }) {
    console.broadcast(message, "Event");

    const target = channel ?? "Guild";
    const resolvedChannel = await this.stateHandler.getChannel(target);
    if (!resolvedChannel) {
      console.log(
        `Channel ${String(target)
          .replace(/§[0-9a-fk-or]/g, "")
          .trim()} not found!`
      );
      return;
    }

    switch (this.discordConfig.other.messageMode.toLowerCase()) {
      case "bot":
        resolvedChannel.send({
          embeds: [
            {
              color: color,
              timestamp: new Date(),
              author: {
                name: `${message}`,
                icon_url: `https://www.mc-heads.net/avatar/${username}`
              }
            }
          ]
        });
        break;
      case "webhook":
        message = this.cleanMessage(message);
        if (message.length === 0) {
          return;
        }

        this.webhook = await this.getWebhook(target);
        if (this.webhook === undefined) {
          return;
        }

        this.webhook.send({
          username: username,
          avatarURL: `https://www.mc-heads.net/avatar/${username}`,
          embeds: [
            {
              color: color,
              description: `${message}`
            }
          ]
        });

        break;
      case "minecraft":
        await resolvedChannel.send({
          files: [
            new AttachmentBuilder(await messageToImage(fullMessage), {
              name: `${username}.png`
            })
          ]
        });
        break;
      default:
        throw new Error("Invalid message mode: must be bot or webhook");
    }
  }

  hexToDec(hex) {
    if (hex === undefined) {
      return 1752220;
    }

    if (typeof hex === "number") {
      return hex;
    }

    return parseInt(hex.replace("#", ""), 16);
  }

  cleanMessage(message) {
    if (message === undefined) {
      return "";
    }

    const format = [
      {
        regex: /<@&(\d{17,19})>/g,
        replacer: (match, role) => `@${this.client.guilds.cache.get(this.discordConfig.bot.serverID)?.roles?.cache?.get(role)?.name ?? "Unknown Role"}`
      },
      {
        regex: /<@!(\d{17,19})>/g,
        replacer: (match, id) => `@${this.client.users.cache.get(id)?.tag ?? "Unknown User"}`
      },
      {
        regex: /<@?(\d{17,19})>/g,
        replacer: (match, id) => `@${this.client.users.cache.get(id)?.tag ?? "Unknown User"}`
      },
      {
        regex: /<#(\d{17,19})>/g,
        replacer: (match, id) => `#${this.client.channels.cache.get(id)?.name ?? "Unknown Channel"}`
      }
    ];

    for (const formatElement of format) {
      message = message.replace(formatElement.regex, formatElement.replacer);
    }

    return message
      .split("\n")
      .map((part) => {
        part = part.trim();
        return part.length === 0 ? "" : part.replace(/@(everyone|here)/gi, "").trim() + " ";
      })
      .join("");
  }

  formatMessage(message, data) {
    return replaceVariables(message, data);
  }

  cleanup() {
    // Remove client from global registry
    if (globalThis.clients) {
      globalThis.clients.delete(this.context.id);
      if (globalThis.client === this.client) {
        delete globalThis.client;
      }
    }

    // Remove guild from global registry
    if (globalThis.guilds) {
      globalThis.guilds.delete(this.context.id);
      if (globalThis.guild === this.stateHandler?.guild) {
        delete globalThis.guild;
      }
    }

    // Destroy Discord client if connected
    if (this.client) {
      try {
        this.client.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

module.exports = DiscordManager;
