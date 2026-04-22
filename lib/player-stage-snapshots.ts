import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { PlayerTournamentStat } from "./player-stats";

export type PlayerStageSnapshot = {
  id: string;
  stage: string;
  stageKey: string;
  playerId: number;
  goals: number;
  assists: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function toStageKey(stage: string) {
  return stage.trim().toLowerCase();
}

function buildSnapshotId(stage: string, playerId: number) {
  return `${toStageKey(stage).replace(/\s+/g, "-")}_${playerId}`;
}

export const savePlayerStageSnapshots = async (
  stage: string,
  playerStats: PlayerTournamentStat[]
) => {
  const cleanStage = stage.trim();
  const stageKey = toStageKey(cleanStage);

  await Promise.all(
    playerStats.map((stat) => {
      const snapshotRef = doc(
        db,
        "playerStageSnapshots",
        buildSnapshotId(cleanStage, stat.playerId)
      );

      return setDoc(
        snapshotRef,
        {
          id: buildSnapshotId(cleanStage, stat.playerId),
          stage: cleanStage,
          stageKey,
          playerId: stat.playerId,
          goals: Number(stat.goals ?? 0),
          assists: Number(stat.assists ?? 0),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    })
  );
};

export const getAllPlayerStageSnapshots = async () => {
  const snap = await getDocs(collection(db, "playerStageSnapshots"));
  return snap.docs.map((docSnap) => docSnap.data() as PlayerStageSnapshot);
};