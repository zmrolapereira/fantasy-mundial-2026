import { games as baseGames } from "@/data/games";
import {
  getAllFantasyEntries,
  getPredictionsForUser,
  updateFantasyEntryPoints,
} from "./fantasy-entry";
import { getAllPlayerTournamentStats } from "./player-stats";
import { calculateFantasyEntryPoints } from "./fantasy-scoring";
import { getGamesWithResults } from "./game-results";

export async function recalculateAllFantasyPoints() {
  const entries = await getAllFantasyEntries();
  const playerStats = await getAllPlayerTournamentStats();

  // Junta o calendário fixo do games.ts com os resultados guardados na Firebase.
  const games = await getGamesWithResults(baseGames);

  for (const entry of entries) {
    const predictions = await getPredictionsForUser(entry.userId);

    const result = calculateFantasyEntryPoints({
      entry,
      predictions,
      games,
      playerStats,
    });

    await updateFantasyEntryPoints(entry.userId, {
      totalPoints: result.totalPoints,
      predictionPoints: result.predictionPoints,
      topScorerPoints: result.topScorerPoints,
      topAssistPoints: result.topAssistPoints,
      selectedTeamPoints: result.selectedTeamPoints,
      exactResultsCount: result.exactResultsCount,
    });
  }
}
