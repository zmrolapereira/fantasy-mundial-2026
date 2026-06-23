"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import SiteHeader from "@/components/SiteHeader";
import { teams } from "@/data/teams";
import { db } from "@/lib/firebase";
import { listenToAuth } from "@/lib/auth";

const ADMIN_EMAIL = "zmrolapereira@gmail.com";

type PublicVoter =
  | string
  | {
      userId?: string;
      teamName?: string;
      managerName?: string;
      name?: string;
      predictedScore?: string;
      prediction?: string;
      score?: string;
      predictedHomeScore?: number | string;
      predictedAwayScore?: number | string;
    };

type TopResult = {
  score: string;
  count: number;
  pct: number;
  voters?: PublicVoter[];
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
  topResults?: TopResult[];
  homeVoters?: PublicVoter[];
  drawVoters?: PublicVoter[];
  awayVoters?: PublicVoter[];
};

type TrendRoundDoc = {
  id: string;
  round: string;
  roundKey: string;
  availableAt: string;
  games: TrendGame[];
  totalPredictions: number;
};

type CountItem = {
  name: string;
  team?: string;
  count: number;
  pct: number;
};

type PickDashboard = {
  totalTeams: number;
  topScorers: CountItem[];
  topAssisters: CountItem[];
  champions: CountItem[];
  updatedAt?: unknown;
};

type PageTab = "picks" | "games";
type GameTrendView = "byGame" | "byPerson";
type OutcomeType = "home" | "draw" | "away";

type PersonPrediction = {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  outcomeLabel: string;
  outcomeType: OutcomeType;
  predictedScore: string;
};

type PersonTrendRow = {
  key: string;
  name: string;
  managerName: string;
  predictions: PersonPrediction[];
};

