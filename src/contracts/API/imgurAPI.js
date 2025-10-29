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
    const client = bridge?.discord?.client;
    const channelId = bridge?.config?.discord?.channels?.guildChatChannel;
    if (!client || !channelId) {
      return;
    }

    /** @type {import('discord.js').Client} */
    // @ts-ignore
    await client.channels.cache.get(channelId).send({
      files: [image]
    });

    console.log("Image uploaded to Discord channel.");
  } catch (error) {
    console.log(error);
  }
}

module.exports = { uploadImage };
