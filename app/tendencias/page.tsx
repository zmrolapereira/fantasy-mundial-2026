"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { games } from "@/data/games";
import { db } from "@/lib/firebase";
import { listenToAuth } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";

const ADMIN_EMAIL = "zmrolapereira@gmail.com";

type PredictionDoc = {
  gameId?: string | number;
  userId?: string;
  predictedHomeScore?: string | number;
  predictedAwayScore?: string | number;
};

type RoundMeta = {
  label: string;
  firstDate: string;
  firstTime: string;
  startsAt: Date;
  firstGameId: number;
  totalGames: number;
};

type TopResult = {
  label: string;
  shortLabel: string;
  count: number;
  pct: number;
};

type TrendGame = {
  round: string;
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
  favoriteLabel: string;
  favoritePct: number;
  topResults: TopResult[];
};

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

  if (normalizedPhase.includes("3º lugar")) return "3º lugar";
  if (normalizedPhase === "final" || normalizedRound === "final") return "Final";

  if (phase) return phase;
  if (round) return round;

  return "Sem fase";
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

function getPortugalDate(game: any) {
  const date = String(game.date || "");
  const time = String(game.time || "00:00");

  // Os horários do teu games.ts estão em Portugal.
  // Em junho/julho Portugal está em WEST (+01:00).
  return new Date(`${date}T${time}:00+01:00`);
}

