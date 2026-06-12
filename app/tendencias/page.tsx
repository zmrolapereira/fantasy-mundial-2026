"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import SiteHeader from "@/components/SiteHeader";
import { teams } from "@/data/teams";
import { db } from "@/lib/firebase";
import { listenToAuth } from "@/lib/auth";

const ADMIN_EMAIL = "zmrolapereira@gmail.com";

type TopResult = {
  score: string;
  count: number;
  pct: number;
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
  updatedAt?: any;
};

type PageTab = "picks" | "games";

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

function getMostVotedResult(game: TrendGame) {
  return game.topResults?.[0] ?? null;
}

function getFavorite(game: TrendGame) {
  const options = [
    {
      label: game.homeTeam,
      pct: game.homePct,
      count: game.homeWins,
    },
    {
      label: "Empate",
      pct: game.drawPct,
      count: game.draws,
    },
    {
      label: game.awayTeam,
      pct: game.awayPct,
      count: game.awayWins,
    },
  ];

  return options.sort((a, b) => {
    if (b.pct !== a.pct) return b.pct - a.pct;
    return b.count - a.count;
  })[0];
}

export default function TendenciasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState<PageTab>("picks");

  const [loadingTrends, setLoadingTrends] = useState(true);
  const [roundDocs, setRoundDocs] = useState<TrendRoundDoc[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [loadingPicks, setLoadingPicks] = useState(true);
  const [pickDashboard, setPickDashboard] = useState<PickDashboard | null>(null);
  const [pickError, setPickError] = useState("");

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
          "Erro ao carregar tendências. Verifica se a collection publicPredictionTrends existe."
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

        return `⚽ ${game.homeTeam} vs ${game.awayTeam}
${game.homeTeam}: ${game.homePct}% (${game.homeWins}) | Empate: ${game.drawPct}% (${game.draws}) | ${game.awayTeam}: ${game.awayPct}% (${game.awayWins})
Favorito: ${favorite.label} ${favorite.pct}%
Top 3 resultados: ${topResultsText}`;
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
    <main className="min-h-screen bg-[#f4f6fb] text-gray-900">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[34px] bg-slate-950 shadow-xl">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.48),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.40),_transparent_32%),linear-gradient(135deg,_#111827_0%,_#312e81_52%,_#581c87_100%)]" />

            <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-violet-200">
                  Fantasy Mundial 2026
                </p>

                <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Tendências do grupo
                </h1>

                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-200 sm:text-base">
                  Vê as escolhas mais populares e como o grupo está a apostar em
                  cada jogo. Tudo aparece de forma agregada, sem mostrar picks
                  individuais.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/15 bg-white/10 p-3 backdrop-blur-md">
                <div className="rounded-2xl bg-white/10 p-3 text-white">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/60">
                    Equipas
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {pickDashboard?.totalTeams ?? "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-white">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/60">
                    Etapas
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {visibleRounds.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-white">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/60">
                    Jogos
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {selectedGames.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[28px] border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-2 sm:grid-cols-2">
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

            <div className="flex flex-col gap-2 sm:flex-row">
              {activeTab === "games" && (
                <button
                  type="button"
                  onClick={copySummary}
                  disabled={!selectedRound || selectedGames.length === 0}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-violet-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {copied ? "Resumo copiado ✅" : "Copiar resumo"}
                </button>
              )}

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={refreshAll}
                    disabled={loadingTrends || loadingPicks}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {loadingTrends || loadingPicks
                      ? "A atualizar..."
                      : "Atualizar dados"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPreview((value) => !value)}
                    className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-black transition ${
                      showPreview
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {showPreview ? "Desligar teste" : "Ver antes das datas"}
                  </button>
                </>
              )}
            </div>
          </div>

          {isAdmin && showPreview && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              Modo teste ligado: só tu consegues ver jornadas/fases antes de
              começarem.
            </div>
          )}
        </section>

        {activeTab === "picks" && (
          <section className="mt-5">
            {loadingPicks || loadingAuth ? (
              <InfoBox text="A carregar picks do grupo..." />
            ) : pickError ? (
              <ErrorBox text={pickError} />
            ) : !pickDashboard ? (
              <InfoBox text="Ainda não existe dashboard dos picks publicado. Vai a /admin/gerar-dashboard-picks e gera os dados." />
            ) : (
              <>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-600">
                      Picks do grupo
                    </p>

                    <h2 className="mt-1 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                      As escolhas mais populares
                    </h2>

                    <p className="mt-2 text-sm font-semibold text-gray-500">
                      Total de equipas: {pickDashboard.totalTeams}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700">
                    Dados agregados
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <RankingCard
                    title="Marcadores escolhidos"
                    emoji="⚽"
                    items={pickDashboard.topScorers}
                    tone="amber"
                  />

                  <RankingCard
                    title="Assistentes escolhidos"
                    emoji="🎯"
                    items={pickDashboard.topAssisters}
                    tone="blue"
                  />

                  <RankingCard
                    title="Campeões escolhidos"
                    emoji="🏆"
                    items={pickDashboard.champions}
                    tone="violet"
                  />
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "games" && (
          <section className="mt-5">
            <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">
                    Jornada/fase disponível
                  </label>

                  <select
                    value={selectedRoundId}
                    onChange={(e) => setSelectedRoundId(e.target.value)}
                    disabled={visibleRounds.length === 0}
                    className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-950 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
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
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700">
                    {selectedRound.games?.length || 0} jogos ·{" "}
                    {roundTotalPredictions} predictions
                  </div>
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
            </div>

            {selectedRound && (
              <div className="mt-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-600">
                      Tendências dos jogos
                    </p>

                    <h2 className="mt-1 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                      {selectedRound.round}
                    </h2>

                    <p className="mt-2 text-sm font-semibold text-gray-500">
                      {selectedRound.games?.length || 0} jogos ·{" "}
                      {roundTotalPredictions} predictions contabilizadas
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 shadow-sm">
                    Percentagens do grupo
                  </div>
                </div>

                {selectedGames.length === 0 ? (
                  <InfoBox text="Ainda não há dados para esta jornada/fase." />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {selectedGames.map((game) => (
                      <GameTrendCard key={game.gameId} game={game} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
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
      className={`inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-black transition ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "bg-gray-50 text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}

function RankingCard({
  title,
  emoji,
  items,
  tone,
}: {
  title: string;
  emoji: string;
  items: CountItem[];
  tone: "amber" | "blue" | "violet";
}) {
  const visibleItems = items.slice(0, 15);

  const toneClasses = {
    amber: {
      badge: "bg-amber-100 text-amber-700",
      bar: "#f59e0b",
      soft: "from-amber-50 to-white",
    },
    blue: {
      badge: "bg-blue-100 text-blue-700",
      bar: "#3b82f6",
      soft: "from-blue-50 to-white",
    },
    violet: {
      badge: "bg-violet-100 text-violet-700",
      bar: "#7c3aed",
      soft: "from-violet-50 to-white",
    },
  }[tone];

  return (
    <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
      <div className={`bg-gradient-to-br ${toneClasses.soft} border-b border-gray-100 p-5`}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-gray-100">
            {emoji}
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
              Ranking
            </p>

            <h2 className="text-xl font-black text-gray-950">{title}</h2>
          </div>
        </div>
      </div>

      <div className="p-4">
        {visibleItems.length === 0 ? (
          <p className="rounded-2xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">
            Ainda não existem dados.
          </p>
        ) : (
          <div className="space-y-2.5">
            {visibleItems.map((item, index) => (
              <div
                key={`${item.name}-${item.team || ""}`}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-3"
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

                  <div
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${toneClasses.badge}`}
                  >
                    {item.pct}%
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, item.pct))}%`,
                        backgroundColor: toneClasses.bar,
                      }}
                    />
                  </div>

                  <p className="min-w-[62px] text-right text-xs font-black text-gray-600">
                    {item.count} picks
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TrendBar({
  label,
  percentage,
  count,
  color,
}: {
  label: string;
  percentage: number;
  count: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="truncate text-sm font-black text-gray-950">{label}</p>

        <div className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-gray-600 ring-1 ring-gray-200">
          {count} votos
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(100, percentage))}%`,
              backgroundColor: color,
            }}
          />
        </div>

        <p className="w-12 text-right text-sm font-black text-gray-950">
          {percentage}%
        </p>
      </div>
    </div>
  );
}

function GameTrendCard({ game }: { game: TrendGame }) {
  const favorite = getFavorite(game);
  const homeFlag = getFlagByCountry(game.homeTeam);
  const awayFlag = getFlagByCountry(game.awayTeam);

  const homePct = safePct(game.homePct);
  const drawPct = safePct(game.drawPct);
  const awayPct = safePct(game.awayPct);

  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative overflow-hidden bg-slate-950 p-4 text-white sm:p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(103,199,232,0.32),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(139,44,245,0.30),_transparent_34%),linear-gradient(135deg,_#0f172a_0%,_#1e1b4b_55%,_#312e81_100%)]" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/90">
                Jogo #{game.gameId}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
                <TeamTitle flag={homeFlag} name={game.homeTeam} />
                <span className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                  vs
                </span>
                <TeamTitle flag={awayFlag} name={game.awayTeam} />
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-right backdrop-blur-md">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/55">
                Apostas
              </p>
              <p className="text-xl font-black text-white">
                {game.totalPredictions}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-1 shadow-inner">
            <div className="flex h-10 overflow-hidden rounded-[14px] bg-slate-800">
              <div
                className="flex min-w-[28px] items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-500 text-xs font-black text-white"
                style={{ width: `${homePct}%` }}
              >
                {homePct >= 18 ? `${homePct}%` : ""}
              </div>

              <div
                className="flex min-w-[24px] items-center justify-center bg-slate-400/80 text-xs font-black text-white"
                style={{ width: `${drawPct}%` }}
              >
                {drawPct >= 18 ? `${drawPct}%` : ""}
              </div>

              <div
                className="flex min-w-[24px] items-center justify-center bg-gradient-to-r from-violet-500 to-fuchsia-500 text-xs font-black text-white"
                style={{ width: `${awayPct}%` }}
              >
                {awayPct >= 18 ? `${awayPct}%` : ""}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <OutcomePill
              dot="bg-cyan-400"
              flag={homeFlag}
              label={game.homeTeam}
              count={game.homeWins}
              pct={game.homePct}
            />

            <OutcomePill
              dot="bg-slate-300"
              label="Empate"
              count={game.draws}
              pct={game.drawPct}
            />

            <OutcomePill
              dot="bg-violet-400"
              flag={awayFlag}
              label={game.awayTeam}
              count={game.awayWins}
              pct={game.awayPct}
            />
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
                Top 3 resultados exatos
              </p>
              <h4 className="truncate text-base font-black text-slate-950 sm:text-lg">
                Mais escolhidos pelos participantes
              </h4>
            </div>

            <span className="hidden shrink-0 rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-100 sm:inline-flex">
              {favorite.label} lidera
            </span>
          </div>

          {game.topResults && game.topResults.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {game.topResults.slice(0, 3).map((result, index) => (
                <TopResultCard
                  key={`${game.gameId}-${result.score}`}
                  index={index}
                  result={result}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
              Ainda não existem resultados suficientes.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function TeamTitle({ flag, name }: { flag?: string; name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {flag ? (
        <img
          src={flag}
          alt={name}
          className="h-6 w-9 rounded-md object-cover shadow-sm ring-1 ring-white/20"
        />
      ) : (
        <span className="h-6 w-9 rounded-md bg-white/15 ring-1 ring-white/20" />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}

function OutcomePill({
  dot,
  flag,
  label,
  count,
  pct,
}: {
  dot: string;
  flag?: string;
  label: string;
  count: number;
  pct: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-2.5 py-2 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
        {flag && (
          <img src={flag} alt={label} className="h-4 w-6 rounded object-cover" />
        )}
        <p className="min-w-0 truncate text-xs font-black text-white">
          {label}
        </p>
      </div>
      <p className="mt-1 text-xs font-black text-white/75">
        {count} voto(s) · {pct}%
      </p>
    </div>
  );
}

function TopResultCard({ index, result }: { index: number; result: TopResult }) {
  const styles = [
    "border-yellow-200 bg-yellow-50 text-yellow-700",
    "border-slate-200 bg-slate-50 text-slate-700",
    "border-orange-200 bg-orange-50 text-orange-700",
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
            styles[index] || styles[1]
          }`}
        >
          #{index + 1}
        </span>

        <span className="text-[10px] font-black text-slate-500">
          {result.pct}%
        </span>
      </div>

      <p className="mt-1.5 text-xl font-black tracking-tight text-slate-950">
        {result.score}
      </p>

      <p className="mt-0.5 text-[11px] font-bold text-slate-500">
        {result.count} aposta(s)
      </p>
    </div>
  );
}

function InfoBox({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-600 shadow-sm">
      {text}
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
      {text}
    </div>
  );
}
