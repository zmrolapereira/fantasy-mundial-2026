import type { Game } from "@/data/games";
import type { FantasyEntry, MatchPrediction } from "@/lib/fantasy-entry";

export type PlayerTournamentStat = {
  playerId: number;
  goals: number;
  assists: number;
};

type MatchOutcome = "HOME" | "AWAY" | "DRAW";

function isFinished(game: Game) {
  return (
    game.status === "FT" &&
    typeof game.homeScore === "number" &&
    typeof game.awayScore === "number"
  );
}

function getOutcome(home: number, away: number): MatchOutcome {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

function getPredictionPoints(prediction: MatchPrediction, game: Game) {
  if (!isFinished(game)) return 0;

  const realHome = game.homeScore!;
  const realAway = game.awayScore!;

  const predictedOutcome = getOutcome(
    prediction.predictedHomeScore,
    prediction.predictedAwayScore
  );

  const realOutcome = getOutcome(realHome, realAway);

  // acertar resultado exato = 2 pontos no total
  if (
    prediction.predictedHomeScore === realHome &&
    prediction.predictedAwayScore === realAway
  ) {
    return 2;
  }

  // acertar apenas o sentido do jogo = 1 ponto
  if (predictedOutcome === realOutcome) {
    return 1;
  }

  return 0;
}

function getTopScorerPoints(
  entry: FantasyEntry,
  playerStats: PlayerTournamentStat[]
) {
  const pick = entry.topScorerPick;
  if (!pick) return 0;

  const stat = playerStats.find(
    (player) => player.playerId === pick.playerId
  );

  return stat?.goals ?? 0;
}

function getTopAssistPoints(
  entry: FantasyEntry,
  playerStats: PlayerTournamentStat[]
) {
  const pick = entry.topAssistPick;
  if (!pick) return 0;

  const stat = playerStats.find(
    (player) => player.playerId === pick.playerId
  );

  return stat?.assists ?? 0;
}

function getSelectedTeamMatchPoints(teamName: string, games: Game[]) {
  let points = 0;

  for (const game of games) {
    if (!isFinished(game)) continue;

    const involvesTeam =
      game.homeTeam === teamName || game.awayTeam === teamName;

    if (!involvesTeam) continue;

    const home = game.homeScore!;
    const away = game.awayScore!;

    if (home === away) {
      points += 0.5;
      continue;
    }

    const teamWon =
      (game.homeTeam === teamName && home > away) ||
      (game.awayTeam === teamName && away > home);

    if (teamWon) {
      points += 1;
    }
  }

  return points;
}

function getWinner(game: Game) {
  if (!isFinished(game)) return null;
  if (game.homeScore === game.awayScore) return null;

  return game.homeScore! > game.awayScore! ? game.homeTeam : game.awayTeam;
}

function teamWonAnyGameInRound(teamName: string, games: Game[], round: string) {
  const roundGames = games.filter((game) => game.round === round);

  return roundGames.some((game) => getWinner(game) === teamName);
}

function getSelectedTeamStagePoints(teamName: string, games: Game[]) {
  let points = 0;

  // passar aos oitavos = ganhar um jogo dos 16 avos
  if (
    teamWonAnyGameInRound(teamName, games, "Jogo 1") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 2") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 3") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 4") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 5") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 6") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 7") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 8") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 9") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 10") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 11") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 12") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 13") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 14") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 15") ||
    teamWonAnyGameInRound(teamName, games, "Jogo 16")
  ) {
    points += 2;
  }

  // passar aos quartos
  if (teamWonAnyGameInRound(teamName, games, "Oitavos")) {
    points += 2;
  }

  // passar à final
  if (
    teamWonAnyGameInRound(teamName, games, "Meia-final 1") ||
    teamWonAnyGameInRound(teamName, games, "Meia-final 2")
  ) {
    points += 2;
  }

  // ganhar o Mundial
  if (teamWonAnyGameInRound(teamName, games, "Final")) {
    points += 4;
  }

  return points;
}

export function calculateFantasyEntryPoints(params: {
  entry: FantasyEntry;
  predictions: MatchPrediction[];
  games: Game[];
  playerStats: PlayerTournamentStat[];
}) {
  const { entry, predictions, games, playerStats } = params;

  let predictionPoints = 0;

  for (const prediction of predictions) {
    const game = games.find((g) => g.id === prediction.gameId);
    if (!game) continue;

    predictionPoints += getPredictionPoints(prediction, game);
  }

  const topScorerPoints = getTopScorerPoints(entry, playerStats);
  const topAssistPoints = getTopAssistPoints(entry, playerStats);

  const selectedTeamPoints = entry.championPick?.teamName
    ? getSelectedTeamMatchPoints(entry.championPick.teamName, games) +
      getSelectedTeamStagePoints(entry.championPick.teamName, games)
    : 0;

  const totalPoints =
    predictionPoints +
    topScorerPoints +
    topAssistPoints +
    selectedTeamPoints;

  return {
    predictionPoints,
    topScorerPoints,
    topAssistPoints,
    selectedTeamPoints,
    totalPoints,
  };
}