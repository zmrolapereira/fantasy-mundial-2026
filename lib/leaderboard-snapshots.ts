import {
  doc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { games } from "@/data/games";
import { getAllFantasyEntries, getPredictionsForUser } from "@/lib/fantasy-entry";

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

function getOutcome(home: number, away: number) {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

function getWinner(game: any) {
  if (game.status !== "FT" || game.homeScore == null || game.awayScore == null) {
    return null;
  }

  if (game.homeScore === game.awayScore) {
    return game.penaltyWinner ?? null;
  }

  return game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam;
}

function getPredictionPoints(prediction: any, game: any) {
  if (!game || game.status !== "FT" || game.homeScore == null || game.awayScore == null) {
    return 0;
  }

  const predictedOutcome = getOutcome(
    prediction.predictedHomeScore,
    prediction.predictedAwayScore
  );

  const realOutcome = getOutcome(game.homeScore, game.awayScore);

  if (
    prediction.predictedHomeScore === game.homeScore &&
    prediction.predictedAwayScore === game.awayScore
  ) {
    return 2;
  }

  if (predictedOutcome === realOutcome) return 1;

  return 0;
}

function getStageIdFromGame(game: any) {
  return game.phase === "Fase de Grupos"
    ? normalize(game.round)
    : normalize(game.phase);
}

function gameIsStage(game: any, stage: string) {
  const target = normalize(stage);

  return normalize(game.phase) === target || normalize(game.round) === target;
}

function teamAppearsInStage(teamName: string, stage: string) {
  return games
    .filter((game) => gameIsStage(game, stage))
    .some(
      (game) =>
        sameTeam(game.homeTeam, teamName) || sameTeam(game.awayTeam, teamName)
    );
}

function teamWonAnyGameInStage(teamName: string, stage: string) {
  return games
    .filter((game) => gameIsStage(game, stage))
    .some((game) => sameTeam(getWinner(game) ?? "", teamName));
}

function getSelectedTeamStageBonus(teamName?: string, stageId?: string) {
  if (!teamName || !stageId) return 0;

  const stage = normalize(stageId);

  if (stage === "16 avos") {
    return teamWonAnyGameInStage(teamName, "16 avos") ||
      teamAppearsInStage(teamName, "Oitavos")
      ? 1
      : 0;
  }

  if (stage === "oitavos") {
    return teamWonAnyGameInStage(teamName, "Oitavos") ||
      teamAppearsInStage(teamName, "Quartos")
      ? 1
      : 0;
  }

  if (stage === "quartos") {
    return teamWonAnyGameInStage(teamName, "Quartos") ||
      teamAppearsInStage(teamName, "Meias-finais")
      ? 1
      : 0;
  }

  if (stage === "meias-finais") {
    return teamWonAnyGameInStage(teamName, "Meias-finais") ||
      teamAppearsInStage(teamName, "Final")
      ? 1
      : 0;
  }

  if (stage === "final" || stage === "final e 3º lugar") {
    return teamWonAnyGameInStage(teamName, "Final") ? 2 : 0;
  }

  return 0;
}

export async function saveStageLeaderboardSnapshot(stageId: string, label: string) {
  const cleanStageId = normalize(stageId);
  const snapshotRef = doc(db, "leaderboardSnapshots", cleanStageId);

  const entries = await getAllFantasyEntries();

  const rows = await Promise.all(
    entries.map(async (entry) => {
      const predictions = await getPredictionsForUser(entry.userId);

      const predictionStagePoints = predictions.reduce((sum, prediction) => {
        const game = games.find((g) => g.id === prediction.gameId);
        if (!game) return sum;

        const gameStageId = getStageIdFromGame(game);
        if (gameStageId !== cleanStageId) return sum;

        return sum + getPredictionPoints(prediction, game);
      }, 0);

      const selectedTeamStageBonus = getSelectedTeamStageBonus(
        entry.championPick?.teamName,
        cleanStageId
      );

      const stagePoints = predictionStagePoints + selectedTeamStageBonus;

      return {
        userId: entry.userId,
        teamName: entry.teamName ?? "Sem nome",
        managerName: entry.managerName ?? "",
        championPick: entry.championPick ?? null,
        stagePoints,
        predictionStagePoints,
        selectedTeamStageBonus,
        totalPointsAtThatMoment: entry.totalPoints ?? 0,
      };
    })
  );

  const sorted = rows.sort((a, b) => {
    if (b.stagePoints !== a.stagePoints) return b.stagePoints - a.stagePoints;
    return b.totalPointsAtThatMoment - a.totalPointsAtThatMoment;
  });

  let currentRank = 1;

  const ranked = sorted.map((row, index) => {
    if (index > 0) {
      const prev = sorted[index - 1];
      const same =
        row.stagePoints === prev.stagePoints &&
        row.totalPointsAtThatMoment === prev.totalPointsAtThatMoment;

      if (!same) currentRank = index + 1;
    }

    return {
      ...row,
      rank: currentRank,
    };
  });

  await setDoc(snapshotRef, {
    stageId: cleanStageId,
    label,
    createdAt: serverTimestamp(),
    isLocked: true,
    entries: ranked,
  });

  return { alreadyExists: false };
}

export async function getStageLeaderboardSnapshot(stageId: string) {
  const snapshotRef = doc(db, "leaderboardSnapshots", normalize(stageId));
  const snap = await getDoc(snapshotRef);

  if (!snap.exists()) return null;

  return snap.data();
}

export async function getAllLeaderboardSnapshots() {
  const snap = await getDocs(collection(db, "leaderboardSnapshots"));

  return snap.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));
}