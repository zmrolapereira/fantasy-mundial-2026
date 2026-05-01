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

function normalize(value?: string) {
  return String(value || "").trim().toLowerCase();
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

  if (
    prediction.predictedHomeScore === realHome &&
    prediction.predictedAwayScore === realAway
  ) {
    return 2;
  }

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

  const stat = playerStats.find((player) => player.playerId === pick.playerId);
  return stat?.goals ?? 0;
}

function getTopAssistPoints(
  entry: FantasyEntry,
  playerStats: PlayerTournamentStat[]
) {
  const pick = entry.topAssistPick;
  if (!pick) return 0;

  const stat = playerStats.find((player) => player.playerId === pick.playerId);
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

function gameIsStage(game: Game, stage: string) {
  const target = normalize(stage);
  return normalize(game.phase) === target || normalize(game.round) === target;
}

function teamWonAnyGameInStage(teamName: string, games: Game[], stage: string) {
  return games
    .filter((game) => gameIsStage(game, stage))
    .some((game) => getWinner(game) === teamName);
}

function teamAppearsInStage(teamName: string, games: Game[], stage: string) {
  return games
    .filter((game) => gameIsStage(game, stage))
    .some((game) => game.homeTeam === teamName || game.awayTeam === teamName);
}

function teamPassedStageByNextRound(
  teamName: string,
  games: Game[],
  currentStage: string,
  nextStage: string
) {
  const wonCurrentStage = teamWonAnyGameInStage(teamName, games, currentStage);
  const appearsInNextStage = teamAppearsInStage(teamName, games, nextStage);

  return wonCurrentStage || appearsInNextStage;
}

function getSelectedTeamStagePoints(teamName: string, games: Game[]) {
  let points = 0;

  const passed16Avos = teamPassedStageByNextRound(
    teamName,
    games,
    "16 avos",
    "Oitavos"
  );

  const passedOitavos = teamPassedStageByNextRound(
    teamName,
    games,
    "Oitavos",
    "Quartos"
  );

  const passedQuartos = teamPassedStageByNextRound(
    teamName,
    games,
    "Quartos",
    "Meias-finais"
  );

  const passedMeias = teamPassedStageByNextRound(
    teamName,
    games,
    "Meias-finais",
    "Final"
  );

  const wonFinal = teamWonAnyGameInStage(teamName, games, "Final");

  if (passed16Avos) points += 2;
  if (passedOitavos) points += 2;
  if (passedQuartos) points += 2;
  if (passedMeias) points += 2;
  if (wonFinal) points += 4;

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