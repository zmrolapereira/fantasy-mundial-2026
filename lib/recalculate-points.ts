import { games } from "@/data/games";
import {
  getAllFantasyEntries,
  getPredictionsForUser,
  updateFantasyEntryPoints,
} from "@/lib/fantasy-entry";
import { getAllPlayerTournamentStats } from "@/lib/player-stats";
import { getAllPlayerStageSnapshots } from "@/lib/player-stage-snapshots";
import { calculateFantasyEntryPoints } from "@/lib/fantasy-scoring";

export async function recalculateAllFantasyPoints() {
  const entries = await getAllFantasyEntries();
  const playerStats = await getAllPlayerTournamentStats();
  const playerStageSnapshots = await getAllPlayerStageSnapshots();

  for (const entry of entries) {
    const predictions = await getPredictionsForUser(entry.userId);

    const result = calculateFantasyEntryPoints({
      entry,
      predictions,
      games,
      playerStats,
      playerStageSnapshots,
    });

    await updateFantasyEntryPoints(entry.userId, {
      totalPoints: result.totalPoints,
      predictionPoints: result.predictionPoints,
      topScorerPoints: result.topScorerPoints,
      topAssistPoints: result.topAssistPoints,
      selectedTeamPoints: result.selectedTeamPoints,
      boostTokenPoints: result.boostTokenPoints,
    });
  }
}