function formatUnlockDate(value: string) {
  try {
    return new Date(value).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function getFlagByCountry(countryName?: string) {
  if (!countryName) return undefined;
  return teams.find((team) => team.name === countryName)?.flag;
}

function safePct(value: number) {
  if (!Number.isFinite(Number(value))) return 0;
  return Math.max(0, Math.min(100, Number(value)));
}

function getFavorite(game: TrendGame) {
  const options = [
    {
      label: game.homeTeam,
      pct: game.homePct,
      count: game.homeWins,
      type: "home" as const,
    },
    {
      label: "Empate",
      pct: game.drawPct,
      count: game.draws,
      type: "draw" as const,
    },
    {
      label: game.awayTeam,
      pct: game.awayPct,
      count: game.awayWins,
      type: "away" as const,
    },
  ];

  return options.sort((a, b) => {
    if (b.pct !== a.pct) return b.pct - a.pct;
    return b.count - a.count;
  })[0];
}

function getVoterName(voter: PublicVoter) {
  if (typeof voter === "string") return voter;

  return (
    voter.teamName ||
    voter.name ||
    voter.managerName ||
    voter.userId ||
    "Equipa sem nome"
  );
}

function getVoterManager(voter: PublicVoter) {
  if (typeof voter === "string") return "";

  if (voter.managerName && voter.managerName !== voter.teamName) {
    return voter.managerName;
  }

  return "";
}

function getVoterScore(voter: PublicVoter) {
  if (typeof voter === "string") return "";

  if (voter.predictedScore) return String(voter.predictedScore);
  if (voter.prediction) return String(voter.prediction);
  if (voter.score) return String(voter.score);

  const home = voter.predictedHomeScore;
  const away = voter.predictedAwayScore;

  if (home !== undefined && home !== "" && away !== undefined && away !== "") {
    return `${home}-${away}`;
  }

  return "";
}

function parsePredictedScore(score?: string) {
  const clean = String(score || "").trim();
  const match = clean.match(/^(\d+)\s*-\s*(\d+)$/);

  if (!match) {
    return {
      home: -1,
      away: -1,
    };
  }

  return {
    home: Number(match[1]),
    away: Number(match[2]),
  };
}

function sortVotersByPredictedScore(voters: PublicVoter[]) {
  return [...voters].sort((a, b) => {
    const scoreA = parsePredictedScore(getVoterScore(a));
    const scoreB = parsePredictedScore(getVoterScore(b));

    if (scoreB.home !== scoreA.home) return scoreB.home - scoreA.home;
    if (scoreB.away !== scoreA.away) return scoreB.away - scoreA.away;

    return getVoterName(a).localeCompare(getVoterName(b), "pt-PT");
  });
}

function getVoterKey(voter: PublicVoter) {
  if (typeof voter === "string") return voter.trim().toLowerCase();

  return String(
    voter.userId ||
      `${voter.teamName || voter.name || ""}-${voter.managerName || ""}`
  )
    .trim()
    .toLowerCase();
}

function getVotersList(voters?: PublicVoter[]) {
  if (!Array.isArray(voters)) return [];
  return voters.filter(Boolean);
}

function getInitials(name: string) {
  const clean = name.trim();
  if (!clean) return "—";

  const words = clean.split(/\s+/).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase()).join("");
}

function getOutcomeMeta(type: OutcomeType) {
  if (type === "home") {
    return {
      dot: "#2563eb",
      bg: "#eff6ff",
      text: "#1d4ed8",
      label: "Casa",
    };
  }

  if (type === "draw") {
    return {
      dot: "#64748b",
      bg: "#f1f5f9",
      text: "#475569",
      label: "Empate",
    };
  }

  return {
    dot: "#7c3aed",
    bg: "#f5f3ff",
    text: "#6d28d9",
    label: "Fora",
  };
}

function buildPersonTrends(games: TrendGame[]): PersonTrendRow[] {
  const people = new Map<string, PersonTrendRow>();

  const addVoter = (
    voter: PublicVoter,
    game: TrendGame,
    outcomeLabel: string,
    outcomeType: OutcomeType
  ) => {
    const key = getVoterKey(voter);
    const name = getVoterName(voter);
    const managerName = getVoterManager(voter);
    const predictedScore = getVoterScore(voter);

    if (!key || !name) return;

    if (!people.has(key)) {
      people.set(key, {
        key,
        name,
        managerName,
        predictions: [],
      });
    }

    people.get(key)?.predictions.push({
      gameId: game.gameId,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      outcomeLabel,
      outcomeType,
      predictedScore,
    });
  };

  games.forEach((game) => {
    getVotersList(game.homeVoters).forEach((voter) =>
      addVoter(voter, game, `Vitória ${game.homeTeam}`, "home")
    );

    getVotersList(game.drawVoters).forEach((voter) =>
      addVoter(voter, game, "Empate", "draw")
    );

    getVotersList(game.awayVoters).forEach((voter) =>
      addVoter(voter, game, `Vitória ${game.awayTeam}`, "away")
    );
  });

  return Array.from(people.values()).sort((a, b) => {
    if (b.predictions.length !== a.predictions.length) {
      return b.predictions.length - a.predictions.length;
    }

    return a.name.localeCompare(b.name);
  });
}

export default function TendenciasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState<PageTab>("picks");
  const [gameTrendView, setGameTrendView] = useState<GameTrendView>("byGame");
  const [personSearch, setPersonSearch] = useState("");
  const [selectedPersonKey, setSelectedPersonKey] = useState("");

  const [loadingTrends, setLoadingTrends] = useState(true);
  const [roundDocs, setRoundDocs] = useState<TrendRoundDoc[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [loadingPicks, setLoadingPicks] = useState(true);
  const [pickDashboard, setPickDashboard] = useState<PickDashboard | null>(null);
  const [pickError, setPickError] = useState("");

  const [openGameKey, setOpenGameKey] = useState<string>("");

  useEffect(() => {
    const unsubscribe = listenToAuth((authUser) => {
      setUser(authUser);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const loadTrends = async () => {
    try {
      setLoadingTrends(true);
      setLoadError("");

      const snapshot = await getDocs(collection(db, "publicPredictionTrends"));

      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as TrendRoundDoc[];

      const sorted = data.sort((a, b) => {
        const dateDiff =
          new Date(a.availableAt).getTime() - new Date(b.availableAt).getTime();

        if (dateDiff !== 0) return dateDiff;

        return a.round.localeCompare(b.round);
      });

      setRoundDocs(sorted);
    } catch (error: any) {
      console.error(error);
      setLoadError(
        error?.message ||
          "Erro ao carregar tendências. Verifica se publicPredictionTrends existe."
      );
    } finally {
      setLoadingTrends(false);
    }
  };

  const loadPickDashboard = async () => {
    try {
      setLoadingPicks(true);
      setPickError("");

      const docSnap = await getDoc(doc(db, "publicPickDashboard", "main"));

      if (!docSnap.exists()) {
        setPickDashboard(null);
        return;
      }

      setPickDashboard(docSnap.data() as PickDashboard);
    } catch (error: any) {
      console.error(error);
      setPickError(
        error?.message ||
          "Erro ao carregar dashboard dos picks. Verifica se publicPickDashboard/main existe."
      );
    } finally {
      setLoadingPicks(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadTrends(), loadPickDashboard()]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const visibleRounds = useMemo(() => {
    const now = new Date();

    if (isAdmin && showPreview) {
      return roundDocs;
    }

    return roundDocs.filter((round) => new Date(round.availableAt) <= now);
  }, [roundDocs, isAdmin, showPreview]);

  const lockedRounds = useMemo(() => {
    const now = new Date();

    return roundDocs.filter((round) => new Date(round.availableAt) > now);
  }, [roundDocs]);

  useEffect(() => {
    if (visibleRounds.length === 0) {
      setSelectedRoundId("");
      return;
    }

    const stillVisible = visibleRounds.some(
      (round) => round.id === selectedRoundId
    );

    if (!selectedRoundId || !stillVisible) {
      setSelectedRoundId(visibleRounds[visibleRounds.length - 1].id);
    }
  }, [visibleRounds, selectedRoundId]);

  const selectedRound = useMemo(() => {
    return visibleRounds.find((round) => round.id === selectedRoundId) ?? null;
  }, [visibleRounds, selectedRoundId]);

  const selectedGames = useMemo(() => {
    if (!selectedRound) return [];

    return [...(selectedRound.games || [])].sort(
      (a, b) => Number(a.gameId) - Number(b.gameId)
    );
  }, [selectedRound]);

  const personTrends = useMemo(() => {
    return buildPersonTrends(selectedGames);
  }, [selectedGames]);

  const filteredPersonTrends = useMemo(() => {
    const search = personSearch.trim().toLowerCase();

    if (!search) return personTrends;

    return personTrends.filter((person) => {
      const teamName = person.name.toLowerCase();
      const managerName = person.managerName.toLowerCase();

      return teamName.includes(search) || managerName.includes(search);
    });
  }, [personTrends, personSearch]);

  const roundTotalPredictions = useMemo(() => {
    return selectedGames.reduce(
      (sum, game) => sum + Number(game.totalPredictions || 0),
      0
    );
  }, [selectedGames]);

  const nextRound = lockedRounds[0] ?? null;

  const copySummary = async () => {
    if (!selectedRound || selectedGames.length === 0) return;

    const lines = [
      `📊 Tendências das predictions — ${selectedRound.round}`,
      "",
      ...selectedGames.map((game) => {
        const favorite = getFavorite(game);

        const topResultsText =
          game.topResults && game.topResults.length > 0
            ? game.topResults
                .map(
                  (result, index) =>
                    `${index + 1}) ${result.score} — ${result.count} voto(s) (${result.pct}%)`
                )
                .join(" | ")
            : "Sem dados suficientes";

        return `⚽ ${game.homeTeam} vs ${game.awayTeam}\n${game.homeTeam}: ${game.homePct}% (${game.homeWins}) | Empate: ${game.drawPct}% (${game.draws}) | ${game.awayTeam}: ${game.awayPct}% (${game.awayWins})\nFavorito: ${favorite.label} ${favorite.pct}%\nTop 3 resultados: ${topResultsText}`;
      }),
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error(error);
      alert("Não consegui copiar o resumo.");
    }
  };

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "#2f2140", color: "#111827" }}
    >
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 md:px-6 md:py-7">
        <section
          className="overflow-hidden rounded-[30px] shadow-2xl"
          style={{
            background:
              "linear-gradient(135deg, #ffffff 0%, #f8fafc 56%, #f5f3ff 100%)",
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-600">
                  Fantasy Mundial 2026
                </p>

                <h1 className="mt-2 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
                  Tendências
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-gray-500 sm:text-base">
                  Vê as apostas mais populares por jogo ou por pessoa. Nas
                  listas, cada equipa aparece com o resultado exato apostado em
                  pequeno.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={refreshAll}
                    disabled={loadingTrends || loadingPicks}
                    className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-black disabled:opacity-60"
                    style={{
                      backgroundColor: "#2f2140",
                      color: "#ffffff",
                      border: "1px solid #2f2140",
                    }}
                  >
                    {loadingTrends || loadingPicks
                      ? "A atualizar..."
                      : "Atualizar dados"}
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowPreview((value) => !value)}
                    className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-black"
                    style={{
                      backgroundColor: showPreview ? "#fee2e2" : "#ffffff",
                      color: showPreview ? "#991b1b" : "#374151",
                      border: showPreview
                        ? "1px solid #fca5a5"
                        : "1px solid #e5e7eb",
                    }}
                  >
                    {showPreview ? "Desligar teste" : "Ver antes das datas"}
                  </button>
                )}

                {activeTab === "games" && (
                  <button
                    type="button"
                    onClick={copySummary}
                    disabled={!selectedRound || selectedGames.length === 0}
                    className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      backgroundColor: "#7c3aed",
                      color: "#ffffff",
                      border: "1px solid #6d28d9",
                    }}
                  >
                    {copied ? "Resumo copiado ✅" : "Copiar resumo"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 rounded-2xl bg-white/70 p-1 ring-1 ring-gray-200">
              <TabButton
                active={activeTab === "picks"}
                onClick={() => setActiveTab("picks")}
                label="Picks do grupo"
              />

              <TabButton
                active={activeTab === "games"}
                onClick={() => setActiveTab("games")}
                label="Tendências dos jogos"
              />
            </div>

            {isAdmin && showPreview && (
              <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-bold text-orange-800">
                Modo teste ligado: só tu consegues ver jornadas/fases antes de
                começarem.
              </div>
            )}
          </div>
        </section>

        {activeTab === "picks" && (
          <section className="mt-4">
            {loadingPicks || loadingAuth ? (
              <InfoBox text="A carregar picks do grupo..." />
            ) : pickError ? (
              <ErrorBox text={pickError} />
            ) : !pickDashboard ? (
              <InfoBox text="Ainda não existe dashboard dos picks publicado. Vai a /admin/gerar-dashboard-picks e gera os dados." />
            ) : (
              <>
                <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-xl sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-600">
                        Picks do grupo
                      </p>

                      <h2 className="mt-1 text-2xl font-black text-gray-950 sm:text-3xl">
                        As escolhas mais populares
                      </h2>
                    </div>

                    <div className="rounded-2xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 ring-1 ring-violet-100">
                      {pickDashboard.totalTeams} equipas
                    </div>
                  </div>
                </section>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <RankingCard
                    title="Marcadores"
                    emoji="⚽"
                    items={pickDashboard.topScorers || []}
                  />

                  <RankingCard
                    title="Assistentes"
                    emoji="🎯"
                    items={pickDashboard.topAssisters || []}
                  />

                  <RankingCard
                    title="Campeões"
                    emoji="🏆"
                    items={pickDashboard.champions || []}
                  />
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "games" && (
          <>
            <section className="mt-4 rounded-[28px] border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label className="block text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                    Jornada/fase disponível
                  </label>

                  <select
                    value={selectedRoundId}
                    onChange={(e) => {
                      setSelectedRoundId(e.target.value);
                      setOpenGameKey("");
                      setPersonSearch("");
                      setSelectedPersonKey("");
                    }}
                    disabled={visibleRounds.length === 0}
                    className="mt-2 h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  >
                    {visibleRounds.length === 0 ? (
                      <option value="">Ainda não há jornadas disponíveis</option>
                    ) : (
                      visibleRounds.map((round) => (
                        <option key={round.id} value={round.id}>
                          {round.round} · disponível desde{" "}
                          {formatUnlockDate(round.availableAt)}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {selectedRound && (
                  <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-black text-violet-700 ring-1 ring-violet-100">
                    {selectedRound.games?.length || 0} jogos ·{" "}
                    {roundTotalPredictions} apostas
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="inline-flex rounded-2xl bg-gray-100 p-1 ring-1 ring-gray-200">
                  <ViewToggle
                    active={gameTrendView === "byGame"}
                    onClick={() => setGameTrendView("byGame")}
                    label="Por jogo"
                  />

                  <ViewToggle
                    active={gameTrendView === "byPerson"}
                    onClick={() => {
                      setGameTrendView("byPerson");
                      setSelectedPersonKey("");
                    }}
                    label="Por pessoa"
                  />
                </div>

                {gameTrendView === "byPerson" && (
                  <input
                    value={personSearch}
                    onChange={(e) => {
                      setPersonSearch(e.target.value);
                      setSelectedPersonKey("");
                    }}
                    placeholder="Pesquisar por pessoa ou equipa..."
                    className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 lg:max-w-md"
                  />
                )}
              </div>

              {loadingTrends || loadingAuth ? (
                <InfoBox text="A carregar tendências dos jogos..." />
              ) : loadError ? (
                <ErrorBox text={loadError} />
              ) : roundDocs.length === 0 ? (
                <InfoBox text="Ainda não existem tendências publicadas. Vai a /admin/gerar-tendencias e gera os dados." />
              ) : visibleRounds.length === 0 && nextRound ? (
                <InfoBox
                  text={`Ainda não há tendências disponíveis. A primeira a desbloquear é ${nextRound.round}, em ${formatUnlockDate(
                    nextRound.availableAt
                  )}.`}
                />
              ) : null}
            </section>

            {selectedRound && (
              <section className="mt-4">
                {selectedGames.length === 0 ? (
                  <InfoBox text="Ainda não há dados para esta jornada/fase." />
                ) : gameTrendView === "byGame" ? (
                  <div className="grid gap-4">
                    {selectedGames.map((game) => {
                      const gameKey = `${selectedRound.id}-${game.gameId}`;
                      const isOpen = openGameKey === gameKey;

                      return (
                        <TrendGameCard
                          key={gameKey}
                          game={game}
                          isOpen={isOpen}
                          onToggle={() =>
                            setOpenGameKey(isOpen ? "" : gameKey)
                          }
                        />
                      );
                    })}
                  </div>
                ) : (
                  <PersonTrendsView
                    people={filteredPersonTrends}
                    totalPeople={personTrends.length}
                    selectedPersonKey={selectedPersonKey}
                    onSelectPerson={setSelectedPersonKey}
                  />
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function TrendGameCard({
  game,
  isOpen,
  onToggle,
}: {
  game: TrendGame;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const homeFlag = getFlagByCountry(game.homeTeam);
  const awayFlag = getFlagByCountry(game.awayTeam);
  const favorite = getFavorite(game);

  const homePct = safePct(game.homePct);
  const drawPct = safePct(game.drawPct);
  const awayPct = safePct(game.awayPct);

  const homeVoters = getVotersList(game.homeVoters);
  const drawVoters = getVotersList(game.drawVoters);
  const awayVoters = getVotersList(game.awayVoters);

  const hasAnyVoters =
    homeVoters.length > 0 || drawVoters.length > 0 || awayVoters.length > 0;

  return (
    <article
      className="overflow-hidden rounded-[26px] border bg-white shadow-xl transition"
      style={{
        borderColor: isOpen ? "#c4b5fd" : "#e5e7eb",
        boxShadow: isOpen
          ? "0 16px 34px rgba(124, 58, 237, 0.16)"
          : "0 10px 26px rgba(17, 24, 39, 0.07)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 text-left sm:p-5"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
              Jogo #{game.gameId}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xl font-black text-gray-950 sm:text-2xl">
              <TeamName flag={homeFlag} name={game.homeTeam} />
              <span className="text-base font-black text-gray-300">vs</span>
              <TeamName flag={awayFlag} name={game.awayTeam} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-gray-50 px-3 py-1.5 text-xs font-black text-gray-600 ring-1 ring-gray-200">
              {game.totalPredictions} apostas
            </span>

            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 ring-1 ring-violet-100">
              {isOpen ? "Fechar" : "Ver listas"}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
              Tendência do resultado
            </p>

            <p className="text-xs font-black text-gray-900">
              Favorito: <span className="text-violet-700">{favorite.label}</span>
            </p>
          </div>

          <SegmentedBar
            homePct={homePct}
            drawPct={drawPct}
            awayPct={awayPct}
          />

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <OutcomePill
              label={`Vitória ${game.homeTeam}`}
              count={game.homeWins}
              pct={game.homePct}
              color="#2563eb"
              flag={homeFlag}
            />
            <OutcomePill
              label="Empate"
              count={game.draws}
              pct={game.drawPct}
              color="#64748b"
            />
            <OutcomePill
              label={`Vitória ${game.awayTeam}`}
              count={game.awayWins}
              pct={game.awayPct}
              color="#7c3aed"
              flag={awayFlag}
            />
          </div>
        </div>

        {game.topResults && game.topResults.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {game.topResults.slice(0, 3).map((result, index) => (
              <span
                key={`${game.gameId}-${result.score}`}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-gray-800 ring-1 ring-gray-200"
              >
                <span className="text-violet-600">#{index + 1}</span>
                <span>{result.score}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">{result.count}x</span>
              </span>
            ))}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 bg-[#fbfbff] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
                Lista do jogo
              </p>
              <h3 className="text-lg font-black text-gray-950">
                Pessoas por tendência
              </h3>
            </div>

            <p className="text-xs font-bold text-gray-500">
              O badge à direita é o resultado apostado.
            </p>
          </div>

          {!hasAnyVoters ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
              A lista de pessoas ainda não está publicada nos agregados. Vai a{" "}
              <span className="font-black">/admin/gerar-tendencias</span> e
              volta a gerar as tendências.
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-3">
              <VoterGroup
                title={`Vitória ${game.homeTeam}`}
                count={game.homeWins}
                voters={homeVoters}
                accent="#2563eb"
              />

              <VoterGroup
                title="Empate"
                count={game.draws}
                voters={drawVoters}
                accent="#64748b"
              />

              <VoterGroup
                title={`Vitória ${game.awayTeam}`}
                count={game.awayWins}
                voters={awayVoters}
                accent="#7c3aed"
              />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function PersonTrendsView({
  people,
  totalPeople,
  selectedPersonKey,
  onSelectPerson,
}: {
  people: PersonTrendRow[];
  totalPeople: number;
  selectedPersonKey: string;
  onSelectPerson: (key: string) => void;
}) {
  const selectedPerson =
    people.find((person) => person.key === selectedPersonKey) ?? null;

  if (totalPeople === 0) {
    return (
      <InfoBox text="Ainda não há listas por pessoa publicadas nos agregados. Vai a /admin/gerar-tendencias e volta a gerar as tendências." />
    );
  }

  if (people.length === 0) {
    return <InfoBox text="Não foram encontradas pessoas com esse filtro." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[26px] border border-gray-200 bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
              Equipas
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              Escolhe uma equipa
            </h2>
          </div>

          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
            {people.length}/{totalPeople}
          </span>
        </div>

        <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {people.map((person) => {
            const isSelected = selectedPersonKey === person.key;

            return (
              <button
                key={person.key}
                type="button"
                onClick={() => onSelectPerson(person.key)}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                  isSelected
                    ? "border-violet-300 bg-violet-50 ring-2 ring-violet-100"
                    : "border-gray-200 bg-gray-50 hover:border-violet-200 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#2f2140] text-xs font-black text-white">
                    {getInitials(person.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-gray-950">
                      {person.name}
                    </p>
                    {person.managerName && (
                      <p className="truncate text-xs font-bold text-gray-500">
                        {person.managerName}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                    {person.predictions.length}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[26px] border border-gray-200 bg-white p-4 shadow-lg">
        {!selectedPerson ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-600">
              Tendências por pessoa
            </p>
            <h3 className="mt-2 text-2xl font-black text-gray-950">
              Seleciona uma equipa da lista
            </h3>
            <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-gray-500">
              Ao abrir esta aba, não mostramos nenhuma equipa automaticamente.
              Usa a lista ou a pesquisa para escolher quem queres ver.
            </p>
          </div>
        ) : (
          <article>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2f2140] text-sm font-black text-white">
                {getInitials(selectedPerson.name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
                  Apostas da equipa
                </p>
                <h3 className="mt-1 truncate text-xl font-black text-gray-950">
                  {selectedPerson.name}
                </h3>
                {selectedPerson.managerName && (
                  <p className="truncate text-sm font-bold text-gray-500">
                    {selectedPerson.managerName}
                  </p>
                )}
              </div>

              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                {selectedPerson.predictions.length} apostas
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {selectedPerson.predictions.map((prediction, index) => {
                const meta = getOutcomeMeta(prediction.outcomeType);

                return (
                  <div
                    key={`${selectedPerson.key}-${prediction.gameId}-${index}`}
                    className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-xs font-black text-gray-900">
                        {prediction.homeTeam} vs {prediction.awayTeam}
                      </p>

                      <ScoreBadge score={prediction.predictedScore} />
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: meta.dot }}
                      />
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-black"
                        style={{ backgroundColor: meta.bg, color: meta.text }}
                      >
                        {prediction.outcomeLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        )}
      </section>
    </div>
  );
}

function TeamName({ flag, name }: { flag?: string; name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {flag ? (
        <img
          src={flag}
          alt={name}
          className="h-5 w-8 rounded object-cover shadow-sm"
        />
      ) : (
        <span className="h-5 w-8 rounded bg-gray-200" />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}

function SegmentedBar({
  homePct,
  drawPct,
  awayPct,
}: {
  homePct: number;
  drawPct: number;
  awayPct: number;
}) {
  const empty = homePct + drawPct + awayPct <= 0;

  if (empty) {
    return <div className="h-3 rounded-full bg-gray-200" />;
  }

  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-gray-200 ring-1 ring-gray-200">
      <div
        className="h-full"
        style={{
          width: `${homePct}%`,
          background: "linear-gradient(90deg, #38bdf8 0%, #2563eb 100%)",
        }}
      />
      <div
        className="h-full"
        style={{
          width: `${drawPct}%`,
          backgroundColor: "#94a3b8",
        }}
      />
      <div
        className="h-full"
        style={{
          width: `${awayPct}%`,
          background: "linear-gradient(90deg, #a78bfa 0%, #7c3aed 100%)",
        }}
      />
    </div>
  );
}

function OutcomePill({
  label,
  count,
  pct,
  color,
  flag,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
  flag?: string;
}) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-gray-200">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {flag && (
          <img src={flag} alt={label} className="h-4 w-6 rounded object-cover" />
        )}
        <p className="min-w-0 truncate text-xs font-black text-gray-700">
          {label}
        </p>
      </div>

      <p className="mt-1 text-sm font-black text-gray-950">
        {count}{" "}
        <span className="text-xs font-bold text-gray-400">({pct}%)</span>
      </p>
    </div>
  );
}

function VoterGroup({
  title,
  count,
  voters,
  accent,
}: {
  title: string;
  count: number;
  voters: PublicVoter[];
  accent: string;
}) {
  const sortedVoters = sortVotersByPredictedScore(voters);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-gray-950">{title}</p>
          <p className="text-xs font-bold text-gray-400">{count} aposta(s)</p>
        </div>

        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white"
          style={{ backgroundColor: accent }}
        >
          {count}
        </div>
      </div>

      {sortedVoters.length === 0 ? (
        <p className="rounded-xl bg-gray-50 p-3 text-xs font-bold text-gray-400">
          Sem apostas nesta opção.
        </p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {sortedVoters.map((voter, index) => {
            const name = getVoterName(voter);
            const managerName = getVoterManager(voter);
            const score = getVoterScore(voter);

            return (
              <div
                key={`${title}-${name}-${index}`}
                className="flex items-center gap-2 rounded-xl bg-gray-50 p-2 ring-1 ring-gray-100"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                  style={{ backgroundColor: accent }}
                >
                  {getInitials(name)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-gray-900">
                    {name}
                  </p>
                  {managerName && (
                    <p className="truncate text-[10px] font-bold text-gray-400">
                      {managerName}
                    </p>
                  )}
                </div>

                <ScoreBadge score={score} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ScoreBadge({ score }: { score?: string }) {
  return (
    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-gray-900 ring-1 ring-gray-200">
      {score || "—"}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 flex-1 items-center justify-center rounded-xl px-4 text-sm font-black sm:flex-none"
      style={{
        backgroundColor: active ? "#2f2140" : "transparent",
        color: active ? "#ffffff" : "#374151",
      }}
    >
      {label}
    </button>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 flex-1 items-center justify-center rounded-xl px-4 text-sm font-black transition sm:flex-none"
      style={{
        backgroundColor: active ? "#2f2140" : "transparent",
        color: active ? "#ffffff" : "#374151",
      }}
    >
      {label}
    </button>
  );
}

function RankingCard({
  title,
  emoji,
  items,
}: {
  title: string;
  emoji: string;
  items: CountItem[];
}) {
  const visibleItems = (items || []).slice(0, 15);

  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-xl">
          {emoji}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
            Ranking
          </p>

          <h2 className="text-lg font-black text-gray-950">{title}</h2>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <p className="text-sm font-semibold text-gray-500">
          Ainda não existem dados.
        </p>
      ) : (
        <div className="space-y-2">
          {visibleItems.map((item, index) => (
            <div
              key={`${item.name}-${item.team || ""}`}
              className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-violet-600">
                    #{index + 1}
                  </p>

                  <h3 className="mt-0.5 truncate text-sm font-black text-gray-950">
                    {item.name}
                  </h3>

                  {item.team && (
                    <p className="mt-0.5 truncate text-xs font-bold text-gray-500">
                      {item.team}
                    </p>
                  )}
                </div>

                <div className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-700">
                  {item.pct}%
                </div>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-violet-600"
                    style={{ width: `${safePct(item.pct)}%` }}
                  />
                </div>

                <p className="min-w-[58px] text-right text-xs font-black text-gray-600">
                  {item.count}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function InfoBox({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 text-sm font-bold text-gray-600 shadow-sm">
      {text}
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
      {text}
    </div>
  );
}
