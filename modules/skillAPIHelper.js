const axios = require("axios");
const Skill = require("../objects/skill");
const Task = require("../objects/task");
const Item = require("../objects/item");
const Challenge = require("../objects/challenge");
const Unlocked = require("../objects/unlocked");

/** @module APIHelper */

/**
 * Get API authentication key
 */
const getAPIKey = () => process.env.API_KEY;

/**
 * Get JSON object containing tasks that the user has accepted from the database
 * @param userID - MongoDB userID
 * @param callback - list of task objects
 */
exports.getCurrentTasks = async userID => {
  const res = await axios.get(process.env.API_URL + "tasks/currentTasks", {
    headers: {
      userid: userID,
      api_key: getAPIKey()
    }
  });
  const tasks = res.data.tasks.map(data => Task.create(data));
  const timezoneoffset = res.data.timezoneoffset;
  return [tasks, timezoneoffset];
};

/**
 * Get all tasks in the last <limit> days
 * @param userID- MongoDB userID
 * @param {number} limit - number of days ago for the last habit entry
 * @param callback
 */
exports.getRecentTasks = async (userID, limit) => {
  const res = await axios.get(process.env.API_URL + "tasks/recentTasks", {
    headers: {
      userid: userID,
      api_key: getAPIKey(),
      timelimit: limit
    }
  });
  return res.data.tasks.map(data => Task.create(data));
};

/**
 * find a task using its ID, and delete it.
 * @param {*} taskID - ID of the task to delete 
 */
exports.deleteTask = function(taskID) {
  axios.post(process.env.API_URL + "tasks/deleteTask", {
    taskid:taskID
  },{
    headers: {
      api_key: getAPIKey()
    }
  });
};

/**
 * Get JSON object containing skills that the user has accepted from the database
 * @param userID - MongoDB userID
 */
exports.getInProgress = async userID => {
  const res = await axios.get(process.env.API_URL + "users/getInProgress", {
    headers: {
      userid: userID,
      api_key: getAPIKey()
    }
  });
  const skills = res.data.skills.map(val => Skill.create(val));
  const challenges = res.data.challenges.map(val => Challenge.create(val));
  return skills.concat(challenges);
};

/**
 * Get JSON object containing skills available to a given user from database
 * @param userID - MongoDB userID
 */
exports.getAvailable = async userID => {
  const res = await axios.get(process.env.API_URL + "users/getAvailable", {
    headers: {
      userid: userID,
      api_key: getAPIKey()
    }
  });
  const skills = res.data.skills.map(val => Skill.create(val));
  const challenges = res.data.challenges.map(val => Challenge.create(val));
  return skills.concat(challenges);
};

/**
 * Get JSON object containing all skills and challenges found in the given list
 * @param list - List of MongoDB Object IDs
 */
exports.getAllInList = async list => {
  const res = await axios.get(process.env.API_URL + "inList", {
    headers: {
      api_key: getAPIKey(),
      list: list,
    }
  });
  return res.data.list.map(val => {
    switch (val.type) {
      case "Skill":
        return Skill.create(val);
      case "Challenge":
        return Challenge.create(val);
    }
  });
};

/**
 * Adds the skill/challenge to the users inprogress
 * @param userID - userID
 * @param toStart - Object to start, either Skill or Challenge
 */
exports.start = async (userID, toStart) => {
  const res = await axios
    .post(process.env.API_URL + "users/start", {
      userid: userID,
      tostart: toStart.id
    }, {
      headers: {
        api_key: getAPIKey()
      }
    });
  return res.status;
};

/**
 * Skips the skill/challenge to the next skill in the branch
 * @param userID - userID
 * @param toSkip - object to skip
 */
exports.skip = async (userID, toSkip) => {
  const res = await axios
    .post(process.env.API_URL + "users/skip", {
      userid: userID,
      toskip: toSkip.id
    }, {
      headers: {
        api_key: getAPIKey()
      }
    });
  const skills = res.data.skills.map(val => new Unlocked(Skill.create(val)));
  const items = res.data.items.map(val => new Unlocked(Item.create(val)));
  const challenges = res.data.challenges.map(val => new Unlocked(Challenge.create(val)));
  return [].concat(skills, items, challenges);
};

/**
 * Goes to the previous skill in the branch
 * @param userID - userID
 * @param toRevert - object to revert
 */
exports.revert = async (userID, toRevert) => {
  await axios
    .post(process.env.API_URL + "users/revert", {
      userid: userID,
      torevert: toRevert.id
    }, {
      headers: {
        api_key: getAPIKey()
      }
    });
};

/**
 * Cancels a given skill
 * @param  userID
 * @param toCancel - object to cancel
 */
exports.cancel = (userID, toCancel) => {
  axios
    .post(process.env.API_URL + "users/cancel", {
      userid: userID,
      tocancel: toCancel.id
    },{
      headers: {
        api_key: getAPIKey()
      }
    });
};

/**
 * Sets the completed state of a user's skill task for a given date
 * @param userid - userID
 * @param task
 * @param date - javascript date object
 * @param checked - T/F if checked/unchecked
 */
exports.updateTask = async (userid, task, date, checked) => {
  const res = await axios
    .post(process.env.API_URL + "tasks/updateTask", {
      userid: userid,
      taskid: task.id,
      checked: checked,
      date: date.getTime()
    }, {
      headers: {
        api_key: getAPIKey()
      }
    });
  const levelUp = res.data.levelUp;
  const skills = res.data.skills.map(val => new Unlocked(Skill.create(val)));
  const items = res.data.items.map(val => new Unlocked(Item.create(val)));
  const challenges = res.data.challenges.map(val => new Unlocked(Challenge.create(val)));
  return [levelUp, [].concat(skills, items, challenges)];
};
