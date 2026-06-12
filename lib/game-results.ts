import type { Game } from "@/data/games";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type GameResultStatus = "SCHEDULED" | "LIVE" | "FT";

export type GameResultDoc = {
  gameId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: GameResultStatus;
  penaltyWinner?: string;
  note?: string;
  updatedAt?: unknown;
};

function cleanScore(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

export async function getAllGameResults() {
  const snapshot = await getDocs(collection(db, "gameResults"));

  const results = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Array<GameResultDoc & { id: string }>;

  return results;
}

export async function saveGameResult(params: {
  gameId: string | number;
  homeScore: number | null;
  awayScore: number | null;
  status: GameResultStatus;
  penaltyWinner?: string;
  note?: string;
}) {
  const gameId = String(params.gameId);

  await setDoc(
    doc(db, "gameResults", gameId),
    {
      gameId,
      homeScore:
        params.status === "FT" || params.status === "LIVE"
          ? cleanScore(params.homeScore)
          : null,
      awayScore:
        params.status === "FT" || params.status === "LIVE"
          ? cleanScore(params.awayScore)
          : null,
      status: params.status,
      penaltyWinner: params.penaltyWinner || "",
      note: params.note || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getGamesWithResults(baseGames: Game[]): Promise<Game[]> {
  const results = await getAllGameResults();

  const resultsByGameId = new Map<string, GameResultDoc>();

  results.forEach((result) => {
    resultsByGameId.set(String(result.gameId || result.id), result);
  });

  const mergedGames = baseGames.map((game) => {
    const gameId = String(game.id);
    const result = resultsByGameId.get(gameId);

    if (!result) {
      return game;
    }

    const hasHomeScore = typeof result.homeScore === "number";
    const hasAwayScore = typeof result.awayScore === "number";

    return {
      ...game,
      status: result.status || game.status,
      homeScore: hasHomeScore ? result.homeScore : undefined,
      awayScore: hasAwayScore ? result.awayScore : undefined,
      penaltyWinner: result.penaltyWinner || "",
      note: result.note || "",
    } as Game;
  });

  return mergedGames;
}