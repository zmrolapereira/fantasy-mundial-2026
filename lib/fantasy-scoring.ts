import type { Game } from "@/data/games";
import type { FantasyEntry, MatchPrediction } from "@/lib/fantasy-entry";

export type PlayerTournamentStat = {
  playerId: number;
  goals: number;
  assists: number;
};

type MatchOutcome = "HOME" | "AWAY" | "DRAW";

type GameWithPenalties = Game & {
  penaltyWinner?: string;
  note?: string;
};

function normalize(value?: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function sameTeam(a?: string, b?: string) {
  return normalize(a) === normalize(b);
}

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

function getPenaltyWinner(game: Game) {
  return (game as GameWithPenalties).penaltyWinner ?? null;
}

function getWinner(game: Game) {
  if (!isFinished(game)) return null;

  if (game.homeScore === game.awayScore) {
    return getPenaltyWinner(game);
  }

  return game.homeScore! > game.awayScore! ? game.homeTeam : game.awayTeam;
}

function getPredictionCounter(prediction: MatchPrediction, game: Game) {
  if (!isFinished(game)) {
    return { points: 0, exact: 0 };
  }

  const realHome = Number(game.homeScore);
  const realAway = Number(game.awayScore);
  const predictedHome = Number(prediction.predictedHomeScore);
  const predictedAway = Number(prediction.predictedAwayScore);

  if (
    !Number.isFinite(realHome) ||
    !Number.isFinite(realAway) ||
    !Number.isFinite(predictedHome) ||
    !Number.isFinite(predictedAway)
  ) {
    return { points: 0, exact: 0 };
  }

  const predictedOutcome = getOutcome(predictedHome, predictedAway);
  const realOutcome = getOutcome(realHome, realAway);

  if (predictedHome === realHome && predictedAway === realAway) {
    return { points: 3, exact: 1 };
  }

  if (predictedOutcome === realOutcome) {
    return { points: 1, exact: 0 };
  }

  return { points: 0, exact: 0 };
}

function getTopScorerPoints(
  entry: FantasyEntry,
  playerStats: PlayerTournamentStat[]
) {
  const pick = entry.topScorerPick;
  if (!pick) return 0;

  const stat = playerStats.find((player) => player.playerId === pick.playerId);
  return Number(stat?.goals ?? 0);
}

function getTopAssistPoints(
  entry: FantasyEntry,
  playerStats: PlayerTournamentStat[]
) {
  const pick = entry.topAssistPick;
  if (!pick) return 0;

  const stat = playerStats.find((player) => player.playerId === pick.playerId);
  return Number(stat?.assists ?? 0);
}

function getSelectedTeamMatchPoints(teamName: string, games: Game[]) {
  let points = 0;

  for (const game of games) {
    if (!isFinished(game)) continue;

    const involvesTeam =
      sameTeam(game.homeTeam, teamName) || sameTeam(game.awayTeam, teamName);

    if (!involvesTeam) continue;

    const isDraw = game.homeScore === game.awayScore;

    if (isDraw) {
      points += 0.5;
      continue;
    }

    const teamWonInScore =
      (sameTeam(game.homeTeam, teamName) && game.homeScore! > game.awayScore!) ||
      (sameTeam(game.awayTeam, teamName) && game.awayScore! > game.homeScore!);

    if (teamWonInScore) {
      points += 1;
    }
  }

  return points;
}

function gameIsStage(game: Game, stage: string) {
  const target = normalize(stage);

  return normalize(game.phase) === target || normalize(game.round) === target;
}

function teamWonAnyGameInStage(
  teamName: string,
  games: Game[],
  stage: string
) {
  return games
    .filter((game) => gameIsStage(game, stage))
    .some((game) => sameTeam(getWinner(game) ?? "", teamName));
}

function teamAppearsInStage(teamName: string, games: Game[], stage: string) {
  return games
    .filter((game) => gameIsStage(game, stage))
    .some(
      (game) =>
        sameTeam(game.homeTeam, teamName) || sameTeam(game.awayTeam, teamName)
    );
}

function teamPassedStageByNextRound(params: {
  teamName: string;
  games: Game[];
  currentStage: string;
  nextStage: string;
}) {
  const { teamName, games, currentStage, nextStage } = params;

  const wonCurrentStage = teamWonAnyGameInStage(
    teamName,
    games,
    currentStage
  );

  const appearsInNextStage = teamAppearsInStage(teamName, games, nextStage);

  return wonCurrentStage || appearsInNextStage;
}

function getSelectedTeamStagePoints(teamName: string, games: Game[]) {
  let points = 0;

  const passed16Avos = teamPassedStageByNextRound({
    teamName,
    games,
    currentStage: "16 avos",
    nextStage: "Oitavos",
  });

  const passedOitavos = teamPassedStageByNextRound({
    teamName,
    games,
    currentStage: "Oitavos",
    nextStage: "Quartos",
  });

  const passedQuartos = teamPassedStageByNextRound({
    teamName,
    games,
    currentStage: "Quartos",
    nextStage: "Meias-finais",
  });

  const passedMeias = teamPassedStageByNextRound({
    teamName,
    games,
    currentStage: "Meias-finais",
    nextStage: "Final",
  });

  const wonFinal = teamWonAnyGameInStage(teamName, games, "Final");

  if (passed16Avos) points += 1;
  if (passedOitavos) points += 1;
  if (passedQuartos) points += 1;
  if (passedMeias) points += 1;
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
  let exactResultsCount = 0;

  for (const prediction of predictions) {
    const game = games.find((g) => Number(g.id) === Number(prediction.gameId));
    if (!game) continue;

    const counter = getPredictionCounter(prediction, game);

    predictionPoints += counter.points;
    exactResultsCount += counter.exact;
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
    totalPoints,
    predictionPoints,
    topScorerPoints,
    topAssistPoints,
    selectedTeamPoints,
    exactResultsCount,
  };
}
