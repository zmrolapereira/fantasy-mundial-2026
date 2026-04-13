"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { User } from "firebase/auth";
import { listenToAuth } from "@/lib/auth";
import { teams } from "@/data/teams";
import { games, type Game } from "@/data/games";
import {
  FantasyEntry,
  MatchPrediction,
  getPredictionsForUser,
  subscribeToFantasyEntries,
} from "@/lib/fantasy-entry";
import { getStageLeaderboardSnapshot } from "@/lib/leaderboard-snapshots";

function getFlagByCountry(countryName?: string) {
  if (!countryName) return undefined;
  return teams.find((team) => team.name === countryName)?.flag;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function getOutcome(home: number, away: number) {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

function getPredictionPoints(prediction: MatchPrediction, game?: Game) {
  if (
    !game ||
    game.status !== "FT" ||
    game.homeScore === null ||
    game.awayScore === null
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

type RankedEntry = FantasyEntry & {
  rank: number;
};

type PredictionWithGame = MatchPrediction & {
  game?: Game;
  points: number;
};

type HistoryRow = {
  label: string;
  points: number;
};

type LeaderboardMode = "overall" | "stage";

type StageOption = {
  id: string;
  label: string;
  order: number;
};

type StageRankedEntry = FantasyEntry & {
  rank: number;
  stagePoints: number;
};

function buildPredictionHistory(predictions: PredictionWithGame[]) {
  const order = [
    "Jornada 1",
    "Jornada 2",
    "Jornada 3",
    "16 avos",
    "Oitavos",
    "Quartos",
    "Meias-finais",
    "3º lugar",
    "Final",
  ];

  const grouped: Record<string, number> = {};

  predictions.forEach((prediction) => {
    if (!prediction.game || prediction.game.status !== "FT") return;

    const label =
      prediction.game.phase === "Fase de Grupos"
        ? prediction.game.round
        : prediction.game.phase;

    grouped[label] = (grouped[label] || 0) + prediction.points;
  });

  return Object.entries(grouped)
    .map(([label, points]) => ({ label, points }))
    .sort((a, b) => {
      const aIndex = order.indexOf(a.label);
      const bIndex = order.indexOf(b.label);

      if (aIndex === -1 && bIndex === -1) return a.label.localeCompare(b.label);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
}

function getStageLabel(game?: Game) {
  if (!game) return "";
  return game.phase === "Fase de Grupos" ? game.round : game.phase;
}

function getStageOrder(label: string) {
  const order = [
    "Jornada 1",
    "Jornada 2",
    "Jornada 3",
    "16 avos",
    "Oitavos",
    "Quartos",
    "Meias-finais",
    "3º lugar",
    "Final",
  ];

  const index = order.indexOf(label);
  return index === -1 ? 999 : index;
}

function getStageId(label: string) {
  return label.trim().toLowerCase();
}

function medalEmoji(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

function MiniFlagBadge({
  flag,
  fallback,
}: {
  flag?: string;
  fallback: string;
}) {
  return (
    <div className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100">
      {flag ? (
        <img src={flag} alt={fallback} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[8px] font-black text-gray-500">{fallback}</span>
      )}
    </div>
  );
}

function RankingBadge({
  rank,
  isMine,
}: {
  rank: number;
  isMine?: boolean;
}) {
  if (rank === 1) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-[11px] font-black text-slate-900">
        1
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-[11px] font-black text-slate-900">
        2
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-[11px] font-black text-slate-900">
        3
      </div>
    );
  }

  return (
    <div
      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ${
        isMine
          ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
          : "bg-gray-100 text-gray-800 ring-1 ring-gray-200"
      }`}
    >
      {rank}
    </div>
  );
}

function TinyStat({
  label,
  value,
  bg,
  color,
}: {
  label: string;
  value: number | string;
  bg: string;
  color: string;
}) {
  return (
    <div
      className="rounded-full px-2 py-0.5 text-[9px] font-black"
      style={{ backgroundColor: bg, color }}
    >
      {label} {value}
    </div>
  );
}

export default function RankingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<FantasyEntry[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [selectedPredictions, setSelectedPredictions] = useState<MatchPrediction[]>(
    []
  );
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  const [predictionsByUserId, setPredictionsByUserId] = useState<
    Record<string, MatchPrediction[]>
  >({});
  const [loadingAllPredictions, setLoadingAllPredictions] = useState(false);

  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>("ALL");
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>("ALL");

  const [leaderboardMode, setLeaderboardMode] =
    useState<LeaderboardMode>("overall");
  const [selectedStageId, setSelectedStageId] = useState<string>("");

  const [stageSnapshotEntries, setStageSnapshotEntries] = useState<
    StageRankedEntry[]
  >([]);
  const [loadingStageSnapshot, setLoadingStageSnapshot] = useState(false);

  useEffect(() => {
    const unsubscribe = listenToAuth(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToFantasyEntries((entriesData) => {
      setEntries(entriesData);
    });

    return () => unsubscribe();
  }, []);

  const leaderboard: RankedEntry[] = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      const totalDiff = (b.totalPoints ?? 0) - (a.totalPoints ?? 0);
      if (totalDiff !== 0) return totalDiff;

      const predictionDiff =
        (b.predictionPoints ?? 0) - (a.predictionPoints ?? 0);
      if (predictionDiff !== 0) return predictionDiff;

      return (a.teamName ?? "").localeCompare(b.teamName ?? "");
    });

    let currentRank = 1;

    return sorted.map((entry, index) => {
      if (index > 0) {
        const prev = sorted[index - 1];

        const samePoints =
          (entry.totalPoints ?? 0) === (prev.totalPoints ?? 0) &&
          (entry.predictionPoints ?? 0) === (prev.predictionPoints ?? 0);

        if (!samePoints) currentRank = index + 1;
      }

      return {
        ...entry,
        rank: currentRank,
      };
    });
  }, [entries]);

  useEffect(() => {
    const loadAllPredictions = async () => {
      if (leaderboard.length === 0) {
        setPredictionsByUserId({});
        return;
      }

      try {
        setLoadingAllPredictions(true);

        const results = await Promise.all(
          leaderboard.map(async (entry) => {
            const predictions = await getPredictionsForUser(entry.userId);
            return [entry.userId, predictions] as const;
          })
        );

        setPredictionsByUserId(Object.fromEntries(results));
      } catch (error) {
        console.error(error);
        setPredictionsByUserId({});
      } finally {
        setLoadingAllPredictions(false);
      }
    };

    loadAllPredictions();
  }, [leaderboard]);

  const finishedGames = useMemo(() => {
    return games.filter(
      (game) =>
        game.status === "FT" &&
        game.homeScore !== null &&
        game.awayScore !== null
    );
  }, []);

  const stageOptions: StageOption[] = useMemo(() => {
    const unique = new Map<string, StageOption>();

    finishedGames.forEach((game) => {
      const label = getStageLabel(game);
      if (!label) return;

      const id = getStageId(label);

      if (!unique.has(id)) {
        unique.set(id, {
          id,
          label,
          order: getStageOrder(label),
        });
      }
    });

    return Array.from(unique.values()).sort((a, b) => a.order - b.order);
  }, [finishedGames]);

  useEffect(() => {
    if (!selectedStageId && stageOptions.length > 0) {
      setSelectedStageId(stageOptions[0].id);
    }
  }, [stageOptions, selectedStageId]);

  const myOverallEntry = useMemo(() => {
    if (!user?.uid) return null;
    return leaderboard.find((entry) => entry.userId === user.uid) ?? null;
  }, [leaderboard, user?.uid]);

  useEffect(() => {
    if (!selectedUserId) {
      if (user?.uid && leaderboard.some((entry) => entry.userId === user.uid)) {
        setSelectedUserId(user.uid);
        return;
      }

      if (leaderboard.length > 0) {
        setSelectedUserId(leaderboard[0].userId);
      }
      return;
    }

    if (
      leaderboard.length > 0 &&
      !leaderboard.some((entry) => entry.userId === selectedUserId)
    ) {
      if (user?.uid && leaderboard.some((entry) => entry.userId === user.uid)) {
        setSelectedUserId(user.uid);
      } else {
        setSelectedUserId(leaderboard[0].userId);
      }
    }
  }, [leaderboard, selectedUserId, user?.uid]);

  const stageLeaderboard: StageRankedEntry[] = useMemo(() => {
    if (!selectedStageId) return [];

    const withStagePoints = entries.map((entry) => {
      const predictions = predictionsByUserId[entry.userId] ?? [];

      const stagePoints = predictions.reduce((sum, prediction) => {
        const game = games.find((g) => g.id === prediction.gameId);
        const stageId = getStageId(getStageLabel(game));

        if (stageId !== selectedStageId) return sum;
        return sum + getPredictionPoints(prediction, game);
      }, 0);

      return {
        ...entry,
        stagePoints,
      };
    });

    const sorted = withStagePoints.sort((a, b) => {
      const stageDiff = b.stagePoints - a.stagePoints;
      if (stageDiff !== 0) return stageDiff;

      const totalDiff = (b.totalPoints ?? 0) - (a.totalPoints ?? 0);
      if (totalDiff !== 0) return totalDiff;

      return (a.teamName ?? "").localeCompare(b.teamName ?? "");
    });

    let currentRank = 1;

    return sorted.map((entry, index) => {
      if (index > 0) {
        const prev = sorted[index - 1];

        const samePoints =
          entry.stagePoints === prev.stagePoints &&
          (entry.totalPoints ?? 0) === (prev.totalPoints ?? 0);

        if (!samePoints) currentRank = index + 1;
      }

      return {
        ...entry,
        rank: currentRank,
      };
    });
  }, [entries, predictionsByUserId, selectedStageId]);

  useEffect(() => {
    const loadStageSnapshot = async () => {
      if (leaderboardMode !== "stage" || !selectedStageId) {
        setStageSnapshotEntries([]);
        return;
      }

      try {
        setLoadingStageSnapshot(true);
        const snapshot = await getStageLeaderboardSnapshot(selectedStageId);

        if (!snapshot || !Array.isArray((snapshot as any).entries)) {
          setStageSnapshotEntries([]);
          return;
        }

        const mapped: StageRankedEntry[] = (snapshot as any).entries.map(
          (entry: any) => {
            const fullEntry = entries.find((e) => e.userId === entry.userId);

            return {
              ...(fullEntry ?? {
                userId: entry.userId,
                teamName: entry.teamName,
                managerName: entry.managerName,
              }),
              rank: entry.rank,
              stagePoints: entry.stagePoints,
            } as StageRankedEntry;
          }
        );

        setStageSnapshotEntries(mapped);
      } catch (error) {
        console.error(error);
        setStageSnapshotEntries([]);
      } finally {
        setLoadingStageSnapshot(false);
      }
    };

    loadStageSnapshot();
  }, [leaderboardMode, selectedStageId, entries]);

  const myStageEntry = useMemo(() => {
    if (!user?.uid) return null;

    const source =
      stageSnapshotEntries.length > 0 ? stageSnapshotEntries : stageLeaderboard;

    return source.find((entry) => entry.userId === user.uid) ?? null;
  }, [stageLeaderboard, stageSnapshotEntries, user?.uid]);

  const activeOverallEntry =
    leaderboard.find((entry) => entry.userId === selectedUserId) ?? leaderboard[0];

  const currentStageSource =
    stageSnapshotEntries.length > 0 ? stageSnapshotEntries : stageLeaderboard;

  const activeStageEntry =
    currentStageSource.find((entry) => entry.userId === selectedUserId) ??
    currentStageSource[0];

  const activeEntry =
    leaderboardMode === "overall" ? activeOverallEntry : activeStageEntry;

  const activeStageLabel =
    stageOptions.find((option) => option.id === selectedStageId)?.label ?? "";

  const podium = useMemo(() => {
    return leaderboardMode === "overall"
      ? leaderboard.slice(0, 3)
      : currentStageSource.slice(0, 3);
  }, [leaderboard, currentStageSource, leaderboardMode]);

  useEffect(() => {
    const loadPredictions = async () => {
      if (!activeEntry?.userId) {
        setSelectedPredictions([]);
        return;
      }

      try {
        setLoadingPredictions(true);
        const predictions = await getPredictionsForUser(activeEntry.userId);
        setSelectedPredictions(predictions);
      } catch (error) {
        console.error(error);
        setSelectedPredictions([]);
      } finally {
        setLoadingPredictions(false);
      }
    };

    loadPredictions();
  }, [activeEntry?.userId]);

  const predictionsWithGameData: PredictionWithGame[] = useMemo(() => {
    return selectedPredictions.map((prediction) => {
      const game = games.find((g) => g.id === prediction.gameId);

      return {
        ...prediction,
        game,
        points: getPredictionPoints(prediction, game),
      };
    });
  }, [selectedPredictions]);

  const finishedPredictionsWithGameData = useMemo(() => {
    return predictionsWithGameData.filter(
      (prediction) => prediction.game && prediction.game.status === "FT"
    );
  }, [predictionsWithGameData]);

  const stageFilteredPredictions = useMemo(() => {
    if (leaderboardMode !== "stage") return finishedPredictionsWithGameData;

    return finishedPredictionsWithGameData.filter(
      (prediction) => getStageId(getStageLabel(prediction.game)) === selectedStageId
    );
  }, [finishedPredictionsWithGameData, leaderboardMode, selectedStageId]);

  const selectedHistory: HistoryRow[] = useMemo(() => {
    return buildPredictionHistory(finishedPredictionsWithGameData);
  }, [finishedPredictionsWithGameData]);

  const availableRounds = useMemo(() => {
    return [
      "ALL",
      ...Array.from(
        new Set(
          stageFilteredPredictions
            .map((prediction) => prediction.game?.round)
            .filter(Boolean) as string[]
        )
      ),
    ];
  }, [stageFilteredPredictions]);

  const availablePhases = useMemo(() => {
    return [
      "ALL",
      ...Array.from(
        new Set(
          stageFilteredPredictions
            .map((prediction) => prediction.game?.phase)
            .filter(Boolean) as string[]
        )
      ),
    ];
  }, [stageFilteredPredictions]);

  const filteredPredictions = useMemo(() => {
    return stageFilteredPredictions.filter((prediction) => {
      const matchesRound =
        selectedRoundFilter === "ALL" ||
        prediction.game?.round === selectedRoundFilter;

      const matchesPhase =
        selectedPhaseFilter === "ALL" ||
        prediction.game?.phase === selectedPhaseFilter;

      return matchesRound && matchesPhase;
    });
  }, [
    stageFilteredPredictions,
    selectedRoundFilter,
    selectedPhaseFilter,
  ]);

  useEffect(() => {
    setSelectedRoundFilter("ALL");
    setSelectedPhaseFilter("ALL");
  }, [leaderboardMode, selectedStageId, selectedUserId]);

  const activeLeaderboard =
    leaderboardMode === "overall"
      ? leaderboard
      : stageSnapshotEntries.length > 0
      ? stageSnapshotEntries
      : stageLeaderboard;

  const myEntry = leaderboardMode === "overall" ? myOverallEntry : myStageEntry;

  return (
    <main className="min-h-screen bg-[#f4f6fb] text-gray-900">
      <header className="mb-6 w-full border-b bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Fantasy Mundial 2026
            </h1>
            <p className="text-sm text-gray-500">Liga oficial do Mundial</p>
          </div>

          <nav className="flex gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <Link href="/login" className="hover:text-blue-600">
              Login
            </Link>
            <Link href="/team" className="hover:text-blue-600">
              A Minha Equipa
            </Link>
            <Link href="/stats" className="hover:text-blue-600">
              Estatísticas
            </Link>
            <Link href="/games" className="hover:text-blue-600">
              Jogos
            </Link>
            <Link href="/table" className="hover:text-blue-600">
              Tabela
            </Link>
            <Link href="/rules" className="hover:text-blue-600">
              Info
            </Link>
            <Link href="/ranking" className="font-semibold text-blue-600">
              Ranking
            </Link>
          </nav>
        </div>
      </header>

      <section className="mb-4">
        <div className="mx-auto max-w-[1600px] px-4">
          <div
            className="overflow-hidden rounded-[22px] shadow-lg"
            style={{
              background:
                "linear-gradient(90deg, #67c7e8 0%, #4f83ff 52%, #8b2cf5 100%)",
            }}
          >
            <div className="px-6 py-5 md:px-8 md:py-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
                    Leaderboard
                  </p>

                  <h2 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
                    {leaderboardMode === "overall"
                      ? "Ranking Global"
                      : `Leaderboard • ${activeStageLabel || "Jornada / Fase"}`}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/95">
                    {leaderboardMode === "overall"
                      ? "Vê a classificação geral e acompanha a posição da tua equipa."
                      : "Classificação da jornada ou fase com base nos jogos concluídos."}
                  </p>

                  {leaderboardMode === "stage" && (
                    <p className="mt-2 text-xs font-semibold text-white/85">
                      {loadingStageSnapshot
                        ? "A carregar snapshot..."
                        : stageSnapshotEntries.length > 0
                        ? "Snapshot histórico guardado"
                        : "Cálculo em tempo real"}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setLeaderboardMode("overall")}
                      className="rounded-full px-4 py-1.5 text-sm font-bold transition"
                      style={{
                        backgroundColor:
                          leaderboardMode === "overall"
                            ? "#ffffff"
                            : "rgba(255,255,255,0.18)",
                        color: leaderboardMode === "overall" ? "#111827" : "#ffffff",
                      }}
                    >
                      Ranking geral
                    </button>

                    <button
                      onClick={() => setLeaderboardMode("stage")}
                      className="rounded-full px-4 py-1.5 text-sm font-bold transition"
                      style={{
                        backgroundColor:
                          leaderboardMode === "stage"
                            ? "#ffffff"
                            : "rgba(255,255,255,0.18)",
                        color: leaderboardMode === "stage" ? "#111827" : "#ffffff",
                      }}
                    >
                      Jornada / fase
                    </button>
                  </div>

                  {leaderboardMode === "stage" && (
                    <div className="mt-3 max-w-[300px]">
                      <select
                        value={selectedStageId}
                        onChange={(e) => setSelectedStageId(e.target.value)}
                        className="h-9 w-full rounded-xl border border-white/25 bg-white/95 px-3 text-sm font-semibold text-gray-900 outline-none"
                      >
                        {stageOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 xl:w-auto">
                  <div className="rounded-2xl bg-white/18 px-4 py-3 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                      Equipas
                    </p>
                    <p className="mt-1 text-xl font-black text-white">
                      {leaderboard.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/18 px-4 py-3 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                      A tua posição
                    </p>
                    <p className="mt-1 text-xl font-black text-white">
                      {myEntry?.rank ? `${myEntry.rank}º` : "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/18 px-4 py-3 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                      Líder
                    </p>
                    <p className="mt-1 text-sm font-black text-white">
                      {activeLeaderboard[0]?.teamName || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {myEntry && (
        <section className="mb-4">
          <div className="mx-auto max-w-[1600px] px-4">
            <div className="rounded-[18px] border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-600">
                    A tua equipa
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-gray-900">
                      {myEntry.teamName || "Sem nome"}
                    </h3>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700">
                      {myEntry.rank}º
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{myEntry.managerName}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center">
                    <p className="text-[9px] uppercase tracking-wide text-gray-500">
                      Posição
                    </p>
                    <p className="text-base font-black text-gray-900">
                      {myEntry.rank}º
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center">
                    <p className="text-[9px] uppercase tracking-wide text-gray-500">
                      {leaderboardMode === "overall" ? "Pts" : "Fase"}
                    </p>
                    <p className="text-base font-black text-gray-900">
                      {leaderboardMode === "overall"
                        ? myEntry.totalPoints ?? 0
                        : (myEntry as StageRankedEntry).stagePoints ?? 0}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedUserId(myEntry.userId)}
                    className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700"
                  >
                    Ver
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-[1600px] px-4 pb-10">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.82fr_0.8fr]">
          <section>
            {podium.length > 0 && (
              <div className="mb-3 grid gap-3 md:grid-cols-3">
                {podium.map((entry) => {
                  const championFlag = getFlagByCountry(entry.championPick?.teamName);
                  const isSelected = activeEntry?.userId === entry.userId;
                  const primaryPoints =
                    leaderboardMode === "overall"
                      ? entry.totalPoints ?? 0
                      : (entry as StageRankedEntry).stagePoints ?? 0;

                  return (
                    <button
                      key={entry.userId}
                      onClick={() => setSelectedUserId(entry.userId)}
                      className={`rounded-[18px] border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 ${
                        isSelected
                          ? "border-violet-300 bg-violet-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black text-gray-700">
                            {medalEmoji(entry.rank)} {entry.rank}º
                          </p>
                          <p className="mt-1 text-base font-black leading-tight text-gray-900">
                            {entry.teamName || "Sem nome"}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-500">
                            {entry.managerName}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500">
                            {leaderboardMode === "overall" ? "PTS" : "FASE"}
                          </p>
                          <p className="mt-1 text-2xl font-black text-gray-900">
                            {primaryPoints}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {championFlag ? (
                            <img
                              src={championFlag}
                              alt={entry.championPick?.teamName || "Seleção"}
                              className="h-4 w-7 rounded object-cover"
                            />
                          ) : (
                            <div className="h-4 w-7 rounded bg-gray-200" />
                          )}

                          <span className="text-[11px] font-semibold text-gray-600">
                            {entry.championPick?.teamName || "Sem seleção"}
                          </span>
                        </div>

                        {leaderboardMode === "overall" ? (
                          <div className="flex items-center gap-1">
                            <TinyStat label="G" value={entry.topScorerPoints ?? 0} bg="rgba(245,158,11,0.12)" color="#b45309" />
                            <TinyStat label="A" value={entry.topAssistPoints ?? 0} bg="rgba(59,130,246,0.12)" color="#1d4ed8" />
                            <TinyStat label="P" value={entry.predictionPoints ?? 0} bg="rgba(16,185,129,0.12)" color="#047857" />
                          </div>
                        ) : (
                          <TinyStat
                            label=""
                            value={`${(entry as StageRankedEntry).stagePoints ?? 0} pts`}
                            bg="rgba(139,92,246,0.12)"
                            color="#6d28d9"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-sm">
              <div className="grid grid-cols-[62px_1.55fr_1fr_82px_112px_20px] border-b border-gray-200 bg-gray-50 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500">
                <div>Rank</div>
                <div>Equipa</div>
                <div>Manager</div>
                <div className="text-center">
                  {leaderboardMode === "overall" ? "Pts" : "Fase"}
                </div>
                <div className="text-center">Picks</div>
                <div />
              </div>

              <div>
                {activeLeaderboard.map((entry) => {
                  const championFlag = getFlagByCountry(entry.championPick?.teamName);
                  const isSelected = activeEntry?.userId === entry.userId;
                  const isMine = user?.uid === entry.userId;

                  const displayedPoints =
                    leaderboardMode === "overall"
                      ? entry.totalPoints ?? 0
                      : (entry as StageRankedEntry).stagePoints ?? 0;

                  return (
                    <button
                      key={entry.userId}
                      onClick={() => setSelectedUserId(entry.userId)}
                      className={`grid w-full grid-cols-[62px_1.55fr_1fr_82px_112px_20px] items-center border-b border-gray-100 px-3 py-2 text-left transition ${
                        isSelected
                          ? "bg-violet-50"
                          : isMine
                          ? "bg-blue-50"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <RankingBadge rank={entry.rank} isMine={isMine} />
                        <span className="text-[10px]">{medalEmoji(entry.rank)}</span>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[14px] font-black leading-tight text-gray-900">
                            {entry.teamName || "Sem nome"}
                          </p>
                          {isMine && (
                            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-blue-700">
                              A tua
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-gray-600">
                          {entry.managerName}
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-lg font-black text-gray-900">
                          {displayedPoints}
                        </p>
                      </div>

                      <div className="flex items-center justify-center">
                        <div className="flex items-center gap-1">
                          <MiniFlagBadge fallback="G" flag={undefined} />
                          <MiniFlagBadge fallback="A" flag={undefined} />
                          <MiniFlagBadge fallback="S" flag={championFlag} />
                        </div>
                      </div>

                      <div className="text-center text-sm text-gray-400">›</div>
                    </button>
                  );
                })}

                {activeLeaderboard.length === 0 && (
                  <div className="px-6 py-10 text-center text-sm text-gray-500">
                    {loadingAllPredictions
                      ? "A carregar leaderboard..."
                      : "Ainda não existem equipas registadas."}
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="rounded-[18px] border border-gray-200 bg-white p-4 shadow-sm">
            {!activeEntry ? (
              <p className="text-gray-500">Ainda não existem entradas.</p>
            ) : (
              <>
                <div
                  className="rounded-[16px] p-4 text-white"
                  style={{
                    background:
                      "linear-gradient(90deg, #67c7e8 0%, #4f83ff 52%, #8b2cf5 100%)",
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
                    Equipa selecionada
                  </p>
                  <h3 className="mt-1 text-lg font-black">
                    {activeEntry.teamName || "Sem nome"}
                  </h3>
                  <p className="mt-1 text-[11px] text-white/85">
                    {activeEntry.managerName}
                  </p>
                </div>

                <div className="mt-3 rounded-[16px] border border-gray-200 bg-[#f8fafc] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                    {leaderboardMode === "overall"
                      ? "Pontuação"
                      : `Pontuação • ${activeStageLabel || "Fase"}`}
                  </p>

                  <div className="mt-2 rounded-2xl border border-gray-200 bg-white p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      {leaderboardMode === "overall"
                        ? "Pontos totais"
                        : "Pontos da jornada/fase"}
                    </p>
                    <p className="mt-1 text-2xl font-black text-gray-900">
                      {leaderboardMode === "overall"
                        ? activeEntry.totalPoints ?? 0
                        : (activeEntry as StageRankedEntry).stagePoints ?? 0}
                    </p>
                  </div>

                  {leaderboardMode === "overall" ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-gray-200 bg-white p-3">
                        <p className="text-[9px] uppercase tracking-wide text-gray-500">
                          Marcador
                        </p>
                        <p className="mt-1 text-lg font-black text-amber-700">
                          {activeEntry.topScorerPoints ?? 0}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white p-3">
                        <p className="text-[9px] uppercase tracking-wide text-gray-500">
                          Assist.
                        </p>
                        <p className="mt-1 text-lg font-black text-blue-700">
                          {activeEntry.topAssistPoints ?? 0}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white p-3">
                        <p className="text-[9px] uppercase tracking-wide text-gray-500">
                          Campeã
                        </p>
                        <p className="mt-1 text-lg font-black text-rose-700">
                          {activeEntry.selectedTeamPoints ?? 0}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white p-3">
                        <p className="text-[9px] uppercase tracking-wide text-gray-500">
                          Palpites
                        </p>
                        <p className="mt-1 text-lg font-black text-emerald-700">
                          {activeEntry.predictionPoints ?? 0}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-gray-200 bg-white p-3">
                        <p className="text-[9px] uppercase tracking-wide text-gray-500">
                          Geral
                        </p>
                        <p className="mt-1 text-lg font-black text-gray-900">
                          {activeOverallEntry?.rank ?? "—"}º
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white p-3">
                        <p className="text-[9px] uppercase tracking-wide text-gray-500">
                          Totais
                        </p>
                        <p className="mt-1 text-lg font-black text-gray-900">
                          {activeOverallEntry?.totalPoints ?? 0}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-[16px] border border-gray-200 bg-[#f8fafc] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Picks
                  </p>
                  <p className="mt-2 text-xs font-semibold text-gray-900">
                    Melhor marcador: {activeEntry.topScorerPick?.playerName || "—"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-900">
                    Melhor assistente: {activeEntry.topAssistPick?.playerName || "—"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-900">
                    Seleção campeã: {activeEntry.championPick?.teamName || "—"}
                  </p>
                </div>

                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-900">
                      {leaderboardMode === "overall"
                        ? "Histórico"
                        : `Histórico • ${activeStageLabel || "Fase"}`}
                    </h4>
                    {loadingPredictions && (
                      <span className="text-[10px] text-gray-500">A carregar...</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {leaderboardMode === "overall" ? (
                      selectedHistory.length === 0 && !loadingPredictions ? (
                        <div className="rounded-2xl border border-gray-200 bg-[#f8fafc] p-3 text-xs text-gray-500">
                          Ainda não há histórico disponível.
                        </div>
                      ) : (
                        selectedHistory.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-[#f8fafc] px-3 py-2"
                          >
                            <p className="text-xs font-semibold text-gray-900">
                              {row.label}
                            </p>
                            <p className="text-sm font-black text-gray-900">
                              {row.points}
                            </p>
                          </div>
                        ))
                      )
                    ) : (
                      <div className="rounded-2xl border border-gray-200 bg-[#f8fafc] p-3">
                        <p className="text-xs text-gray-600">
                          Esta vista mostra os pontos de predictions de{" "}
                          <span className="font-bold text-gray-900">
                            {activeStageLabel || "—"}
                          </span>
                          .
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-2 flex flex-col gap-2">
                    <h4 className="text-xs font-black text-gray-900">
                      {leaderboardMode === "overall"
                        ? "Palpites"
                        : `Palpites • ${activeStageLabel || "Fase"}`}
                    </h4>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <select
                        value={selectedRoundFilter}
                        onChange={(e) => setSelectedRoundFilter(e.target.value)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500"
                      >
                        {availableRounds.map((round) => (
                          <option key={round} value={round}>
                            {round === "ALL" ? "Todas as jornadas" : round}
                          </option>
                        ))}
                      </select>

                      <select
                        value={selectedPhaseFilter}
                        onChange={(e) => setSelectedPhaseFilter(e.target.value)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500"
                      >
                        {availablePhases.map((phase) => (
                          <option key={phase} value={phase}>
                            {phase === "ALL" ? "Todas as fases" : phase}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                    {filteredPredictions.length === 0 && !loadingPredictions ? (
                      <div className="rounded-2xl border border-gray-200 bg-[#f8fafc] p-3 text-xs text-gray-500">
                        Ainda não existem palpites concluídos para estes filtros.
                      </div>
                    ) : (
                      filteredPredictions.map((prediction) => (
                        <div
                          key={prediction.id}
                          className="rounded-2xl border border-gray-200 bg-[#f8fafc] p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                                {prediction.game
                                  ? `${prediction.game.round} • ${formatDate(
                                      prediction.game.date
                                    )}`
                                  : `Jogo ${prediction.gameId}`}
                              </p>
                              <p className="mt-1 text-[11px] text-gray-500">
                                {prediction.game?.homeTeam || "Equipa A"} vs{" "}
                                {prediction.game?.awayTeam || "Equipa B"}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs font-black text-gray-900">
                                {prediction.predictedHomeScore}-
                                {prediction.predictedAwayScore}
                              </p>
                              <p className="text-[11px] text-violet-700">
                                +{prediction.points} pts
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}