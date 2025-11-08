const minecraftProtocol = require("minecraft-protocol");
const config = require("../../Configuration.js");

let alphaInterval = null;

if (config.minecraft.hypixelUpdates.enabled === true && config.minecraft.hypixelUpdates.alphaPlayerCountTracker === true) {
  alphaInterval = setInterval(checkAlphaPlayerCount, 15 * 60000); // 15 minute
  checkAlphaPlayerCount();
}

// Cleanup function to clear interval
function cleanup() {
  if (alphaInterval !== null) {
    clearInterval(alphaInterval);
    alphaInterval = null;
  }
}

// Export cleanup function for bridge cleanup
module.exports.cleanup = cleanup;

let lastPlayerCount = 0;
let lastMessageTime = 0;
const MESSAGE_COOLDOWN = 60 * 60 * 1000; // 1 hour

async function checkAlphaPlayerCount() {
  try {
    if (!bot || !bot.chat) {
      return;
    }

    const response = await minecraftProtocol.ping({
      host: "alpha.hypixel.net",
      port: 25565,
      version: "1.8.9"
    });

    if (response && response.players) {
      const currentPlayerCount = response.players.online;
      const currentTime = Date.now();

      if (currentPlayerCount > 10 && lastPlayerCount <= 10 && currentTime - lastMessageTime >= MESSAGE_COOLDOWN) {
        bot.chat(`/gc [ALPHA] Alpha Hypixel is open, current player count: ${currentPlayerCount}`);
        lastMessageTime = currentTime;
      }

      lastPlayerCount = currentPlayerCount;
    }
  } catch (error) {
    console.error("Error checking Alpha Hypixel player count:", error);
  }
}
