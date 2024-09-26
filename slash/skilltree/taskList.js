const {MessageActionRow, MessageSelectMenu, MessageEmbed, MessageButton} = require("discord.js");
const {romanise} = require("../../modules/romanNumeralHelper");
const {updateTask, getCurrentTasks} = require("../../modules/skillAPIHelper");
const {dayToDate, getAbsDate, getDaysBetweenDates, formatFrequency} = require("../../modules/dateHelper");
const {createLargeSwipePanel} = require("../../modules/menuHelper");
const {displayLevelUp} = require("../../modules/profileRenderer");
const {authUser, getUser} = require("../../modules/userAPIHelper");
const Challenge = require("../../objects/challenge");
const Skill = require("../../objects/skill");

/**
 * Sends an embed containing all the tasks under two categories, DAILY and ONGOING
 */
exports.run = async (client, interaction) => {
  await interaction.deferReply({ephemeral: interaction.settings.hidden});

  //Validate user exists
  const userID = await authUser(interaction.user.id);

  //Error if no account found
  if (!userID) {
    await interaction.editReply("```Error: Please create an account with /setup```");
    return;
  }

  const [tasks, timezoneOffset] = await getCurrentTasks(userID);
  if (tasks.length === 0) {
    await interaction
      .editReply("```No current tasks. Use /start to start a new skill```");
  } else {
    //Show tasks in embed
    createTaskList(client, interaction, tasks, userID, timezoneOffset);
  }
};

/**
 * Create task list
 * Has yesterday/today button to toggle previous day
 * Has combobox to select which skill has been completed
 * @param client
 * @param interaction
 * @param tasks
 * @param userID
 * @param timezoneOffset
 * @return {Promise<void>}
 */
const createTaskList = async (client, interaction, tasks, userID, timezoneOffset) => {
  const UTC = new Date(Date.parse(new Date().toUTCString()));
  const dayCreated = new Date(UTC.getTime() + timezoneOffset*3600000);
  let day = "today";
  let date = dayToDate(day, timezoneOffset);

  const embed = buildEmbed(tasks, date, timezoneOffset);
  const dropDownBox = createDropDownBox(tasks, date, timezoneOffset);

  const row = new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setCustomId("yesterday")
        .setLabel("YESTERDAY")
        .setStyle("PRIMARY")
        .setDisabled(false),
      new MessageButton()
        .setCustomId("today")
        .setLabel("TODAY")
        .setStyle("SECONDARY")
        .setDisabled(true));
  const msg = await interaction.editReply({ embeds: [embed], components: [dropDownBox,row] });

  const collector = msg.createMessageComponentCollector({time: 240000});

  collector.on("collect", async i => {
    await i.deferUpdate();
    if (i.user.id !== interaction.user.id) {
      await i.editReply({content: "You can't edit someone else's task list!", embeds: [], components: [], ephemeral: true});
      return;
    }
    if (getDaysBetweenDates(dayCreated,
      new Date(new Date().getTime() + timezoneOffset * 3600000), timezoneOffset) !== 0) {
      await i.editReply({
        content: "This task list is outdated, run the command again to get today's tasks",
        embeds: [], components: [],
        ephemeral: true
      });
      return;
    }

    if (i.isButton()) {
      day = i.customId; //today or yesterday
      date = dayToDate(day, timezoneOffset);
      if (i.customId === "today") {
        row.components[0].setStyle("PRIMARY").setDisabled(false);
        row.components[1].setStyle("SECONDARY").setDisabled(true);
      } else if (i.customId === "yesterday") {
        row.components[0].setStyle("SECONDARY").setDisabled(true);
        row.components[1].setStyle("PRIMARY").setDisabled(false);
      }
      //Get tasks
      const [newTasks, newTimezoneOffset] = await getCurrentTasks(userID);
      tasks = newTasks;
      timezoneOffset = newTimezoneOffset;
    }


    const filteredTasks = tasks.filter(task => {
      return getAbsDate(date) >= getAbsDate(task.startDate);
    });

    if (i.isSelectMenu()) {
      const skillTitle = i.values[0];
      const task = filteredTasks.find(task => task.child.getName() === skillTitle);
      if (!task) return;
      //Toggle checked
      task.setChecked(!task.isChecked(date, timezoneOffset), date, timezoneOffset);
      //Get levelup and unlocks
      const [levelUp, unlocked] = await updateTask(userID, task, date, task.isChecked(date, timezoneOffset));

      if (levelUp !== 0) {
        const user = await getUser(userID, interaction.user.username);
        displayLevelUp(user, interaction);

        tasks.splice(tasks.indexOf(task),1);
        filteredTasks.splice(filteredTasks.indexOf(task), 1);
      }
      if (unlocked.length !== 0) {
        const unlockMsg = await interaction.followUp({content: "Loading Unlocks...", ephemeral: true});
        //display unlocked items in a swipeable panel
        createLargeSwipePanel(client, {
          interaction: interaction,
          channelType: true,
          message: unlockMsg,
          user: interaction.user,
          options: {ephemeral: true, content: null}}, unlocked);
      }
    }

    // Send the same embed, but with the updated values of the tasks array.
    const embed = buildEmbed(filteredTasks, date, timezoneOffset);
    const dropDownBox = createDropDownBox(filteredTasks, date, timezoneOffset);
    const components = [];
    if (dropDownBox != null) {
      components.push(dropDownBox);
    }
    components.push(row);
    await i.editReply({embeds: [embed], components: components});
  });
}

