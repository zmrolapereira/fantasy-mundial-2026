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

function getOutcome(home: number, away: number) {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

function getPredictionPoints(prediction: any, game: any) {
  if (
    !game ||
    game.status !== "FT" ||
    game.homeScore == null ||
    game.awayScore == null
  ) {
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

  if (predictedOutcome === realOutcome) {
    return 1;
  }

  return 0;
}

function getStageIdFromGame(game: any) {
  return game.phase === "Fase de Grupos"
    ? String(game.round).trim().toLowerCase()
    : String(game.phase).trim().toLowerCase();
}

export async function saveStageLeaderboardSnapshot(stageId: string, label: string) {
  const snapshotRef = doc(db, "leaderboardSnapshots", stageId);
  const existing = await getDoc(snapshotRef);

  if (existing.exists()) {
    return { alreadyExists: true };
  }

  const entries = await getAllFantasyEntries();

  const rows = await Promise.all(
    entries.map(async (entry) => {
      const predictions = await getPredictionsForUser(entry.userId);

      const stagePoints = predictions.reduce((sum, prediction) => {
        const game = games.find((g) => g.id === prediction.gameId);
        if (!game) return sum;

        const gameStageId = getStageIdFromGame(game);
        if (gameStageId !== stageId) return sum;

        return sum + getPredictionPoints(prediction, game);
      }, 0);

      return {
        userId: entry.userId,
        teamName: entry.teamName ?? "Sem nome",
        managerName: entry.managerName ?? "",
        stagePoints,
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
    stageId,
    label,
    createdAt: serverTimestamp(),
    isLocked: true,
    entries: ranked,
  });

  return { alreadyExists: false };
}

export async function getStageLeaderboardSnapshot(stageId: string) {
  const snapshotRef = doc(db, "leaderboardSnapshots", stageId);
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