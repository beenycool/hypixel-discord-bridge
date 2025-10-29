// const { ImgurClient } = require("imgur");
const BridgeRegistry = require("../../BridgeRegistry.js");

// const imgurClient = new ImgurClient({
//   clientId: config.minecraft.API.imgurAPIkey
// });

/**
 * Uploads image to Discord channel
 * @param {Buffer<ArrayBufferLike>} image
 */
async function uploadImage(image, bridgeId) {
  // const response = await imgurClient.upload({
  //  image: image
  // });
  // if (response.success === false) {
  //    throw "An error occured while uploading the image. Please try again later.";
  // }
  // return response;

  try {
    const bridge = BridgeRegistry.getBridge(bridgeId) ?? BridgeRegistry.getDefaultBridge();
    if (!bridge) {
      throw new Error("Unable to resolve a bridge for image upload.");
    }

    const client = bridge.discord?.client;
    const channelId = bridge.config?.discord?.channels?.guildChatChannel;
    if (!client || !channelId) {
      throw new Error(`Unable to upload image: Discord client or channel not configured for bridge ${bridgeId ?? bridge.id}`);
    }

    const channel = client.channels.cache.get(channelId);
    if (!channel) {
      throw new Error(`Unable to upload image: Channel ${channelId} not found for bridge ${bridge.id}`);
    }

    await channel.send({
      files: [image]
    });

    console.log("Image uploaded to Discord channel.");
  } catch (error) {
    console.log(error);
    throw error;
  }
}

module.exports = { uploadImage };