function formatUnlockDate(value: Date) {
  return value.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoundMetas(): RoundMeta[] {
  const map = new Map<string, RoundMeta>();

  games.forEach((game: any) => {
    const label = getRoundLabel(game);
    const startsAt = getPortugalDate(game);
    const firstGameId = Number(game.id);

    const existing = map.get(label);

    if (!existing) {
      map.set(label, {
        label,
        firstDate: game.date,
        firstTime: game.time,
        startsAt,
        firstGameId,
        totalGames: 1,
      });
      return;
    }

    existing.totalGames += 1;

    if (startsAt.getTime() < existing.startsAt.getTime()) {
      existing.startsAt = startsAt;
      existing.firstDate = game.date;
      existing.firstTime = game.time;
      existing.firstGameId = firstGameId;
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const timeDiff = a.startsAt.getTime() - b.startsAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.firstGameId - b.firstGameId;
  });
}

function getFavorite(item: {
  homeTeam: string;
  awayTeam: string;
  homePct: number;
  drawPct: number;
  awayPct: number;
}) {
  const options = [
    { label: item.homeTeam, pct: item.homePct },
    { label: "Empate", pct: item.drawPct },
    { label: item.awayTeam, pct: item.awayPct },
  ].sort((a, b) => b.pct - a.pct);

  return options[0];
}

async function getPredictionTrendsByGame(): Promise<TrendGame[]> {
  const teamsSnapshot = await getDocs(collection(db, "fantasyEntries"));
  const predictionsSnapshot = await getDocs(collection(db, "predictions"));

  const registeredTeamUserIds = new Set<string>();

  teamsSnapshot.forEach((doc) => {
    const data = doc.data() as { userId?: string };
    registeredTeamUserIds.add(String(data.userId || doc.id));
  });

  const trendsMap = new Map<
    string,
    {
      homeWins: number;
      draws: number;
      awayWins: number;
      totalPredictions: number;
      countedUsers: Set<string>;
      exactResults: Map<string, number>;
    }
  >();

  predictionsSnapshot.forEach((doc) => {
    const data = doc.data() as PredictionDoc;

    if (!hasValidPrediction(data)) return;

    const userId = String(data.userId);
    const gameId = String(data.gameId);

    // Só conta pessoas que têm equipa criada.
    if (!registeredTeamUserIds.has(userId)) return;

    if (!trendsMap.has(gameId)) {
      trendsMap.set(gameId, {
        homeWins: 0,
        draws: 0,
        awayWins: 0,
        totalPredictions: 0,
        countedUsers: new Set<string>(),
        exactResults: new Map<string, number>(),
      });
    }

    const current = trendsMap.get(gameId);
    if (!current) return;

    // Evita contar o mesmo user mais do que uma vez no mesmo jogo.
    if (current.countedUsers.has(userId)) return;
    current.countedUsers.add(userId);

    const predictedHome = Number(data.predictedHomeScore);
    const predictedAway = Number(data.predictedAwayScore);

    if (!Number.isFinite(predictedHome) || !Number.isFinite(predictedAway)) return;

    current.totalPredictions += 1;

    const resultKey = `${predictedHome}-${predictedAway}`;
    current.exactResults.set(resultKey, (current.exactResults.get(resultKey) ?? 0) + 1);

    if (predictedHome > predictedAway) {
      current.homeWins += 1;
    } else if (predictedHome < predictedAway) {
      current.awayWins += 1;
    } else {
      current.draws += 1;
    }
  });

  return games.map((game: any) => {
    const gameId = String(game.id);
    const trend = trendsMap.get(gameId) ?? {
      homeWins: 0,
      draws: 0,
      awayWins: 0,
      totalPredictions: 0,
      countedUsers: new Set<string>(),
      exactResults: new Map<string, number>(),
    };

    const total = trend.totalPredictions;

    const base = {
      round: getRoundLabel(game),
      gameId,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      totalPredictions: total,
      homeWins: trend.homeWins,
      draws: trend.draws,
      awayWins: trend.awayWins,
      homePct: total > 0 ? Math.round((trend.homeWins / total) * 100) : 0,
      drawPct: total > 0 ? Math.round((trend.draws / total) * 100) : 0,
      awayPct: total > 0 ? Math.round((trend.awayWins / total) * 100) : 0,
    };

    const favorite = getFavorite(base);

    const topResults = Array.from(trend.exactResults.entries())
      .map(([shortLabel, count]) => ({
        shortLabel,
        label: `${game.homeTeam} ${shortLabel} ${game.awayTeam}`,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.shortLabel.localeCompare(b.shortLabel);
      })
      .slice(0, 3);

    return {
      ...base,
      favoriteLabel: favorite.label,
      favoritePct: favorite.pct,
      topResults,
    };
  });
}

export default function TendenciasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [predictionTrends, setPredictionTrends] = useState<TrendGame[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [selectedRound, setSelectedRound] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const unsubscribe = listenToAuth(setUser);
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const roundMetas = useMemo(() => getRoundMetas(), []);
  const now = Date.now();

  const unlockedRounds = useMemo(() => {
    return roundMetas.filter((round) => now >= round.startsAt.getTime());
  }, [roundMetas, now]);

  const canPreview = isAdmin && showPreview;
  const visibleRounds = canPreview ? roundMetas : unlockedRounds;

  const nextRound = useMemo(() => {
    return roundMetas.find((round) => now < round.startsAt.getTime()) ?? null;
  }, [roundMetas, now]);

  useEffect(() => {
    if (visibleRounds.length === 0) {
      setSelectedRound("");
      return;
    }

    const stillVisible = visibleRounds.some((round) => round.label === selectedRound);

    if (!selectedRound || !stillVisible) {
      setSelectedRound(visibleRounds[0].label);
    }
  }, [visibleRounds, selectedRound]);

  const loadTrends = async () => {
    try {
      setLoadingTrends(true);
      setLoadError("");
      const data = await getPredictionTrendsByGame();
      setPredictionTrends(data);
    } catch (error: any) {
      console.error(error);
      setLoadError(
        error?.message ||
          "Erro ao carregar tendências. Verifica as permissões de leitura da Firebase."
      );
    } finally {
      setLoadingTrends(false);
    }
  };

  useEffect(() => {
    loadTrends();
  }, []);

  const selectedRoundMeta = useMemo(() => {
    return roundMetas.find((round) => round.label === selectedRound) ?? null;
  }, [roundMetas, selectedRound]);

  const filteredGames = useMemo(() => {
    return predictionTrends
      .filter((item) => item.round === selectedRound)
      .sort((a, b) => Number(a.gameId) - Number(b.gameId));
  }, [predictionTrends, selectedRound]);

  const roundTotalPredictions = filteredGames.reduce(
    (sum, item) => sum + item.totalPredictions,
    0
  );

  const copySummary = async () => {
    if (!selectedRound || filteredGames.length === 0) return;

    const lines = [
      `📊 Tendências das predictions — ${selectedRound}`,
      "",
      ...filteredGames.map((item) => {
        const topResultsText =
          item.topResults.length > 0
            ? ` | Top resultados: ${item.topResults
                .map((result, index) => `${index + 1}) ${result.shortLabel} (${result.pct}%)`)
                .join(", ")}`
            : "";

        return `• ${item.homeTeam} vs ${item.awayTeam}: ${item.homeTeam} ${item.homePct}% | Empate ${item.drawPct}% | ${item.awayTeam} ${item.awayPct}% (${item.totalPredictions} apostas)${topResultsText}`;
      }),
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
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
                Tendências das predictions
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
                O grupo apostou assim 👀
              </h1>

              <p
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  maxWidth: 720,
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "#6b7280",
                }}
              >
                Aqui aparecem as percentagens das predictions por jogo. Cada
                jornada ou fase só fica disponível quando começar o primeiro jogo
                dessa etapa.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={loadTrends}
                disabled={loadingTrends}
                className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-bold disabled:opacity-60"
                style={{
                  backgroundColor: "#2f2140",
                  color: "#ffffff",
                  border: "1px solid #2f2140",
                }}
              >
                {loadingTrends ? "A atualizar..." : "Atualizar dados"}
              </button>
            </div>
          </div>
        </section>

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
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
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
                    <option key={round.label} value={round.label}>
                      {round.label} · disponível desde{" "}
                      {formatUnlockDate(round.startsAt)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={copySummary}
                disabled={!selectedRound || filteredGames.length === 0}
                className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor: "#7c3aed",
                  color: "#ffffff",
                  border: "1px solid #6d28d9",
                }}
              >
                {copied ? "Resumo copiado ✅" : "Copiar resumo"}
              </button>

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
            </div>
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

          {!canPreview && visibleRounds.length === 0 && nextRound && (
            <div
              className="mt-4 rounded-2xl p-4 text-sm font-semibold"
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e5e7eb",
                color: "#374151",
              }}
            >
              Ainda não há tendências disponíveis. A primeira a desbloquear é{" "}
              <strong>{nextRound.label}</strong>, em{" "}
              <strong>{formatUnlockDate(nextRound.startsAt)}</strong>.
            </div>
          )}

          {loadError && (
            <div
              className="mt-4 rounded-2xl p-4 text-sm font-semibold"
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
              }}
            >
              {loadError}
            </div>
          )}
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
                    {selectedRound}
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
                    {selectedRoundMeta?.totalGames ?? filteredGames.length} jogos ·{" "}
                    {roundTotalPredictions} predictions únicas contabilizadas
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

              {loadingTrends ? (
                <div className="rounded-2xl bg-white p-5 text-sm font-semibold text-gray-600">
                  A carregar tendências...
                </div>
              ) : filteredGames.length === 0 ? (
                <div className="rounded-2xl bg-white p-5 text-sm font-semibold text-gray-600">
                  Ainda não há dados para esta jornada/fase.
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredGames.map((item) => (
                    <article
                      key={item.gameId}
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
                            Jogo #{item.gameId}
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
                            {item.homeTeam} vs {item.awayTeam}
                          </h3>
                        </div>

                        <div
                          className="rounded-full px-4 py-2 text-xs font-black"
                          style={{
                            backgroundColor: "#ede9fe",
                            color: "#5b21b6",
                          }}
                        >
                          Favorito: {item.favoriteLabel} {item.favoritePct}%
                        </div>
                      </div>

                      <div className="space-y-3">
                        <TrendBar
                          label={item.homeTeam}
                          percentage={item.homePct}
                          count={item.homeWins}
                          color="#22c55e"
                        />

                        <TrendBar
                          label="Empate"
                          percentage={item.drawPct}
                          count={item.draws}
                          color="#f59e0b"
                        />

                        <TrendBar
                          label={item.awayTeam}
                          percentage={item.awayPct}
                          count={item.awayWins}
                          color="#3b82f6"
                        />
                      </div>

                      <TopResults results={item.topResults} />

                      <p
                        style={{
                          marginTop: 14,
                          marginBottom: 0,
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#6b7280",
                        }}
                      >
                        Total: {item.totalPredictions} prediction(s)
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
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

function TopResults({ results }: { results: TopResult[] }) {
  if (results.length === 0) {
    return (
      <div
        className="mt-4 rounded-2xl p-4"
        style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e5e7eb",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 800,
            color: "#6b7280",
          }}
        >
          Ainda não há resultados exatos suficientes para este jogo.
        </p>
      </div>
    );
  }

  return (
    <div
      className="mt-4 rounded-2xl p-4"
      style={{
        backgroundColor: "#f8fafc",
        border: "1px solid #e5e7eb",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 950,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "#7c3aed",
        }}
      >
        Top 3 resultados mais escolhidos
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {results.map((result, index) => (
          <div
            key={`${result.shortLabel}-${index}`}
            className="rounded-2xl bg-white p-3"
            style={{
              border: "1px solid #e5e7eb",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 950,
                color:
                  index === 0 ? "#7c3aed" : index === 1 ? "#4b5563" : "#6b7280",
              }}
            >
              #{index + 1}
            </p>

            <p
              style={{
                marginTop: 4,
                marginBottom: 0,
                fontSize: 20,
                fontWeight: 950,
                color: "#111827",
              }}
            >
              {result.shortLabel}
            </p>

            <p
              style={{
                marginTop: 4,
                marginBottom: 0,
                fontSize: 12,
                fontWeight: 800,
                color: "#6b7280",
              }}
            >
              {result.count} votos · {result.pct}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
