import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { players, type Player } from "@/data/players";

export type PlayerTournamentStat = {
  playerId: number;
  goals: number;
  assists: number;
  updatedAt?: unknown;
};

export type PlayerStatHistoryItem = {
  playerId: number;
  playerName: string;
  goals: number;
  assists: number;
  actionType: "save";
  createdAt?: unknown;
};

export const savePlayerTournamentStat = async (
  playerId: number,
  playerName: string,
  goals: number,
  assists: number
) => {
  const ref = doc(db, "playerTournamentStats", String(playerId));

  await setDoc(
    ref,
    {
      playerId,
      goals,
      assists,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await addDoc(collection(db, "playerTournamentStatsHistory"), {
    playerId,
    playerName,
    goals,
    assists,
    actionType: "save",
    createdAt: serverTimestamp(),
  });
};

export const getAllPlayerTournamentStats = async () => {
  const snap = await getDocs(collection(db, "playerTournamentStats"));
  return snap.docs.map((docSnap) => docSnap.data() as PlayerTournamentStat);
};

export const getPlayerStatHistory = async (playerId: number) => {
  const q = query(
    collection(db, "playerTournamentStatsHistory"),
    where("playerId", "==", playerId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as (PlayerStatHistoryItem & { id: string })[];
};

export const mergePlayersWithStats = (
  basePlayers: Player[],
  stats: PlayerTournamentStat[]
): Player[] => {
  const statsMap = new Map<number, PlayerTournamentStat>();

  stats.forEach((stat) => {
    statsMap.set(stat.playerId, stat);
  });

  return basePlayers.map((player) => {
    const liveStat = statsMap.get(player.id);

    const goals = liveStat?.goals ?? 0;
    const assists = liveStat?.assists ?? 0;

    return {
      ...player,
      goals,
      assists,
      points: goals + assists,
    };
  });
};

export const subscribeToLivePlayers = (
  callback: (playersWithStats: Player[]) => void
) => {
  return onSnapshot(collection(db, "playerTournamentStats"), (snapshot) => {
    const stats = snapshot.docs.map(
      (docSnap) => docSnap.data() as PlayerTournamentStat
    );

    const mergedPlayers = mergePlayersWithStats(players, stats);
    callback(mergedPlayers);
  });
};