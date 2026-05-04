import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  onSnapshot,
  updateDoc,
  orderBy,
  where,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type PlayerPick = {
  playerId: number;
  playerName: string;
};

export type ChampionPick = {
  teamName: string;
};

export type FantasyEntry = {
  userId: string;
  teamName: string;
  managerName: string;
  topScorerPick: PlayerPick | null;
  topAssistPick: PlayerPick | null;
  championPick: ChampionPick | null;

  totalPoints: number;

  predictionPoints?: number;
  topScorerPoints?: number;
  topAssistPoints?: number;
  selectedTeamPoints?: number;

  createdAt?: unknown;
  updatedAt?: unknown;
};

export type MatchPrediction = {
  id: string;
  userId: string;
  gameId: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type MatchPredictionInput = {
  userId: string;
  gameId: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
};

export const saveFantasyEntry = async (entry: FantasyEntry) => {
  const entryRef = doc(db, "fantasyEntries", entry.userId);
  const existingDoc = await getDoc(entryRef);

  await setDoc(
    entryRef,
    {
      ...entry,
      totalPoints: entry.totalPoints ?? 0,
      predictionPoints: entry.predictionPoints ?? 0,
      topScorerPoints: entry.topScorerPoints ?? 0,
      topAssistPoints: entry.topAssistPoints ?? 0,
      selectedTeamPoints: entry.selectedTeamPoints ?? 0,
      createdAt: existingDoc.exists()
        ? existingDoc.data().createdAt
        : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const getFantasyEntryByUserId = async (userId: string) => {
  const entryRef = doc(db, "fantasyEntries", userId);
  const snap = await getDoc(entryRef);

  if (!snap.exists()) return null;

  const data = snap.data() as FantasyEntry;

  return {
    ...data,
    totalPoints: Number(data.totalPoints ?? 0),
    predictionPoints: Number(data.predictionPoints ?? 0),
    topScorerPoints: Number(data.topScorerPoints ?? 0),
    topAssistPoints: Number(data.topAssistPoints ?? 0),
    selectedTeamPoints: Number(data.selectedTeamPoints ?? 0),
  } as FantasyEntry;
};

export const saveMatchPredictions = async (
  userId: string,
  predictions: MatchPredictionInput[]
) => {
  await Promise.all(
    predictions.map((prediction) => {
      const predictionId = `${userId}_${prediction.gameId}`;
      const predictionRef = doc(db, "predictions", predictionId);

      return setDoc(
        predictionRef,
        {
          id: predictionId,
          userId,
          gameId: Number(prediction.gameId),
          predictedHomeScore: Number(prediction.predictedHomeScore),
          predictedAwayScore: Number(prediction.predictedAwayScore),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    })
  );
};

export const getPredictionsByUserId = async (userId: string) => {
  const q = query(collection(db, "predictions"), where("userId", "==", userId));
  const snap = await getDocs(q);

  return snap.docs
    .map((docSnap) => {
      const data = docSnap.data() as MatchPrediction;

      return {
        ...data,
        gameId: Number(data.gameId),
        predictedHomeScore: Number(data.predictedHomeScore),
        predictedAwayScore: Number(data.predictedAwayScore),
      };
    })
    .sort((a, b) => a.gameId - b.gameId);
};

export const subscribeToFantasyEntries = (
  callback: (entries: FantasyEntry[]) => void
) => {
  const q = query(collection(db, "fantasyEntries"), orderBy("totalPoints", "desc"));

  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as FantasyEntry;

      return {
        ...data,
        totalPoints: Number(data.totalPoints ?? 0),
        predictionPoints: Number(data.predictionPoints ?? 0),
        topScorerPoints: Number(data.topScorerPoints ?? 0),
        topAssistPoints: Number(data.topAssistPoints ?? 0),
        selectedTeamPoints: Number(data.selectedTeamPoints ?? 0),
      };
    });

    callback(entries);
  });
};

export const getPredictionsForUser = async (userId: string) => {
  const q = query(collection(db, "predictions"), where("userId", "==", userId));
  const snap = await getDocs(q);

  return snap.docs
    .map((docSnap) => {
      const data = docSnap.data() as MatchPrediction;

      return {
        ...data,
        gameId: Number(data.gameId),
        predictedHomeScore: Number(data.predictedHomeScore),
        predictedAwayScore: Number(data.predictedAwayScore),
      };
    })
    .sort((a, b) => a.gameId - b.gameId);
};

export const updateFantasyEntryPoints = async (
  userId: string,
  points: {
    totalPoints: number;
    predictionPoints: number;
    topScorerPoints: number;
    topAssistPoints: number;
    selectedTeamPoints: number;
  }
) => {
  const entryRef = doc(db, "fantasyEntries", userId);

  await updateDoc(entryRef, {
    totalPoints: Number(points.totalPoints ?? 0),
    predictionPoints: Number(points.predictionPoints ?? 0),
    topScorerPoints: Number(points.topScorerPoints ?? 0),
    topAssistPoints: Number(points.topAssistPoints ?? 0),
    selectedTeamPoints: Number(points.selectedTeamPoints ?? 0),
    updatedAt: serverTimestamp(),
  });
};

export const getAllFantasyEntries = async () => {
  const snap = await getDocs(collection(db, "fantasyEntries"));

  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as FantasyEntry;

    return {
      ...data,
      totalPoints: Number(data.totalPoints ?? 0),
      predictionPoints: Number(data.predictionPoints ?? 0),
      topScorerPoints: Number(data.topScorerPoints ?? 0),
      topAssistPoints: Number(data.topAssistPoints ?? 0),
      selectedTeamPoints: Number(data.selectedTeamPoints ?? 0),
    };
  });
};

export const getAllPredictions = async () => {
  const snap = await getDocs(collection(db, "predictions"));

  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as MatchPrediction;

    return {
      ...data,
      gameId: Number(data.gameId),
      predictedHomeScore: Number(data.predictedHomeScore),
      predictedAwayScore: Number(data.predictedAwayScore),
    };
  });
};