/**
 * Elo Rating Calculation
 *
 * Uses standard Elo with variable K-factor:
 * - K=40 for provisional players (<10 rated games)
 * - K=20 for established players
 */

/**
 * Expected score for player A against player B.
 */
function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate new ratings after a game.
 *
 * @param {number} whiteRating - White's current rating
 * @param {number} blackRating - Black's current rating
 * @param {string} result - "white_win", "black_win", or "draw"
 * @param {number} whiteGames - White's total rated games (for K-factor)
 * @param {number} blackGames - Black's total rated games (for K-factor)
 * @returns {{ newWhite: number, newBlack: number, whiteDelta: number, blackDelta: number }}
 */
export function calculateNewRatings(whiteRating, blackRating, result, whiteGames = 10, blackGames = 10) {
  const kWhite = whiteGames < 10 ? 40 : 20;
  const kBlack = blackGames < 10 ? 40 : 20;

  const expectedWhite = expectedScore(whiteRating, blackRating);
  const expectedBlack = expectedScore(blackRating, whiteRating);

  let actualWhite, actualBlack;
  switch (result) {
    case "white_win":
      actualWhite = 1;
      actualBlack = 0;
      break;
    case "black_win":
      actualWhite = 0;
      actualBlack = 1;
      break;
    case "draw":
      actualWhite = 0.5;
      actualBlack = 0.5;
      break;
    default:
      // abandoned or unknown — no rating change
      return {
        newWhite: whiteRating,
        newBlack: blackRating,
        whiteDelta: 0,
        blackDelta: 0,
      };
  }

  const whiteDelta = Math.round(kWhite * (actualWhite - expectedWhite));
  const blackDelta = Math.round(kBlack * (actualBlack - expectedBlack));

  return {
    newWhite: Math.max(100, whiteRating + whiteDelta),
    newBlack: Math.max(100, blackRating + blackDelta),
    whiteDelta,
    blackDelta,
  };
}
