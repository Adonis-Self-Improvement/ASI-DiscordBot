const {MessageActionRow, MessageButton, MessageEmbed} = require("discord.js");
const {MessageSelectMenu} = require("discord.js");

/** @module createSwipePanel */

/**
 * Create swipeable panel
 * Adds left/right embedded buttons to a discord message to navigate through a swipeable list
 * List is cyclic and cycles back to the start
 * @param interaction - discord interaction
 * @param embed - embed to query
 * @param files - optional files to include
 */
exports.createYesNoPanel = async (interaction, embed, files=[]) => {
  //Add left/right messageButton to message
  const row = new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setCustomId("yes")
        .setLabel("YES")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("no")
        .setLabel("NO")
        .setStyle("PRIMARY"),
    );
  const followUp = await interaction.followUp({embeds: [embed], files: files, components: [row], ephemeral: interaction.settings.hidden});

  //Create listener for button events
  const filter = i => (i.customId === "yes" || i.customId === "no") && i.user.id === interaction.user.id;
  const collector = await followUp.createMessageComponentCollector({componentType : "BUTTON", filter, time: 240000});
  return await new Promise((resolve, reject) => {
    collector.on("collect", async i => {
      await i.deferUpdate();
      switch (i.customId) {
        case "yes":
          resolve(true);
          break;
        case "no":
          resolve(false);
          break;
        default:
          reject(new Error("Invalid option in yes/no panel"));
          break;
      }
    });
  });
};

/**
 * Create swipeable panel
 * Adds left/right embedded buttons to a discord message to navigate through the swipeable list
 * List is cyclic and cycles back to the start
 * @param {Client} client - Discord bot client
 * @param interaction - Message from the user
 * @param list - List of swipeable objects
 * @param actions - action name: string, description: string, action: function map
 * item as parameter - return value is T/F based on whether this item will be removed or not
 * @param refresh - action to happen on update
 */
exports.createLargeSwipePanel = async (client, interaction,
  list, actions = null, refresh=null) => {
  let currentPage = 0;
  let options = await update(interaction, list, currentPage, actions);
  let message;
  // eslint-disable-next-line no-prototype-builtins
  if (Object.prototype.hasOwnProperty.call(interaction, "channelType")) {
    if (Object.prototype.hasOwnProperty.call(interaction,"options")) {
      options = Object.assign({}, options, interaction.options);
    }
    await interaction.interaction.webhook.editMessage(interaction.message, options);
    message = interaction.message;
  } else {
    message = await interaction.editReply(options);
  }

  //Create listener for navigation events
  const filter = i => (i.customId === "prev"
    || i.customId === "next"
    || i.customId === "first"
    || i.customId === "last") && i.user.id === interaction.user.id;

  const collector = message.createMessageComponentCollector({filter, time: 240000});
  collector.on("collect", async i => {
    if (!i.isButton()) return;
    if (i.deferred) {return;}
    await i.deferUpdate();

    switch (i.customId) {
      case "first":
        currentPage = 0;
        break;
      case "prev":
        currentPage--;
        if (currentPage === -1) currentPage = list.length - 1;
        break;
      case "next":
        currentPage++;
        if (currentPage === list.length) currentPage = 0;
        break;
      case "last":
        currentPage = list.length - 1;
        if (currentPage === -1) currentPage = list.length - 1;
        break;
      default:
        break;
    }
    options = await update(interaction, list, currentPage, actions);
    message = await i.editReply(options);
  });


  //Create action listener
  if (actions == null) return;

  const actionFilter = i => i.user.id === interaction.user.id;
  const actionCollector = message.createMessageComponentCollector({actionFilter, time: 120000});
  actionCollector.on("collect", async i => {
    if (!i.isSelectMenu()) return;
    if (i.deferred) return;
    await i.deferUpdate();

    //If action found
    const action = actions.filter(v => v.name === i.values[0])[0];
    if (action) {
      const deleteItem = await action.action(list[currentPage]);
      //Delete item on action
      if (deleteItem) {
        const toRemove = list[currentPage];
        list = list.filter(i => i !== toRemove);
        //Set page index
        currentPage = Math.max(currentPage - 1, 0);
        if (refresh) {
          list = await refresh();
        }
        options = await update(interaction, list, currentPage, actions);
        await i.editReply(options);
      }
    }
  });

  return message;
};

