const {MessageAttachment} = require("discord.js");
const Canvas = require("canvas");
const XPHelper = require("./XPHelper");
const {drawBadge} = require("../objects/badge");
const Skill = require("../objects/skill");
const Challenge = require("../objects/challenge");
const {getDaysBetweenDates} = require("./dateHelper");


/** @module WeeklyReviewRenderer */

/**
 * Sends an embedded weekly review, including xp gained, new items, skills completed
 * skill consistency and more
 * @param user - Skill tree user object
 * @param channel - the channel to send the message to
 * @param tasks - tasks to display
 */

exports.displayReview = async (user, channel, tasks) => {
  const reviewImage = new MessageAttachment(await getWeeklyReview(user, tasks), `${user.name}_review.png`);

  return channel.send({content: `<@${user.discordid}> your weekly report has been published`, files: [reviewImage]});
};

/**
 * Generate the weekly review for this user
 * @param user - Skill tree user object
 * @param tasks - Tasks to display
 * @return {Promise<Buffer>} buffer -
 */
const getWeeklyReview = async (user, tasks) => {
  const canvas = Canvas.createCanvas(400, 800);
  const context = canvas.getContext("2d");

  //Canvas settings
  context.antialias = "default";
  context.quality = "nearest";
  context.imageSmoothingEnabled = false;
  context.font = "30px \"Akira\"";

  //background
  const background = await Canvas.loadImage("./assets/backgrounds/weekly_report.png");
  context.drawImage(background, 0, 0, background.width, background.height);

  await drawHeaderFooter(canvas, user);

  await drawXP(canvas, user,20, 150, 360, 30);
  await drawTasks(canvas, user, tasks,0,190,400);

  //return final buffer
  return canvas.toBuffer();
}


/**
 * Draw header banner and title, as well as footer banner and skill tree logo
 * @param canvas
 * @return {Promise<void>}
 */
const drawHeaderFooter = async (canvas, user) => {
  const context = canvas.getContext("2d");
  context.font = "30px \"Akira\"";

  const header = await Canvas.loadImage("./assets/backgrounds/bg2.png");
  context.drawImage(header, 0, -80, header.width, header.height);

  const footer = await Canvas.loadImage("./assets/backgrounds/bg2.png");
  context.drawImage(footer, 0, 800 - 50, footer.width, footer.height);

  context.shadowColor = "rgba(255,198,7,1.0)";
  context.shadowBlur = 10;
  context.fillStyle = "rgba(255,255,255,1)";
  const title = "WEEKLY REPORT";
  const headerWidth = context.measureText(title).width;

  context.fillText(title, 200 - headerWidth*0.5, 70);
  context.shadowBlur = 20;
  context.fillRect(0,120,400,3);

  context.font = "20px \"Akira\"";
  const metric = context.measureText(user.username);
  const width = Math.min(metric.width, 300);
  context.fillText(user.username, 200 - width*0.5, 100, 300);

  context.font = "30px \"Akira\"";
  context.shadowBlur = 20;
  context.fillRect(0,800 - 50,400,3);
  context.shadowBlur = 0;

  context.font = "15px \"Akira\"";
  context.shadowBlur = 5;
  const footerText = "SKILL TREE";
  const footerWidth = context.measureText(footerText).width;
  context.fillText(footerText, 200 - footerWidth*0.5, 785);
  context.shadowBlur = 0;

  const logo = await Canvas.loadImage("./assets/skilltree/logo_gold.png");
  const iconSizeRatio = Math.min(32 / logo.width, 32 / logo.height);
  context.drawImage(logo,
    200 - footerWidth*0.5 - 32 - 10,
    800 - 25 - 16,
    logo.width*iconSizeRatio,
    logo.height*iconSizeRatio);
}

/**
 * Draw xp changed since last review
 * @param canvas
 * @param user
 * @param x
 * @param y
 * @param w
 * @param h
 * @return {Promise<void>}
 */
