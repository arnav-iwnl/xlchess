// Move lists are pre-validated SAN sequences (see chess.js), so autoplay
// never has to handle an illegal-move edge case at runtime.
export const famousGames = [
  {
    id: "evergreen",
    title: "The Evergreen Game",
    players: "Anderssen vs. Dufresne",
    year: 1852,
    result: "1–0",
    blurb:
      "A queen sacrifice on move 19 clears the way for a mating net that is still taught as the model attacking game.",
    moves: [
      "e4","e5","Nf3","Nc6","Bc4","Bc5","b4","Bxb4","c3","Ba5","d4","exd4","O-O","d3",
      "Qb3","Qf6","e5","Qg6","Re1","Nge7","Ba3","b5","Qxb5","Rb8","Qa4","Bb6","Nbd2","Bb7",
      "Ne4","Qf5","Bxd3","Qh5","Nf6+","gxf6","exf6","Rg8","Rad1","Qxf3","Rxe7+","Nxe7",
      "Qxd7+","Kxd7","Bf5+","Ke8","Bd7+","Kf8","Bxe7#",
    ],
  },
  {
    id: "opera",
    title: "The Opera Game",
    players: "Morphy vs. Duke of Brunswick & Count Isouard",
    year: 1858,
    result: "1–0",
    blurb:
      "Played at the Paris Opera against two consulting opponents, a lesson in development speed over material.",
    moves: [
      "e4","e5","Nf3","d6","d4","Bg4","dxe5","Bxf3","Qxf3","dxe5","Bc4","Nf6","Qb3","Qe7",
      "Nc3","c6","Bg5","b5","Nxb5","cxb5","Bxb5+","Nbd7","O-O-O","Rd8","Rxd7","Rxd7","Rd1",
      "Qe6","Bxd7+","Nxd7","Qb8+","Nxb8","Rd8#",
    ],
  },
  {
    id: "immortal",
    title: "The Immortal Game",
    players: "Anderssen vs. Kieseritzky",
    year: 1851,
    result: "1–0",
    blurb:
      "White gives up both rooks and a bishop, then mates with three minor pieces. The most famous sacrifice in chess history.",
    moves: [
      "e4","e5","f4","exf4","Bc4","Qh4+","Kf1","b5","Bxb5","Nf6","Nf3","Qh6","d3","Nh5",
      "Nh4","Qg5","Nf5","c6","g4","Nf6","Rg1","cxb5","h4","Qg6","h5","Qg5","Qf3","Ng8",
      "Bxf4","Qf6","Nc3","Bc5","Nd5","Qxb2","Bd6","Bxg1","e5","Qxa1+","Ke2","Na6","Nxg7+",
      "Kd8","Qf6+","Nxf6","Be7#",
    ],
  },
];
