const {MessageEmbed, MessageAttachment} = require("discord.js");
const Swipeable = require("./swipeable");
const {imageToBuffer} = require("../modules/UIHelper");
/**
 * Item Object
 */
class Item extends Swipeable {
  /**
   * Create Item object
   * @constructor
   * @param {string} name - Item name (e.g. GUIDE TO SELF IMPROVEMENT)
   * @param {string} link - The link to the item resource
   * @param {?string=} emoji - the emoiji to display with the item
   * @returns {exports}
   */
  constructor(name, link, emoji=null) {
    super();
    this.name = name;
    this.link = link;
    this.emoji = emoji;
  }

  /**
   * Sends an embedded item in the chat
   * @param client
   * @param channel
   */
  async send(client, channel) {
    const icon = new MessageAttachment(await imageToBuffer("icons/chest.png", 64), "icon.png");
    const embed = this.update(new MessageEmbed());
    channel.send({embeds: [embed], files: [icon]});
  }

  /**
   * Updates properties of embed with values from this class
   * @param embed
   */
  update(embed) {
    let description = `+ [${this.name}](${this.link})`;
    if (this.emoji != null) description += ` (${this.emoji})`;

    embed.setColor("#1071E5");
    embed.setTitle("```[ITEM(S) FOUND]```");
    embed.setThumbnail("attachment://icon.png");
    embed.setDescription(description);
    embed.setTimestamp();
    return embed;
  }
}

module.exports = Item;
