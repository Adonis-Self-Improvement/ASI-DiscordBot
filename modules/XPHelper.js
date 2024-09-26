const Rank = require("../objects/rank");
/** @module XPHandler */

//List of ranks
const ranks = [
  new Rank("Acolyte",-Number.MAX_VALUE,"rgb(52,152,219)", "character1.png"),
  new Rank("Spartan",10,"rgb(255, 100, 69)", "character2.png"),
  new Rank("Disciple",30,"rgb(75, 252, 252)", "character3.png"),
  new Rank("Warrior",60,"rgb(255,207,40)", "character4.png"),
  new Rank("Adonis",100,"rgb(161, 105, 231)", "character5.png"),
  new Rank("Maximus",140,"rgb(33,255,177)", "character6.png"),
];

/**
 * Calculate the required XP to level up given the user's level
 * @param {number} level - Current level of the user
 * @returns {number} - XP required to level up
 */

exports.calcXPToLevelUp = level => Math.floor(50 * Math.pow(1.02, level));

/**
 * Return the rank object with all the rank data for a user of a given level
 * @param {number} level - Current level of the user
 * @return {Rank} Rank object for this level
 */
exports.getRank = level => {
  for (let i = ranks.length-1; i > 0; i--) {
    if (level >= ranks[i].minLevel) {
      return ranks[i];
    }
  }
  return ranks[0];
};

/**
 * Get the rank colour from a user's level
 * @param {number} level - Current level of the user
 * @return {string} - Colour of the given rank
 */
exports.getColor = level => exports.getRank(level).color;

/**
 * Get the character icon path for a given user level
 * @param {number} level - Current level of the user
 * @returns {String} - Character image paht for the given rank
 */
exports.getCharacter = level => exports.getRank(level).character;

/**
 * Calculate the totalXP given level
 * @param {number} level - level
 * @returns {number} - XP required to level up
 */
exports.calcXPFromLevel = level => Math.floor(-2550*(1 - Math.pow(1.02, level)));


/**
 * Calculate the level given totalXP
 * @param {number} xp - total XP
 * @returns {number} - XP required to level up
 */
exports.calcLevelFromXP = xp => {
  let currentXP = 0;
  let lastXP = 0;
  let i = 0;
  for (; currentXP < xp; i++) {
    const levelXP = exports.calcXPFromLevel(i);
    currentXP += levelXP - lastXP;
    lastXP = levelXP;
  }
  return i - 2;
}