const drawXP = async (canvas, user, x, y, w, h) => {
  const context = canvas.getContext("2d");
  const level = XPHelper.calcLevelFromXP(user.xp);
  const excessXP = user.xp - XPHelper.calcXPFromLevel(level);
  const maxXP = XPHelper.calcXPToLevelUp(level);

  //Add extra text to show increase
  context.font = "16px \"Akira\"";
  const prevXP = user.getPrevXP();
  const prevLevel = XPHelper.calcLevelFromXP(prevXP);
  const xpIncrease = user.xp - prevXP;
  const increaseText = `+ ${xpIncrease} XP`;
  const increaseTextWidth = context.measureText(increaseText).width;
  const XPwidth = w - increaseTextWidth - 10;

  context.fillStyle = "rgb(255,255,255)";
  context.fillText(increaseText, x + XPwidth + 10, y + h - 10, increaseTextWidth);

  // Fill with lighter gradient for newXP
  const color = XPHelper.getColor(level);
  let [red, green, blue] = color.substring(color.indexOf("(") + 1, color.lastIndexOf(")")).split(/,\s*/);
  red = Math.floor(Math.min(red * 2, 254));
  green = Math.floor(Math.min(green * 2, 254));
  blue = Math.floor(Math.min(blue * 2, 254));

  context.fillStyle = `rgba(${red}, ${green}, ${blue}, 1.0)`;
  context.fillRect(x,y,XPwidth*Math.min(excessXP, maxXP)/maxXP,h);

  //Fill to show last level XP
  if (prevLevel === level) {
    context.fillStyle = XPHelper.getColor(level);
    context.fillRect(x,y,XPwidth*Math.min(prevXP, maxXP)/maxXP,h);
  }

  //Draw XP bar outline
  context.strokeStyle = "rgba(255, 255, 255, 0.7)";
  context.lineWidth = 3;
  context.strokeRect(x,y,XPwidth,h);
  context.lineWidth = 1;
  context.strokeStyle = "rgba(255, 255, 255, 0)";

  //Draw XP text
  context.font = "15px \"Akira\"";
  const xpText = `${excessXP}XP / ${maxXP}XP`;
  const textWidth = context.measureText(xpText).width;

  //Draw XP text outline
  context.lineWidth = 3;
  context.strokeStyle = "rgb(0,0,0)";
  context.strokeText(xpText, x + XPwidth*0.5 - textWidth*0.5, y + h - 10);
  context.lineWidth = 1;

  //Fill XP text
  context.fillStyle = "rgb(255,255,255)";
  context.fillText(xpText, x + XPwidth*0.5 - textWidth*0.5, y + h - 10);
}

/**
 * Draw set of tasks that the user is currently participating in, or have recently ended
 * @param canvas
 * @param user
 * @param tasks
 * @param x
 * @param y
 * @param w
 * @return {Promise<void>}
 */
