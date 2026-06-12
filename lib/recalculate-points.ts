import { games as baseGames } from "@/data/games";
import {
  getAllFantasyEntries,
  getPredictionsForUser,
  updateFantasyEntryPoints,
} from "@/lib/fantasy-entry";
import { getAllPlayerTournamentStats } from "@/lib/player-stats";
import { calculateFantasyEntryPoints } from "@/lib/fantasy-scoring";
import { getGamesWithResults } from "@/lib/game-results";

export async function recalculateAllFantasyPoints() {
  const entries = await getAllFantasyEntries();
  const playerStats = await getAllPlayerTournamentStats();

  // Aqui juntamos o calendário fixo do games.ts com os resultados guardados na Firebase.
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
    });
  }
}