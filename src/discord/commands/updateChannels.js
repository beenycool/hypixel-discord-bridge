const { getHypixelClient } = require("../../contracts/API/HypixelRebornAPI.js");
const { replaceVariables } = require("../../contracts/helperFunctions.js");
const { SuccessEmbed } = require("../../contracts/embedHandler.js");
const BridgeRegistry = require("../../BridgeRegistry.js");
const config = require("../../Configuration.js");

module.exports = {
  name: "update-channels",
  description: "Update the stats Channels",
  channelsCommand: true,
  moderatorOnly: true,
  requiresBot: true,

  execute: async (interaction, extra = {}) => {
    const bridge = BridgeRegistry.getBridgeByGuildId(interaction.guildId) ?? interaction.client?.bridge ?? BridgeRegistry.getDefaultBridge();
    if (!bridge) {
      throw new Error("Unable to locate a bridge for this guild.");
    }

    const hypixel = getHypixelClient({ bridge });
    const bot = bridge.minecraft?.bot ?? global.bot;
    const guild = bridge.discord?.stateHandler?.guild ?? global.guild;

    if (!bot || !guild) {
      throw new Error("Bridge clients are not ready. Please try again later.");
    }

    const hypixelGuild = await hypixel.getGuild("player", bot.username);
    const [channels, roles] = await Promise.all([guild.channels.fetch(), guild.roles.fetch()]);

    const stats = {
      guildName: hypixelGuild.name,
      guildLevel: hypixelGuild.level.toFixed(0),
      guildLevelWithProgress: hypixelGuild.level,
      guildXP: hypixelGuild.experience,
      guildWeeklyXP: hypixelGuild.totalWeeklyGexp,
      guildMembers: hypixelGuild.members.length,
      discordMembers: guild.memberCount,
      discordChannels: channels.size,
      discordRoles: roles.size
    };

    config.statsChannels.channels.forEach(async (channelInfo) => {
      const channel = await guild.channels.fetch(channelInfo.id);
      // console.log(`Updating channel ${channel.name} with ID ${channel.id} to ${replaceVariables(channelInfo.name, stats)}`);
      channel.setName(replaceVariables(channelInfo.name, stats), "Updated Channels");
    });

    if (!extra.hidden) {
      const embed = new SuccessEmbed("The channels have been updated successfully.").setFooter({
        text: `by @kathund. | /help [command] for more information`,
        iconURL: "https://i.imgur.com/uUuZx2E.png"
      });

      await interaction.followUp({ embeds: [embed] });
    }
  }
};