const drawTasks = async (canvas, user, tasks, x, y, w) => {
  const context = canvas.getContext("2d");
  const pad = 10;

  //Sort tasks in descending order of level and then XP
  let taskList = tasks.sort((a, b) => {
    //sort challenges by xp instead of level
    if (a.child.level === undefined || b.child.level === undefined) {
      return b.child.xp - a.child.xp;
    }
    if (b.child.level !== a.child.level) { //sort by level
      return (b.child.level - a.child.level);
    } else { // if that fails: sort by xp
      return b.child.xp - a.child.xp;
    }
  });

  const map = {};
  taskList.forEach(task => {
    const k = task.child.getName();
    if (!map[k] || task.data.length > map[k]?.data.length) {
      map[k] = task;
    }
  });
  taskList = taskList.filter(task => map[task.child.getName()] === task).slice(0,6);

  //Width of one task
  const tHeight = 90;
  const tWidth = (w - pad*2 - tHeight - 10) / 7;
  const size = Math.min(tHeight, tWidth) - 4;
  if (taskList.length === 0) {
    //draw challenge icon
    const challenge = await Canvas.loadImage("./assets/characters/character6.png");
    const challengeSizeRatio = Math.min(300 / challenge.width, 300 / challenge.height);
    context.shadowColor = "#000000";
    context.shadowBlur = 30;
    context.drawImage(challenge,
      x + pad + w*0.5 - challenge.width * challengeSizeRatio*0.5,
      y + pad + 150 - challenge.height * challengeSizeRatio*0.5,
      challenge.width * challengeSizeRatio,
      challenge.height * challengeSizeRatio);
    context.shadowBlur = 0;

    const text = "Things don't always \n" +
      "go our way, son \n\n" +
      "But what's important is \n" +
      "continuing the journey.\n\n" +
      "Use the start command to \n" +
      "continue levelling up";
    context.font = "18px \"Akira\"";
    context.strokeStyle = "rgba(0,0,0,1.0)";
    context.lineWidth = 5;
    context.strokeText(text,
      x + pad + 10,
      y + pad + 350,
      w - pad*2 - 10);
    context.lineWidth = 1;
    context.fillStyle = "rgba(255, 255, 255, 1.0)";
    context.fillText(text,
      x + pad + 10,
      y + pad + 350,
      w - pad*2 - 10);
    return;
  }
  //draw tasks
  await taskList.map(async (task, index) => {
    if (task.completed) {
      task.data = task.data.slice(0,task.data.lastIndexOf(true)+1);
    }
    //SKILL
    if (task.child instanceof Skill) {
      //Draw skill badge
      drawBadge(canvas, x + pad + tHeight * 0.5,
        y + pad + tHeight * index + tHeight * 0.5,
        tHeight, task.child.getIconName(), task.child.level);

      //Draw day completion chart
      context.shadowBlur = 0;
      context.strokeStyle = "rgba(0,0,0,0)";
      context.fillStyle = "rgba(20, 20, 20, 1.0)";
      //x (startX) + tHeight (size of icon) + pad (padding) + 5
      context.fillRect(
        x + tHeight + pad + 5,
        y + pad + index*tHeight + tHeight*0.5 - size*0.5 - 5,
        w - pad*2 - tHeight,
        size + 15);
      const dateIndex = new Date(new Date().getTime() + user.timezone*3600000);

      let numChecked = 0;

      for (let i = 0; i < 7; i++) {
        if (getDaysBetweenDates(dateIndex, task.startDate, user.timezone) > 0) context.fillStyle = "rgba(20, 20, 20, 1.0)";
        else if (task.completed && getDaysBetweenDates(
          new Date(task.startDate.getTime() + (task.data.length-1)*86400000),
          dateIndex,
          user.timezone) > 0 ) context.fillStyle = "rgba(20, 20, 20, 1.0)";
        else if (task.isChecked(dateIndex, user.timezone)) {
          context.fillStyle = "rgba(108, 199, 78,0.8)";
          numChecked += 1;
        }
        else context.fillStyle = "rgba(102, 102, 102, 0.6)";
        context.fillRect(
          x + w - pad - tWidth*(i+1) + 2,
          y + pad + index*tHeight + tHeight*0.5 - size*0.5 + 2,
          size,
          size);
        if (!task.completed) {
          task.setChecked(task.isChecked(dateIndex, user.timezone), dateIndex, user.timezone);
        }
        dateIndex.setUTCDate(dateIndex.getUTCDate() - 1);
      }

      //Draw completion percentage
      context.font = "25px \"Akira\"";
      let percent = Math.floor(100 * numChecked / Math.min(task.data.length, 7));
      percent = isNaN(percent) ? 0 : percent;
      const text = `${Math.max(percent, 0)}%`;
      const percentMetric = context.measureText(text);
      const textHeight = percentMetric.actualBoundingBoxAscent + percentMetric.actualBoundingBoxDescent;
      const textWidth = percentMetric.width;

      context.strokeStyle = "rgba(0,0,0,1.0)";
      context.lineWidth = 3;
      context.strokeText(text,
        x + w * 0.5 + tHeight*0.5 - textWidth*0.5,
        y + pad + tHeight*index + tHeight*0.5 + textHeight*0.5);
      context.lineWidth = 1;
      context.fillStyle = "rgba(255, 255, 255, 1.0)";
      context.fillText(text,
        x + w * 0.5 + tHeight*0.5 - textWidth*0.5,
        y + pad + tHeight*index + tHeight*0.5 + textHeight*0.5);

    //CHALLENGE
    } else if (task.child instanceof Challenge) {
      //draw challenge icon
      const challenge = await Canvas.loadImage("./assets/icons/challenge.png");
      const challengeSizeRatio = Math.min(tHeight / challenge.width, tHeight / challenge.height);
      context.drawImage(challenge,
        x + pad,
        y + pad + tHeight * index,
        challenge.width * challengeSizeRatio,
        challenge.height * challengeSizeRatio);

      //Draw day completion chart
      context.shadowBlur = 0;
      context.strokeStyle = "rgba(0,0,0,0)";
      context.fillStyle = "rgba(20, 20, 20, 1.0)";
      //x (startX) + tHeight (size of icon) + pad (padding) + 5
      context.fillRect(
        x + tHeight + pad + 5,
        y + pad + index*tHeight + tHeight*0.5 - size*0.5 - 5,
        w - pad*2 - tHeight,
        size + 15);
      const goalSize = (w - pad*2 - tHeight) / task.child.goals.length - 5;
      for (let i = 0; i < task.child.goals.length; i++) {
        if (i < task.data.filter(Boolean).length) context.fillStyle = "rgba(108, 199, 78,0.8)";
        else context.fillStyle = "rgba(102, 102, 102, 0.6)";
        context.fillRect(
          x + tHeight + pad + i*(goalSize+5) + 2,
          y + pad + index*tHeight + tHeight*0.5 - size*0.5 + 2,
          goalSize,
          size);
      }

      //Draw completion percentage
      context.font = "25px \"Akira\"";
      let percent = Math.floor(100 * task.data.filter(Boolean).length / task.child.goals.length);
      percent = isNaN(percent) ? 0 : percent;
      const text = `${Math.max(percent, 0)}%`;
      const percentMetric = context.measureText(text);
      const textHeight = percentMetric.actualBoundingBoxAscent + percentMetric.actualBoundingBoxDescent;
      const textWidth = percentMetric.width;

      context.strokeStyle = "rgba(0,0,0,1.0)";
      context.lineWidth = 3;
      context.strokeText(text,
        x + w * 0.5 + tHeight*0.5 - textWidth*0.5,
        y + pad + tHeight*index + tHeight*0.5 + textHeight*0.5);
      context.lineWidth = 1;
      context.fillStyle = "rgba(255, 255, 255, 1.0)";
      context.fillText(text,
        x + w * 0.5 + tHeight*0.5 - textWidth*0.5,
        y + pad + tHeight*index + tHeight*0.5 + textHeight*0.5);
    }

    //Draw title
    const title = task.child.getName();
    const titleMetric = context.measureText(title);
    const titleHeight = titleMetric.actualBoundingBoxAscent + titleMetric.actualBoundingBoxDescent;
    const titleWidth = Math.min(titleMetric.width, w - pad*2 - tHeight);

    context.strokeStyle = "rgba(0,0,0,1.0)";
    context.lineWidth = 3;
    context.strokeText(title,
      x + w * 0.5 + tHeight*0.5 - titleWidth*0.5,
      y + pad + tHeight*index + titleHeight*0.5,
      w - pad*2 - tHeight);
    context.lineWidth = 1;
    context.fillStyle = "rgba(255, 255, 255, 1.0)";
    context.fillText(title,
      x + w * 0.5 + tHeight*0.5 - titleWidth*0.5,
      y + pad + tHeight*index + titleHeight*0.5,
      w - pad*2 - tHeight);
  });
}
