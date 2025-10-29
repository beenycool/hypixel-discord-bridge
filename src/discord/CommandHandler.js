// eslint-disable-next-line import/extensions
const { Routes } = require("discord-api-types/v9");
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
      if (command.inactivityCommand === true && this.globalConfig.verification.inactivity.enabled == false) {
        continue;
      }

      if (command.verificationCommand === true && this.globalConfig.verification.enabled === false) {
        continue;
      }

      if (command.channelsCommand === true && this.globalConfig.statsChannels.enabled === false) {
        continue;
      }

      commands.push(command);
    }

    const rest = new REST({ version: "10" }).setToken(this.config.discord.bot.token);

    const clientID = Buffer.from(this.config.discord.bot.token.split(".")[0], "base64").toString("ascii");

    rest
      .put(Routes.applicationGuildCommands(clientID, this.config.discord.bot.serverID), { body: commands })
      .catch((e) => console.error(e));
  }
}

module.exports = CommandHandler;