const createDropDownBox = (tasks, date, timezoneOffset) => {
  if (tasks.length !== 0) {
    return new MessageActionRow().addComponents(
      new MessageSelectMenu().setCustomId("tasks-selection-box").setPlaceholder("Check/uncheck a task").addOptions(
        tasks.map(
          task => {
            let goal = task.child.goal;
            //If no goal found, use list of goals
            if (!goal) {
              return {
                label: task.child.getName(),
                description: task.child.goals,
                value: task.child.getName(),
                emoji: task.isChecked(date, timezoneOffset) ? "✅" : "❌",
              };
            }
            //Wrap goal if its over 100 characters
            if (goal.length > 100) {
              goal = task.child.goal.substring(0,97) + "...";
            }
            return {
              label: task.child.getName(),
              description: goal,
              value: task.child.getName(),
              emoji: task.isChecked(date, timezoneOffset) ? "✅" : "❌",
            };
          }
        )
      )
    );
  }
  return null;
}

// Helper function for building an embed in order to reduce repetition in the code.
const buildEmbed = (tasks, date, tz) => {
  const month = date.toLocaleString("default", { month: "long" });

  const dateString = `${month} ${date.getDate()}, ${date.getUTCFullYear()}`;
  const challengeTasks = tasks.filter(task => task.child instanceof Challenge);
  const dailyTasks = tasks.filter(task => task.child instanceof Skill && task.child.interval === "day");
  const otherTasks = tasks.filter(task => task.child instanceof Skill && task.child.interval !== "day");

  let dailyTaskStrings = dailyTasks.map((task) => formatTask(task, date, tz)).join("\n");
  let otherTaskStrings = otherTasks.map((task) => formatTask(task, date, tz)).join("\n");
  let challengeTaskStrings = challengeTasks.map((task) => formatTask(task, date, tz)).join("\n");

  if (dailyTaskStrings.length === 0) { dailyTaskStrings = "No daily tasks are available";}
  if (otherTaskStrings.length === 0) { otherTaskStrings = "No other tasks are available";}
  if (challengeTaskStrings.length === 0) { challengeTaskStrings = "No challenges available";}
  const messageEmbed = new MessageEmbed()
    .setTitle(`Tasks for ${dateString}`)
    .setColor("#1071E5");
  addField(messageEmbed, dailyTaskStrings, "DAILY TASKS");
  addField(messageEmbed, otherTaskStrings, "OTHER");
  addField(messageEmbed, challengeTaskStrings, "CHALLENGES");
  return messageEmbed;
}

const addField = (messageEmbed, string, title) => {
  //Chop tasks to fit field
  let chopped = string;
  let index = 0;
  while (chopped.length !== 0) {
    const chars = chopped.slice(0, 1024);
    const name = index === 0 ? title : `${title} (cont)`;

    if (chars.length < 1024) {
      messageEmbed.addField(name, chars);
      chopped = "";
    } else {
      let lastSplit = chars.lastIndexOf("\n");
      const field = chars.slice(0, lastSplit);
      chopped = chopped.slice(lastSplit++);
      messageEmbed.addField(name, field);
    }
    index++;
  }
}

const formatTask = (task, date, tz) => {
  if (task.child instanceof Challenge) {
    const checkedEmoji = task.isChecked(date, tz) ? ":white_check_mark:": ":x:";
    return `${checkedEmoji} | **${task.child.title} (${task.percentChecked(date, tz)})**: \n${task.child.goal}`;
  }
  if (task.child instanceof Skill) {
    const checkedEmoji = task.isChecked(date, tz) ? ":white_check_mark:" : ":x:";
    const levelRoman = romanise(task.child.level);

    const freq = formatFrequency(task.child.frequency, task.child.interval);
    const daysLeft = task.daysLeftInterval(date, tz);
    if (freq === "DAILY") {
      return `${checkedEmoji} | **${task.child.title} ${levelRoman} (${task.percentChecked(date, tz)} - ${daysLeft})**: \n${task.child.goal}`;
    } else {
      if (task.child.interval === "N/A") {
        return `${checkedEmoji} | **${task.child.title} ${levelRoman} (0/1)**: \n${task.child.goal}`;
      } else {
        const numForPeriod = task.numCheckedInInterval(date, tz);
        return `${checkedEmoji} | **${task.child.title} ${levelRoman} (${freq} - ${numForPeriod} - ${daysLeft})**: \n${task.child.goal}`;
      }
    }
  }
  return "";
}

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "User"
};

exports.commandData = {
  name: "tasks",
  description: "daily task list",
  options: [],
  defaultPermission: true,
  category: "Skill Tree",
};