import { collection, getDocs } from "firebase/firestore";
import { games } from "@/data/games";
import { db } from "@/lib/firebase";

type PredictionValue = {
  home?: string | number;
  away?: string | number;
  homeScore?: string | number;
  awayScore?: string | number;
};

export type PredictionRoundStat = {
  round: string;
  totalGames: number;
  usersAnswered: number;
  totalUsers: number;
  percentage: number;
};

function getGameId(game: any) {
  return String(game.id);
}

function getRoundLabel(game: any) {
  return (
    game.round ||
    game.jornada ||
    game.stage ||
    game.phase ||
    game.phaseName ||
    "Sem fase"
  );
}

function getPredictionsObject(data: any): Record<string, PredictionValue> {
  return (
    data.predictions ||
    data.matchPredictions ||
    data.match_predictions ||
    {}
  );
}

function hasPrediction(value?: PredictionValue) {
  if (!value) return false;

  const hasHomeAway =
    value.home !== undefined &&
    value.home !== "" &&
    value.away !== undefined &&
    value.away !== "";

  const hasScores =
    value.homeScore !== undefined &&
    value.homeScore !== "" &&
    value.awayScore !== undefined &&
    value.awayScore !== "";

  return hasHomeAway || hasScores;
}

export async function getPredictionStatsByRound(): Promise<
  PredictionRoundStat[]
> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const entriesSnapshot = await getDocs(collection(db, "fantasyEntries"));

  const totalUsers = usersSnapshot.size;

  const roundsMap = new Map<string, string[]>();

  games.forEach((game: any) => {
    const round = getRoundLabel(game);
    const gameId = getGameId(game);

    if (!roundsMap.has(round)) {
      roundsMap.set(round, []);
    }

    roundsMap.get(round)?.push(gameId);
  });

  const stats: PredictionRoundStat[] = [];

  roundsMap.forEach((gameIds, round) => {
    let usersAnswered = 0;

    entriesSnapshot.forEach((doc) => {
      const data = doc.data();
      const predictions = getPredictionsObject(data);

      const answeredAllRound = gameIds.every((gameId) =>
        hasPrediction(predictions[gameId])
      );

      if (answeredAllRound) {
        usersAnswered++;
      }
    });

    stats.push({
      round,
      totalGames: gameIds.length,
      usersAnswered,
      totalUsers,
      percentage:
        totalUsers > 0 ? Math.round((usersAnswered / totalUsers) * 100) : 0,
    });
  });

  return stats;
}