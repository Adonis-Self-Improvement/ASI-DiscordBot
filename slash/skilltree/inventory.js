
const {MessageEmbed} = require("discord.js");
const {splitToN} = require("../../modules/UIHelper");
const {createLargeSwipePanel} = require("../../modules/menuHelper");
const ListPage = require("../../objects/listPage");
const {getUser, authUser} = require("../../modules/userAPIHelper");

/**
 * Inventory command, every item the user has in a swipeable menu
 */
exports.run = async (client, interaction) => { // eslint-disable-line no-unused-vars
  await interaction.deferReply({ephemeral: interaction.settings.hidden});

  //Validate user exists
  const userID = await authUser(interaction.user.id);
  //Error if no account found
  if (!userID)
    return await interaction.editReplyError({
      title: "Oops! You don't have an account yet!",
      description: "Please create an account with `~setup` first, before using this command."
    });

  const user = await getUser(userID, interaction.user.username);
  await displayInventory(client, user, interaction);
};

/**
 * Send embedded message of every item
 * @param client
 * @param user
 * @param interaction
 * @return {Promise<*>}
 */
function displayInventory(client, user, interaction) {
  if (user.items.length === 0)
    return await interaction.editReply({
      emoji: "🎒",
      title: "Your inventory:",
      description: "Looks like your inventory is empty..."
    });
  
  else {
    const items = splitToN(user.items, 10);
    const itemPages = [];
    for (let i = 0; i < items.length; i++) {
      itemPages.push(new ListPage("INVENTORY 🎒",items[i]));
    }
    createLargeSwipePanel(client, interaction, itemPages);
  }
}

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["inventory"],
  permLevel: "User"
};

exports.commandData = {
  name: "inv",
  description: "Displays your inventory",
  options: [],
  defaultPermission: true,
  category: "Skill Tree",
};