/**
 * Create swipeable panel with different actions for each page
 * Adds left/right embedded buttons to a discord message to navigate through the swipeable list
 * List is cyclic and cycles back to the start
 * @param {Client} client - Discord bot client
 * @param interaction
 * @param list
 * @param actions - action name: string, description: string, action: function map
 * item as parameter - return value is T/F based on whether this item will be removed or not
 */
exports.createLargeMultiActionSwipePanel = async (client, interaction,
  list, actions = null) => {
  let currentPage = 0;

  let options = await update(interaction, list, currentPage, actions[currentPage]);
  let followUp = await interaction.editReply(options);

  //Create listener for navigation events
  const filter = i => (i.customId === "prev"
    || i.customId === "next"
    || i.customId === "first"
    || i.customId === "last") && i.user.id === interaction.user.id;

  const collector = followUp.createMessageComponentCollector({filter, time: 120000});
  collector.on("collect", async i => {
    if (!i.isButton()) return;
    await i.deferUpdate();

    switch (i.customId) {
      case "first":
        currentPage = 0;
        break;
      case "prev":
        currentPage--;
        if (currentPage === -1) currentPage = list.length - 1;
        break;
      case "next":
        currentPage++;
        if (currentPage === list.length) currentPage = 0;
        break;
      case "last":
        currentPage = list.length - 1;
        if (currentPage === -1) currentPage = list.length - 1;
        break;
      default:
        break;
    }
    options = await update(interaction, list, currentPage, actions[currentPage]);
    await i.editReply(options);
  });


  //Create action listener
  if (actions === null) return;

  const actionFilter = i => i.user.id === interaction.user.id;
  const actionCollector = followUp.createMessageComponentCollector({actionFilter, time: 120000});
  actionCollector.on("collect", async i => {
    if (!i.isSelectMenu()) return;
    await i.deferUpdate();

    //If action found
    const action = actions[currentPage].filter(v => v.name === i.values[0])[0];
    if (action) {
      const actionIndex = actions[currentPage].indexOf(action);
      const deleteItem = await action.action(list[currentPage].list[actionIndex]);
      //Delete item on action
      if (deleteItem) {
        list[currentPage].list.splice(actionIndex,1);
        actions[currentPage].splice(actionIndex,1);
        if (list[currentPage].list.length === 0) {
          list.splice(currentPage, 1);
        }
        //Set page index
        currentPage = Math.max(currentPage - 1, 0);
        options = await update(interaction, list, currentPage, actions[currentPage]);
        followUp = await i.editReply(options);
      }
    }
  });

  return followUp;
};


const update = async (interaction, list, currentPage, actions) => {
  //check for empty list
  if (list.length === 0) {
    const embed = new MessageEmbed();
    embed.setTitle("EMPTY");
    embed.setDescription("No more items to display");
    embed.setThumbnail("");
    embed.setImage("");
    if (Object.prototype.hasOwnProperty.call(interaction,"channelType")) {
      await interaction.interaction.webhook.editMessage(interaction.message,
        {embeds: [embed], components: [], attachments: [], thumbnails: [], images: []});
    } else {
      await interaction.editReply({embeds: [embed], components: [], attachments: [], thumbnails: [], images: []});
    }
    return;
  }

  //Add navigation buttons to row
  const components = [];
  const row = createRow(currentPage, list.length);
  components.push(row);
  if (actions) {
    components.push(createDropDownBox(actions));
  }

  //update embed to show current page
  const data = await list[currentPage].update();
  return {embeds: data[0], components: components, files: data[1], attachments: [], thumbnails: [], images: []};
}

const createRow = (currentPage, length) => {
  return new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setCustomId("first")
        .setLabel("FIRST")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("prev")
        .setLabel("PREV")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("current")
        .setLabel(`${currentPage + 1}/${length}`)
        .setStyle("SECONDARY")
        .setDisabled(true),
      new MessageButton()
        .setCustomId("next")
        .setLabel("NEXT")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("last")
        .setLabel("LAST")
        .setStyle("PRIMARY"),
    );
}

const createDropDownBox = actions => {
  const actionList = actions.map(a => a.name).join("/").slice(0,100);
  return new MessageActionRow().addComponents(
    new MessageSelectMenu().setCustomId("actions").setPlaceholder(actionList).addOptions(
      actions.map(
        action => {
          return {
            customId: action.name,
            label: action.name,
            description: action.description,
            value: action.name,
          };
        }
      )
    )
  );
}
