"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import SiteHeader from "@/components/SiteHeader";
import { games } from "@/data/games";
import { listenToAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";

const ADMIN_EMAIL = "zmrolapereira@gmail.com";

type PredictionDoc = {
  gameId?: string | number;
  userId?: string;
  predictedHomeScore?: string | number;
  predictedAwayScore?: string | number;
};

type Voter = {
  userId: string;
  teamName: string;
  managerName: string;
  predictedScore?: string;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
};

type ResultBucket = {
  count: number;
  voters: Voter[];
};

type TrendGame = {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  totalPredictions: number;

  homeWins: number;
  draws: number;
  awayWins: number;

  homePct: number;
  drawPct: number;
  awayPct: number;

  homeVoters: Voter[];
  drawVoters: Voter[];
  awayVoters: Voter[];

  topResults: {
    score: string;
    count: number;
    pct: number;
    voters: Voter[];
  }[];
};

type TrendRoundDoc = {
  round: string;
  roundKey: string;
  availableAt: string;
  games: TrendGame[];
  totalPredictions: number;
};

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/º/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getGameId(game: any) {
  return String(game.id);
}

function getRoundLabel(game: any) {
  const phase = String(
    game.phase ||
      game.fase ||
      game.stage ||
      game.phaseName ||
      game.stageName ||
      ""
  ).trim();

  const round = String(game.round || game.jornada || game.roundName || "").trim();

  const normalizedPhase = phase.toLowerCase();
  const normalizedRound = round.toLowerCase();

  const isGroupStage =
    normalizedPhase.includes("fase de grupos") ||
    normalizedPhase.includes("grupos") ||
    normalizedPhase.includes("group");

  if (isGroupStage) {
    if (normalizedRound.includes("jornada 1") || normalizedRound === "1") {
      return "Fase de Grupos - Jornada 1";
    }

    if (normalizedRound.includes("jornada 2") || normalizedRound === "2") {
      return "Fase de Grupos - Jornada 2";
    }

    if (normalizedRound.includes("jornada 3") || normalizedRound === "3") {
      return "Fase de Grupos - Jornada 3";
    }

    return round ? `Fase de Grupos - ${round}` : "Fase de Grupos";
  }

  if (normalizedPhase.includes("3º lugar") || normalizedPhase.includes("final")) {
    return "Final e 3º lugar";
  }

  if (phase) return phase;
  if (round) return round;

  return "Sem fase";
}

function getGameDateTime(game: any) {
  const rawDate = game.date || game.gameDate || game.matchDate || game.day || "";
  const rawTime =
    game.time || game.hour || game.kickoffTime || game.startTime || "00:00";

  const date = String(rawDate).slice(0, 10);
  const time = String(rawTime).slice(0, 5);

  if (!date) return new Date("2099-01-01T00:00:00+01:00");

  return new Date(`${date}T${time}:00+01:00`);
}

function hasValidPrediction(data: PredictionDoc) {
  return (
    data.userId &&
    data.gameId !== undefined &&
    data.predictedHomeScore !== undefined &&
    data.predictedHomeScore !== "" &&
    data.predictedAwayScore !== undefined &&
    data.predictedAwayScore !== ""
  );
}

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function cleanNumber(value: string | number | undefined) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

function getVoterLabel(entry: any, userId: string): Voter {
  return {
    userId,
    teamName:
      String(entry?.teamName || entry?.name || entry?.entryName || "").trim() ||
      "Equipa sem nome",
    managerName:
      String(entry?.managerName || entry?.userName || entry?.ownerName || "").trim() ||
      "Manager",
  };
}

async function buildAndSavePredictionTrends() {
  const teamsSnapshot = await getDocs(collection(db, "fantasyEntries"));
  const predictionsSnapshot = await getDocs(collection(db, "predictions"));

  const registeredTeamUserIds = new Set<string>();
  const votersByUserId = new Map<string, Voter>();

  teamsSnapshot.forEach((docSnap) => {
    const data = docSnap.data() as any;
    const userId = String(data.userId || docSnap.id);

    registeredTeamUserIds.add(userId);
    votersByUserId.set(userId, getVoterLabel(data, userId));
  });

  const groupedGames = new Map<string, any[]>();

  games.forEach((game: any) => {
    const round = getRoundLabel(game);

    if (!groupedGames.has(round)) {
      groupedGames.set(round, []);
    }

    groupedGames.get(round)?.push(game);
  });

  const predictionsByGame = new Map<
    string,
    {
      countedUsers: Set<string>;

      homeWins: number;
      draws: number;
      awayWins: number;

      homeVoters: Voter[];
      drawVoters: Voter[];
      awayVoters: Voter[];

      resultCounts: Map<string, ResultBucket>;
    }
  >();

  predictionsSnapshot.forEach((docSnap) => {
    const data = docSnap.data() as PredictionDoc;

    if (!hasValidPrediction(data)) return;

    const userId = String(data.userId);
    const gameId = String(data.gameId);

    if (!registeredTeamUserIds.has(userId)) return;

    const predictedHome = cleanNumber(data.predictedHomeScore);
    const predictedAway = cleanNumber(data.predictedAwayScore);

    if (predictedHome === null || predictedAway === null) return;

    if (!predictionsByGame.has(gameId)) {
      predictionsByGame.set(gameId, {
        countedUsers: new Set<string>(),

        homeWins: 0,
        draws: 0,
        awayWins: 0,

        homeVoters: [],
        drawVoters: [],
        awayVoters: [],

        resultCounts: new Map<string, ResultBucket>(),
      });
    }

    const current = predictionsByGame.get(gameId);
    if (!current) return;

    // Evita duplicados: 1 user só conta 1 vez por jogo
    if (current.countedUsers.has(userId)) return;

    current.countedUsers.add(userId);

    const baseVoter = votersByUserId.get(userId) ?? {
      userId,
      teamName: "Equipa sem nome",
      managerName: "Manager",
    };

    const score = `${predictedHome}-${predictedAway}`;

    const voter: Voter = {
      ...baseVoter,
      predictedScore: score,
      predictedHomeScore: predictedHome,
      predictedAwayScore: predictedAway,
    };

    if (predictedHome > predictedAway) {
      current.homeWins += 1;
      current.homeVoters.push(voter);
    } else if (predictedHome < predictedAway) {
      current.awayWins += 1;
      current.awayVoters.push(voter);
    } else {
      current.draws += 1;
      current.drawVoters.push(voter);
    }

    const existingScore = current.resultCounts.get(score) ?? {
      count: 0,
      voters: [],
    };

    current.resultCounts.set(score, {
      count: existingScore.count + 1,
      voters: [...existingScore.voters, voter],
    });
  });

  const docsToSave: TrendRoundDoc[] = [];

  groupedGames.forEach((roundGames, round) => {
    const sortedGames = [...roundGames].sort(
      (a, b) => getGameDateTime(a).getTime() - getGameDateTime(b).getTime()
    );

    const availableAt = getGameDateTime(sortedGames[0]).toISOString();
    const roundKey = normalizeKey(round);

    const trendGames: TrendGame[] = sortedGames.map((game: any) => {
      const gameId = getGameId(game);

      const predictionData = predictionsByGame.get(gameId) ?? {
        countedUsers: new Set<string>(),

        homeWins: 0,
        draws: 0,
        awayWins: 0,

        homeVoters: [],
        drawVoters: [],
        awayVoters: [],

        resultCounts: new Map<string, ResultBucket>(),
      };

      const totalPredictions = predictionData.countedUsers.size;

      const topResults = Array.from(predictionData.resultCounts.entries())
        .map(([score, bucket]) => ({
          score,
          count: bucket.count,
          pct: pct(bucket.count, totalPredictions),
          voters: bucket.voters,
        }))
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.score.localeCompare(b.score);
        })
        .slice(0, 3);

      return {
        gameId,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        totalPredictions,

        homeWins: predictionData.homeWins,
        draws: predictionData.draws,
        awayWins: predictionData.awayWins,

        homePct: pct(predictionData.homeWins, totalPredictions),
        drawPct: pct(predictionData.draws, totalPredictions),
        awayPct: pct(predictionData.awayWins, totalPredictions),

        homeVoters: predictionData.homeVoters,
        drawVoters: predictionData.drawVoters,
        awayVoters: predictionData.awayVoters,

        topResults,
      };
    });

    docsToSave.push({
      round,
      roundKey,
      availableAt,
      games: trendGames,
      totalPredictions: trendGames.reduce(
        (sum, game) => sum + game.totalPredictions,
        0
      ),
    });
  });

  for (const trendDoc of docsToSave) {
    await setDoc(
      doc(db, "publicPredictionTrends", trendDoc.roundKey),
      {
        ...trendDoc,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return docsToSave.length;
}

export default function GenerateTrendsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = listenToAuth((authUser) => {
      setUser(authUser);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setMessage("");

      const totalDocs = await buildAndSavePredictionTrends();

      setMessage(
        `Tendências atualizadas com sucesso. Foram guardadas ${totalDocs} jornadas/fases com listas de apostas.`
      );
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Erro ao gerar tendências.");
    } finally {
      setGenerating(false);
    }
  };

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 text-gray-900">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            A carregar...
          </div>
        </div>
      </main>
    );
  }

  if (!user || !isAdmin) {
    return (
      <main className="min-h-screen bg-gray-100 text-gray-900">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            Esta página é apenas para admin.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            Admin
          </p>

          <h1 className="mt-2 text-3xl font-black text-gray-900">
            Gerar tendências públicas
          </h1>

          <p className="mt-3 text-sm leading-7 text-gray-600">
            Este botão lê as fantasyEntries e predictions uma única vez, calcula
            as percentagens e grava tudo na collection publicPredictionTrends.
            Agora também grava as listas de equipas que apostaram em vitória da
            casa, empate, vitória fora e nos Top 3 resultados.
          </p>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-900">
            Depois de trocares este ficheiro, tens mesmo de clicar novamente em
            “Gerar / atualizar tendências”. Só aí os campos homeVoters,
            drawVoters, awayVoters e voters dos resultados passam a existir nos
            agregados públicos.
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-violet-900 px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? "A gerar..." : "Gerar / atualizar tendências"}
          </button>

          {message && (
            <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm font-bold text-gray-700">
              {message}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
