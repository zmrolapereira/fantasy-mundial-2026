"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import SiteHeader from "@/components/SiteHeader";
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
    <main
      className="min-h-screen"
      style={{ backgroundColor: "#2f2140", color: "#111827" }}
    >
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 md:px-5 md:py-6">
        <section
          className="rounded-3xl p-6 shadow-lg"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  color: "#7c3aed",
                }}
              >
                Fantasy Mundial 2026
              </p>

              <h1
                style={{
                  marginTop: 10,
                  marginBottom: 0,
                  fontSize: 40,
                  lineHeight: 1.05,
                  fontWeight: 950,
                  color: "#111827",
                }}
              >
                Tendências
              </h1>

              <p
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  maxWidth: 760,
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "#6b7280",
                }}
              >
                Vê os picks mais escolhidos pelo grupo e as tendências das
                predictions por jogo. Esta página lê apenas dados agregados.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {isAdmin && (
                <button
                  type="button"
                  onClick={refreshAll}
                  disabled={loadingTrends || loadingPicks}
                  className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-bold disabled:opacity-60"
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
                  className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-bold"
                  style={{
                    backgroundColor: showPreview ? "#fee2e2" : "#f3f4f6",
                    color: showPreview ? "#991b1b" : "#374151",
                    border: showPreview
                      ? "1px solid #fca5a5"
                      : "1px solid #d1d5db",
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
                  className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
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

          <div className="mt-6 flex flex-wrap gap-2">
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
            <div
              className="mt-4 rounded-2xl p-4 text-sm font-semibold"
              style={{
                backgroundColor: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#9a3412",
              }}
            >
              Modo teste ligado: só tu consegues ver jornadas/fases antes de
              começarem.
            </div>
          )}
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
                <section
                  className="rounded-3xl p-6 shadow-xl"
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      color: "#7c3aed",
                    }}
                  >
                    Picks do grupo
                  </p>

                  <h2
                    style={{
                      marginTop: 8,
                      marginBottom: 0,
                      fontSize: 34,
                      fontWeight: 950,
                      color: "#111827",
                    }}
                  >
                    As escolhas mais populares 👀
                  </h2>

                  <p
                    style={{
                      marginTop: 8,
                      marginBottom: 0,
                      fontSize: 14,
                      color: "#6b7280",
                      fontWeight: 700,
                    }}
                  >
                    Total de equipas: {pickDashboard.totalTeams}
                  </p>
                </section>

                <div className="mt-4 grid gap-5 lg:grid-cols-3">
                  <RankingCard
                    title="Marcadores escolhidos"
                    emoji="⚽"
                    items={pickDashboard.topScorers}
                  />

                  <RankingCard
                    title="Assistentes escolhidos"
                    emoji="🎯"
                    items={pickDashboard.topAssisters}
                  />

                  <RankingCard
                    title="Campeões escolhidos"
                    emoji="🏆"
                    items={pickDashboard.champions}
                  />
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "games" && (
          <>
            <section
              className="mt-4 rounded-3xl p-5 shadow-sm"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
              }}
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#374151",
                    }}
                  >
                    Jornada/fase disponível
                  </label>

                  <select
                    value={selectedRoundId}
                    onChange={(e) => setSelectedRoundId(e.target.value)}
                    disabled={visibleRounds.length === 0}
                    className="mt-2 h-11 w-full rounded-xl px-3 text-sm font-bold outline-none"
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#111827",
                      border: "1px solid #d1d5db",
                    }}
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
                  <div
                    className="rounded-2xl px-4 py-3 text-sm font-black"
                    style={{
                      backgroundColor: "#ede9fe",
                      color: "#5b21b6",
                    }}
                  >
                    {selectedRound.games?.length || 0} jogos ·{" "}
                    {roundTotalPredictions} predictions únicas
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
            </section>

            {selectedRound && (
              <section
                className="mt-4 overflow-hidden rounded-[32px] shadow-2xl"
                style={{
                  backgroundColor: "#f5f3ff",
                  border: "1px solid rgba(255,255,255,0.22)",
                }}
              >
                <div
                  className="p-5 sm:p-7"
                  style={{
                    background:
                      "linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f5f3ff 100%)",
                  }}
                >
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 950,
                          textTransform: "uppercase",
                          letterSpacing: "0.22em",
                          color: "#7c3aed",
                        }}
                      >
                        Fantasy Mundial 2026
                      </p>

                      <h2
                        style={{
                          marginTop: 8,
                          marginBottom: 0,
                          fontSize: 34,
                          lineHeight: 1.05,
                          fontWeight: 950,
                          color: "#111827",
                        }}
                      >
                        {selectedRound.round}
                      </h2>

                      <p
                        style={{
                          marginTop: 8,
                          marginBottom: 0,
                          fontSize: 14,
                          color: "#6b7280",
                          fontWeight: 700,
                        }}
                      >
                        {selectedRound.games?.length || 0} jogos ·{" "}
                        {roundTotalPredictions} predictions únicas
                        contabilizadas
                      </p>
                    </div>

                    <div
                      className="rounded-2xl px-4 py-3 text-sm font-black"
                      style={{
                        backgroundColor: "#ede9fe",
                        color: "#5b21b6",
                      }}
                    >
                      O grupo apostou assim 👀
                    </div>
                  </div>

                  {selectedGames.length === 0 ? (
                    <InfoBox text="Ainda não há dados para esta jornada/fase." />
                  ) : (
                    <div className="grid gap-4">
                      {selectedGames.map((game) => {
                        const favorite = getFavorite(game);

                        return (
                          <article
                            key={game.gameId}
                            className="rounded-3xl p-5"
                            style={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e5e7eb",
                              boxShadow: "0 12px 30px rgba(17, 24, 39, 0.08)",
                            }}
                          >
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 11,
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.16em",
                                    color: "#7c3aed",
                                  }}
                                >
                                  Jogo #{game.gameId}
                                </p>

                                <h3
                                  style={{
                                    marginTop: 6,
                                    marginBottom: 0,
                                    fontSize: 24,
                                    fontWeight: 950,
                                    color: "#111827",
                                  }}
                                >
                                  {game.homeTeam} vs {game.awayTeam}
                                </h3>
                              </div>

                              <div
                                className="rounded-full px-4 py-2 text-xs font-black"
                                style={{
                                  backgroundColor: "#ede9fe",
                                  color: "#5b21b6",
                                }}
                              >
                                Favorito: {favorite.label} {favorite.pct}%
                              </div>
                            </div>

                            <div className="space-y-3">
                              <TrendBar
                                label={`Vitória ${game.homeTeam}`}
                                percentage={game.homePct}
                                count={game.homeWins}
                                color="#22c55e"
                              />

                              <TrendBar
                                label="Empate"
                                percentage={game.drawPct}
                                count={game.draws}
                                color="#f59e0b"
                              />

                              <TrendBar
                                label={`Vitória ${game.awayTeam}`}
                                percentage={game.awayPct}
                                count={game.awayWins}
                                color="#3b82f6"
                              />
                            </div>

                            <div
                              className="mt-5 rounded-2xl p-4"
                              style={{
                                backgroundColor: "#f8fafc",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 11,
                                  fontWeight: 900,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.16em",
                                  color: "#7c3aed",
                                }}
                              >
                                Top 3 resultados exatos
                              </p>

                              {game.topResults && game.topResults.length > 0 ? (
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                  {game.topResults.map((result, index) => (
                                    <div
                                      key={`${game.gameId}-${result.score}`}
                                      className="rounded-2xl bg-white p-4"
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        boxShadow:
                                          "0 6px 16px rgba(17, 24, 39, 0.06)",
                                      }}
                                    >
                                      <p
                                        style={{
                                          margin: 0,
                                          fontSize: 11,
                                          fontWeight: 900,
                                          color: "#7c3aed",
                                        }}
                                      >
                                        #{index + 1}
                                      </p>

                                      <p
                                        style={{
                                          marginTop: 4,
                                          marginBottom: 0,
                                          fontSize: 28,
                                          fontWeight: 950,
                                          color: "#111827",
                                        }}
                                      >
                                        {result.score}
                                      </p>

                                      <p
                                        style={{
                                          marginTop: 4,
                                          marginBottom: 0,
                                          fontSize: 13,
                                          fontWeight: 800,
                                          color: "#6b7280",
                                        }}
                                      >
                                        {result.count} voto(s) · {result.pct}%
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p
                                  style={{
                                    marginTop: 8,
                                    marginBottom: 0,
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: "#6b7280",
                                  }}
                                >
                                  Ainda não existem resultados suficientes.
                                </p>
                              )}
                            </div>

                            <p
                              style={{
                                marginTop: 14,
                                marginBottom: 0,
                                fontSize: 13,
                                fontWeight: 800,
                                color: "#6b7280",
                              }}
                            >
                              Total: {game.totalPredictions} prediction(s)
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
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
      className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-black"
      style={{
        backgroundColor: active ? "#2f2140" : "#f3f4f6",
        color: active ? "#ffffff" : "#374151",
        border: active ? "1px solid #2f2140" : "1px solid #d1d5db",
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
  const visibleItems = items.slice(0, 15);

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
          {emoji}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
            Ranking
          </p>

          <h2 className="text-xl font-black text-gray-900">{title}</h2>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <p className="text-sm font-semibold text-gray-500">
          Ainda não existem dados.
        </p>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item, index) => (
            <div
              key={`${item.name}-${item.team || ""}`}
              className="rounded-2xl bg-gray-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-violet-600">
                    #{index + 1}
                  </p>

                  <h3 className="mt-1 text-lg font-black text-gray-900">
                    {item.name}
                  </h3>

                  {item.team && (
                    <p className="mt-1 text-sm font-bold text-gray-500">
                      {item.team}
                    </p>
                  )}
                </div>

                <div className="rounded-full bg-violet-100 px-3 py-1 text-sm font-black text-violet-700">
                  {item.pct}%
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-violet-600"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>

                <p className="min-w-[70px] text-right text-sm font-black text-gray-700">
                  {item.count} picks
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
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
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <p
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          {label}
        </p>

        <p
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 950,
            color: "#111827",
          }}
        >
          {percentage}%{" "}
          <span style={{ color: "#6b7280", fontWeight: 800 }}>({count})</span>
        </p>
      </div>

      <div
        className="h-3 overflow-hidden rounded-full"
        style={{ backgroundColor: "#e5e7eb" }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: 9999,
          }}
        />
      </div>
    </div>
  );
}

function InfoBox({ text }: { text: string }) {
  return (
    <div
      className="mt-4 rounded-2xl p-4 text-sm font-semibold"
      style={{
        backgroundColor: "#f8fafc",
        border: "1px solid #e5e7eb",
        color: "#374151",
      }}
    >
      {text}
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div
      className="mt-4 rounded-2xl p-4 text-sm font-semibold"
      style={{
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#991b1b",
      }}
    >
      {text}
    </div>
  );
}