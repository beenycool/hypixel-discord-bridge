// eslint-disable-next-line import/extensions
const { Routes } = require("discord-api-types/v10");
const { REST } = require("@discordjs/rest");
const fs = require("fs");

class CommandHandler {
  constructor(discord) {
    this.discord = discord;
    this.config = discord.config;
    this.globalConfig = discord.app.config;

    const commands = [];
    const commandFiles = fs.readdirSync("src/discord/commands").filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const command = require(`./commands/${file}`);
      const verificationConfig = this.config.verification ?? this.globalConfig.verification ?? {};
      if (command.inactivityCommand === true && verificationConfig?.inactivity?.enabled === false) {
        continue;
      }

      if (command.verificationCommand === true && verificationConfig?.enabled === false) {
        continue;
      }

      const statsChannelsConfig = this.config.statsChannels ?? this.globalConfig.statsChannels;
      if (command.channelsCommand === true && statsChannelsConfig?.enabled === false) {
        continue;
      }

      commands.push(command);
    }

    const rest = new REST({ version: "10" }).setToken(this.config.discord.bot.token);

    const clientID = this.config.discord.bot.applicationId;

    rest.put(Routes.applicationGuildCommands(clientID, this.config.discord.bot.serverID), { body: commands }).catch((e) => console.error(e));
  }
}

module.exports = CommandHandler;
