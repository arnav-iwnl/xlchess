/**
 * XP & Leveling System
 *
 * XP is awarded for various actions. Level is derived from total XP
 * using a quadratic curve so each level requires progressively more XP.
 */

/** XP awarded per action type */
export const XP_RULES = {
  pvp_win: 30,
  pvp_loss: 10,
  pvp_draw: 15,
  ai_win: 15,
  ai_expert_win: 40,
  puzzle_solved: 5,
  daily_login: 10,
  referral: 50,
};

/**
 * Total XP required to reach a given level.
 * Level 1 = 0 XP, Level 2 = 100, Level 3 = 250, Level 5 = 700, Level 10 = 2250
 */
export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(50 * level * (level - 1));
}

/**
 * Derive the current level from total XP.
 */
export function levelFromXp(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

/**
 * XP remaining to reach the next level.
 */
export function xpToNextLevel(xp) {
  const current = levelFromXp(xp);
  return xpForLevel(current + 1) - xp;
}

/**
 * Progress fraction (0–1) toward the next level.
 */
export function levelProgress(xp) {
  const current = levelFromXp(xp);
  const currentThreshold = xpForLevel(current);
  const nextThreshold = xpForLevel(current + 1);
  const range = nextThreshold - currentThreshold;
  if (range === 0) return 1;
  return (xp - currentThreshold) / range;
}
