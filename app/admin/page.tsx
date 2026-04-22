"use client";

import { useEffect, useMemo, useState } from "react";
import { User } from "firebase/auth";
import { players } from "@/data/players";
import {
  getAllPlayerTournamentStats,
  getPlayerStatHistory,
  savePlayerTournamentStat,
  type PlayerStatHistoryItem,
  type PlayerTournamentStat,
} from "@/lib/player-stats";
import { recalculateAllFantasyPoints } from "@/lib/recalculate-points";
import { listenToAuth } from "@/lib/auth";
import {
  approvePayment,
  getAllPayments,
  rejectPayment,
  type PaymentRequest,
} from "@/lib/users";
import { saveStageLeaderboardSnapshot } from "@/lib/leaderboard-snapshots";
import SiteHeader from "@/components/SiteHeader";

const ADMIN_EMAIL = "zmrolapereira@gmail.com";

type TimestampLike =
  | string
  | number
  | Date
  | { seconds?: number; nanoseconds?: number }
  | null
  | undefined;

type PaymentMethodFilter = "all" | "mbway" | "revolut";
type AdminTab = "payments" | "stats";
type PositionFilter = "ALL" | "GR" | "DEF" | "MED" | "ATA";

type HistoryItemWithDiff = PlayerStatHistoryItem & {
  id: string;
  goalsDiff: number | null;
  assistsDiff: number | null;
};

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("payments");

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    String(players[0]?.id ?? "")
  );
  const [goals, setGoals] = useState("");
  const [assists, setAssists] = useState("");
  const [loadingSave, setLoadingSave] = useState(false);

  const [playerStats, setPlayerStats] = useState<PlayerTournamentStat[]>([]);
  const [loadingPlayerStats, setLoadingPlayerStats] = useState(true);

  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] =
    useState<PaymentMethodFilter>("all");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItemWithDiff[]>([]);

  const [snapshotStageId, setSnapshotStageId] = useState("jornada 1");
  const [snapshotLabel, setSnapshotLabel] = useState("Jornada 1");
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  // filtros stats
  const [playerTeamFilter, setPlayerTeamFilter] = useState<string>("ALL");
  const [playerPositionFilter, setPlayerPositionFilter] =
    useState<PositionFilter>("ALL");
  const [playerSearch, setPlayerSearch] = useState("");

  useEffect(() => {
    const unsubscribe = listenToAuth(setUser);
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const uniqueTeams = useMemo(() => {
    return ["ALL", ...Array.from(new Set(players.map((player) => player.team))).sort((a, b) =>
      a.localeCompare(b)
    )];
  }, []);

  const filteredPlayers = useMemo(() => {
    const search = playerSearch.trim().toLowerCase();

    return [...players]
      .filter((player) => {
        const matchesTeam =
          playerTeamFilter === "ALL" || player.team === playerTeamFilter;

        const matchesPosition =
          playerPositionFilter === "ALL" ||
          player.position === playerPositionFilter;

        const matchesSearch =
          !search || player.name.toLowerCase().includes(search);

        return matchesTeam && matchesPosition && matchesSearch;
      })
      .sort((a, b) => {
        if (a.team !== b.team) return a.team.localeCompare(b.team);
        return a.name.localeCompare(b.name);
      });
  }, [playerTeamFilter, playerPositionFilter, playerSearch]);

  useEffect(() => {
    if (!selectedPlayerId && filteredPlayers.length > 0) {
      setSelectedPlayerId(String(filteredPlayers[0].id));
      return;
    }

    const stillExists = filteredPlayers.some(
      (player) => String(player.id) === selectedPlayerId
    );

    if (!stillExists) {
      setSelectedPlayerId(
        filteredPlayers.length > 0 ? String(filteredPlayers[0].id) : ""
      );
    }
  }, [filteredPlayers, selectedPlayerId]);

  const selectedPlayer = useMemo(() => {
    return players.find((player) => String(player.id) === selectedPlayerId);
  }, [selectedPlayerId]);

  const loadPayments = async () => {
    try {
      setLoadingPayments(true);
      const data = await getAllPayments();

      const sorted = [...data].sort((a, b) => {
        const statusOrder = (status: PaymentRequest["status"]) => {
          if (status === "pending") return 0;
          if (status === "approved") return 1;
          return 2;
        };

        const aStatus = statusOrder(a.status);
        const bStatus = statusOrder(b.status);

        if (aStatus !== bStatus) return aStatus - bStatus;
        return 0;
      });

      setPayments(sorted);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar pagamentos.");
    } finally {
      setLoadingPayments(false);
    }
  };

  const loadPlayerStats = async () => {
    try {
      setLoadingPlayerStats(true);
      const data = await getAllPlayerTournamentStats();
      setPlayerStats(data);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar stats dos jogadores.");
    } finally {
      setLoadingPlayerStats(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadPayments();
      loadPlayerStats();
    }
  }, [isAdmin]);

  useEffect(() => {
    const stat = playerStats.find(
      (item) => String(item.playerId) === selectedPlayerId
    );

    setGoals(String(stat?.goals ?? 0));
    setAssists(String(stat?.assists ?? 0));
  }, [selectedPlayerId, playerStats]);

  const loadHistory = async () => {
    if (!selectedPlayerId) return;

    try {
      setLoadingHistory(true);
      const data = await getPlayerStatHistory(Number(selectedPlayerId));

      const sorted = [...data].sort((a, b) => {
        const getMs = (value: TimestampLike) => {
          if (!value) return 0;
          if (value instanceof Date) return value.getTime();
          if (typeof value === "number") return value;
          if (typeof value === "string") return new Date(value).getTime();
          if (
            typeof value === "object" &&
            value !== null &&
            "seconds" in value &&
            typeof value.seconds === "number"
          ) {
            return value.seconds * 1000;
          }
          return 0;
        };

        return getMs(b.createdAt as TimestampLike) - getMs(a.createdAt as TimestampLike);
      });

      const enriched: HistoryItemWithDiff[] = sorted.map((item, index) => {
        const nextOlder = sorted[index + 1];

        return {
          ...item,
          id: item.id,
          goalsDiff: nextOlder ? item.goals - nextOlder.goals : null,
          assistsDiff: nextOlder ? item.assists - nextOlder.assists : null,
        };
      });

      setHistoryItems(enriched);
      setHistoryOpen(true);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar histórico.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveStats = async () => {
  if (!selectedPlayerId || !selectedPlayer) {
    alert("Escolhe um jogador.");
    return;
  }

  try {
    setLoadingSave(true);

    console.log("1. savePlayerTournamentStat");
    await savePlayerTournamentStat(
      Number(selectedPlayerId),
      selectedPlayer.name,
      Number(goals || 0),
      Number(assists || 0)
    );

    console.log("2. loadPlayerStats");
    await loadPlayerStats();

    console.log("3. recalculateAllFantasyPoints");
    await recalculateAllFantasyPoints();

    alert("Stats guardadas com sucesso e pontos recalculados.");
  } catch (error: any) {
    console.error("SAVE STATS ERROR:", error);
    alert(error?.message || "Erro ao guardar as stats.");
  } finally {
    setLoadingSave(false);
  }
};

  const handleApprove = async (userId: string) => {
    try {
      setActionUserId(userId);
      await approvePayment(userId);
      await loadPayments();
      alert("Pagamento aprovado com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao aprovar pagamento.");
    } finally {
      setActionUserId(null);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      setActionUserId(userId);
      await rejectPayment(userId);
      await loadPayments();
      alert("Pagamento rejeitado.");
    } catch (error) {
      console.error(error);
      alert("Erro ao rejeitar pagamento.");
    } finally {
      setActionUserId(null);
    }
  };

  const handleSaveSnapshot = async () => {
    try {
      setSavingSnapshot(true);

      const result = await saveStageLeaderboardSnapshot(
        snapshotStageId.trim().toLowerCase(),
        snapshotLabel.trim()
      );

      if (result?.alreadyExists) {
        alert("Este snapshot já existe.");
      } else {
        alert("Snapshot guardado com sucesso.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao guardar snapshot.");
    } finally {
      setSavingSnapshot(false);
    }
  };

  const formatMethod = (method?: PaymentRequest["method"]) => {
    if (method === "revolut") return "Revolut";
    return "MB Way";
  };

  const formatDateTime = (value: TimestampLike) => {
    if (!value) return "Sem data";

    try {
      if (value instanceof Date) return value.toLocaleString("pt-PT");
      if (typeof value === "number") return new Date(value).toLocaleString("pt-PT");
      if (typeof value === "string") return new Date(value).toLocaleString("pt-PT");

      if (
        typeof value === "object" &&
        value !== null &&
        "seconds" in value &&
        typeof value.seconds === "number"
      ) {
        return new Date(value.seconds * 1000).toLocaleString("pt-PT");
      }

      return "Sem data";
    } catch {
      return "Sem data";
    }
  };

  const formatDiff = (value: number | null, label: string) => {
    if (value === null) return `Primeiro registo de ${label}`;
    if (value === 0) return `Sem alteração de ${label}`;
    if (value > 0) return `+${value} ${label}`;
    return `${value} ${label}`;
  };

  const getPaymentField = (payment: PaymentRequest, fieldName: string) => {
    const raw = payment as unknown as Record<string, unknown>;
    return raw[fieldName] as TimestampLike;
  };

  const getPaymentSubmittedAt = (payment: PaymentRequest) => {
    return (
      getPaymentField(payment, "submittedAt") ??
      getPaymentField(payment, "createdAt") ??
      getPaymentField(payment, "updatedAt")
    );
  };

  const getPaymentApprovedAt = (payment: PaymentRequest) => {
    return (
      getPaymentField(payment, "approvedAt") ??
      getPaymentField(payment, "updatedAt")
    );
  };

  const getPaymentRejectedAt = (payment: PaymentRequest) => {
    return (
      getPaymentField(payment, "rejectedAt") ??
      getPaymentField(payment, "updatedAt")
    );
  };

  const getPaymentAmount = (payment: PaymentRequest) => {
    const value = Number(payment.amount ?? 0);
    return Number.isFinite(value) ? value : 0;
  };

  const matchesSearch = (payment: PaymentRequest) => {
    const q = paymentSearch.trim().toLowerCase();
    if (!q) return true;

    return (
      payment.displayName?.toLowerCase().includes(q) ||
      payment.email?.toLowerCase().includes(q) ||
      payment.userId?.toLowerCase().includes(q)
    );
  };

  const matchesMethod = (payment: PaymentRequest) => {
    if (paymentMethodFilter === "all") return true;
    if (paymentMethodFilter === "mbway") return payment.method !== "revolut";
    return payment.method === "revolut";
  };

  const filteredPayments = payments.filter(
    (payment) => matchesSearch(payment) && matchesMethod(payment)
  );

  const pendingPayments = filteredPayments.filter(
    (payment) => payment.status === "pending"
  );
  const approvedPayments = filteredPayments.filter(
    (payment) => payment.status === "approved"
  );
  const rejectedPayments = filteredPayments.filter(
    (payment) => payment.status === "rejected"
  );

  const totalPayments = filteredPayments.length;
  const totalPending = pendingPayments.length;
  const totalApproved = approvedPayments.length;
  const totalRejected = rejectedPayments.length;

  if (!user) {
    return (
      <main
        className="min-h-screen"
        style={{ backgroundColor: "#f3f4f6", color: "#111827" }}
      >
        <SiteHeader />
        <div className="px-4 py-6">
          <div
            className="mx-auto max-w-3xl rounded-2xl p-6 shadow-sm"
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              color: "#111827",
            }}
          >
            <p style={{ color: "#374151", fontSize: 16, fontWeight: 500 }}>
              Tens de iniciar sessão.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main
        className="min-h-screen"
        style={{ backgroundColor: "#f3f4f6", color: "#111827" }}
      >
        <SiteHeader />
        <div className="px-4 py-6">
          <div
            className="mx-auto max-w-3xl rounded-2xl p-6 shadow-sm"
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              color: "#111827",
            }}
          >
            <p style={{ color: "#374151", fontSize: 16, fontWeight: 500 }}>
              Não tens acesso a esta página.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const TabButton = ({
    value,
    label,
  }: {
    value: AdminTab;
    label: string;
  }) => {
    const active = activeTab === value;

    return (
      <button
        type="button"
        onClick={() => setActiveTab(value)}
        className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition"
        style={{
          backgroundColor: active ? "#2f2140" : "#ffffff",
          color: active ? "#ffffff" : "#2f2140",
          border: active ? "1px solid #2f2140" : "1px solid #d1d5db",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
          minWidth: 140,
        }}
      >
        {label}
      </button>
    );
  };

  const StatBox = ({
    label,
    value,
  }: {
    label: string;
    value: number;
  }) => {
    return (
      <div
        className="rounded-2xl p-3"
        style={{
          backgroundColor: "#433056",
          border: "1px solid rgba(255,255,255,0.18)",
          color: "#ffffff",
        }}
      >
        <p
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "rgba(255,255,255,0.82)",
          }}
        >
          {label}
        </p>
        <p style={{ marginTop: 4, fontSize: 28, fontWeight: 800, color: "#ffffff" }}>
          {value}
        </p>
      </div>
    );
  };

  const PaymentCard = ({
    payment,
    variant,
  }: {
    payment: PaymentRequest;
    variant: "pending" | "approved" | "rejected";
  }) => {
    const isWorking = actionUserId === payment.userId;

    const variantStyles =
      variant === "pending"
        ? {
            backgroundColor: "#fffbea",
            borderColor: "#fcd34d",
            badgeBg: "#fef3c7",
            badgeColor: "#92400e",
          }
        : variant === "approved"
        ? {
            backgroundColor: "#ecfdf5",
            borderColor: "#86efac",
            badgeBg: "#d1fae5",
            badgeColor: "#065f46",
          }
        : {
            backgroundColor: "#fef2f2",
            borderColor: "#fca5a5",
            badgeBg: "#fee2e2",
            badgeColor: "#991b1b",
          };

    return (
      <div
        className="rounded-2xl p-4"
        style={{
          backgroundColor: variantStyles.backgroundColor,
          border: `1px solid ${variantStyles.borderColor}`,
          color: "#111827",
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#111827",
                  margin: 0,
                }}
              >
                {payment.displayName || "Sem nome"}
              </p>

              <span
                className="rounded-full px-2.5 py-1"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  backgroundColor: variantStyles.badgeBg,
                  color: variantStyles.badgeColor,
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                {payment.status}
              </span>
            </div>

            <p
              className="mt-1 break-all"
              style={{
                fontSize: 14,
                color: "#4b5563",
                marginBottom: 0,
              }}
            >
              {payment.email}
            </p>

            <div
              className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2"
              style={{ fontSize: 14, color: "#4b5563" }}
            >
              <p style={{ margin: 0 }}>
                Método:{" "}
                <span style={{ fontWeight: 700, color: "#111827" }}>
                  {formatMethod(payment.method)}
                </span>
              </p>

              <p style={{ margin: 0 }}>
                Valor:{" "}
                <span style={{ fontWeight: 700, color: "#111827" }}>
                  {getPaymentAmount(payment)}€
                </span>
              </p>

              <p style={{ margin: 0 }}>
                Submetido em:{" "}
                <span style={{ fontWeight: 700, color: "#111827" }}>
                  {formatDateTime(getPaymentSubmittedAt(payment))}
                </span>
              </p>

              {variant === "approved" && (
                <p style={{ margin: 0 }}>
                  Aprovado em:{" "}
                  <span style={{ fontWeight: 700, color: "#111827" }}>
                    {formatDateTime(getPaymentApprovedAt(payment))}
                  </span>
                </p>
              )}

              {variant === "rejected" && (
                <p style={{ margin: 0 }}>
                  Rejeitado em:{" "}
                  <span style={{ fontWeight: 700, color: "#111827" }}>
                    {formatDateTime(getPaymentRejectedAt(payment))}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {variant !== "approved" && (
              <button
                type="button"
                onClick={() => handleApprove(payment.userId)}
                disabled={isWorking}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  minWidth: 130,
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  border: "1px solid #15803d",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                }}
              >
                {isWorking
                  ? "A processar..."
                  : variant === "rejected"
                  ? "Aprovar agora"
                  : "Aprovar"}
              </button>
            )}

            {variant !== "rejected" && (
              <button
                type="button"
                onClick={() => handleReject(payment.userId)}
                disabled={isWorking}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  minWidth: 130,
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  border: "1px solid #b91c1c",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                }}
              >
                {isWorking ? "A processar..." : "Rejeitar"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: "#f3f4f6",
        color: "#111827",
      }}
    >
      <SiteHeader />

      <div className="px-3 py-5 sm:px-4 md:px-5 md:py-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <section
            className="rounded-3xl p-6 shadow-lg"
            style={{
              backgroundColor: "#2f2140",
              border: "1px solid #2f2140",
              color: "#ffffff",
            }}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    color: "rgba(255,255,255,0.84)",
                    margin: 0,
                  }}
                >
                  Painel de Administração
                </p>

                <h1
                  style={{
                    marginTop: 10,
                    marginBottom: 0,
                    fontSize: 44,
                    lineHeight: 1.05,
                    fontWeight: 900,
                    color: "#ffffff",
                  }}
                >
                  Gestão da Fantasy Mundial 2026
                </h1>

                <p
                  style={{
                    marginTop: 14,
                    fontSize: 15,
                    color: "rgba(255,255,255,0.92)",
                  }}
                >
                  Aprova pagamentos, atualiza estatísticas e guarda snapshots da
                  leaderboard por jornada/fase.
                </p>

                <div
                  style={{
                    display: "inline-flex",
                    marginTop: 14,
                    padding: "8px 12px",
                    borderRadius: 9999,
                    backgroundColor: "#4a3563",
                    border: "1px solid rgba(255,255,255,0.18)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#ffffff",
                  }}
                >
                  Sessão admin: {user.email}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
                <StatBox label="Registos" value={totalPayments} />
                <StatBox label="Pendentes" value={totalPending} />
                <StatBox label="Aprovados" value={totalApproved} />
                <StatBox label="Rejeitados" value={totalRejected} />
              </div>
            </div>
          </section>

          <section
            className="rounded-2xl p-4 shadow-sm"
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              color: "#111827",
            }}
          >
            <div className="flex flex-wrap gap-2">
              <TabButton value="payments" label="Pagamentos" />
              <TabButton value="stats" label="Atualizar stats" />
            </div>
          </section>

          {activeTab === "payments" && (
            <section
              className="rounded-2xl p-5 shadow-sm"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                color: "#111827",
              }}
            >
              <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 16 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    color: "#7c3aed",
                  }}
                >
                  Gestão
                </p>

                <h2
                  style={{
                    marginTop: 8,
                    marginBottom: 0,
                    fontSize: 34,
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  Pagamentos
                </h2>

                <p
                  style={{
                    marginTop: 8,
                    fontSize: 15,
                    color: "#6b7280",
                  }}
                >
                  Pesquisa utilizadores, filtra por método e valida pagamentos.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="xl:col-span-2">
                    <label
                      style={{
                        display: "block",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#374151",
                      }}
                    >
                      Pesquisar utilizador
                    </label>
                    <input
                      type="text"
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      placeholder="Nome, email ou userId"
                      className="mt-1.5 h-11 w-full rounded-xl px-3 text-sm outline-none"
                      style={{
                        backgroundColor: "#ffffff",
                        color: "#111827",
                        border: "1px solid #d1d5db",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#374151",
                      }}
                    >
                      Método
                    </label>
                    <select
                      value={paymentMethodFilter}
                      onChange={(e) =>
                        setPaymentMethodFilter(
                          e.target.value as PaymentMethodFilter
                        )
                      }
                      className="mt-1.5 h-11 w-full rounded-xl px-3 text-sm outline-none"
                      style={{
                        backgroundColor: "#ffffff",
                        color: "#111827",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="all">Todos</option>
                      <option value="mbway">MB Way</option>
                      <option value="revolut">Revolut</option>
                    </select>
                  </div>
                </div>
              </div>

              {loadingPayments ? (
                <p className="mt-4" style={{ fontSize: 14, color: "#6b7280" }}>
                  A carregar pagamentos...
                </p>
              ) : filteredPayments.length === 0 ? (
                <p className="mt-4" style={{ fontSize: 14, color: "#6b7280" }}>
                  Não existem pagamentos para os filtros selecionados.
                </p>
              ) : (
                <div className="mt-4 space-y-6">
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: "#a16207" }}>
                      Pendentes
                    </h3>
                    {pendingPayments.length === 0 ? (
                      <p className="mt-2" style={{ fontSize: 14, color: "#6b7280" }}>
                        Não existem pagamentos pendentes.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {pendingPayments.map((payment) => (
                          <PaymentCard
                            key={payment.userId}
                            payment={payment}
                            variant="pending"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: "#15803d" }}>
                      Aprovados
                    </h3>
                    {approvedPayments.length === 0 ? (
                      <p className="mt-2" style={{ fontSize: 14, color: "#6b7280" }}>
                        Ainda não existem pagamentos aprovados.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {approvedPayments.map((payment) => (
                          <PaymentCard
                            key={payment.userId}
                            payment={payment}
                            variant="approved"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>
                      Rejeitados
                    </h3>
                    {rejectedPayments.length === 0 ? (
                      <p className="mt-2" style={{ fontSize: 14, color: "#6b7280" }}>
                        Ainda não existem pagamentos rejeitados.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {rejectedPayments.map((payment) => (
                          <PaymentCard
                            key={payment.userId}
                            payment={payment}
                            variant="rejected"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === "stats" && (
            <section
              className="rounded-2xl p-5 shadow-sm"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                color: "#111827",
              }}
            >
              <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 16 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    color: "#7c3aed",
                  }}
                >
                  Gestão
                </p>

                <h2
                  style={{
                    marginTop: 8,
                    marginBottom: 0,
                    fontSize: 34,
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  Atualizar stats dos jogadores
                </h2>

                <p
                  style={{
                    marginTop: 8,
                    fontSize: 15,
                    color: "#6b7280",
                  }}
                >
                  Atualiza golos e assistências, filtra por seleção/posição,
                  pesquisa por nome e consulta o histórico de alterações.
                </p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#374151",
                    }}
                  >
                    Seleção
                  </label>

                  <select
                    value={playerTeamFilter}
                    onChange={(e) => setPlayerTeamFilter(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl px-3 text-sm outline-none"
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#111827",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    {uniqueTeams.map((team) => (
                      <option key={team} value={team}>
                        {team === "ALL" ? "Todas as seleções" : team}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#374151",
                    }}
                  >
                    Posição
                  </label>

                  <select
                    value={playerPositionFilter}
                    onChange={(e) =>
                      setPlayerPositionFilter(e.target.value as PositionFilter)
                    }
                    className="mt-1.5 h-11 w-full rounded-xl px-3 text-sm outline-none"
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#111827",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    <option value="ALL">Todas as posições</option>
                    <option value="GR">GR</option>
                    <option value="DEF">DEF</option>
                    <option value="MED">MED</option>
                    <option value="ATA">ATA</option>
                  </select>
                </div>

                <div className="md:col-span-2 xl:col-span-2">
                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#374151",
                    }}
                  >
                    Pesquisar jogador
                  </label>

                  <input
                    type="text"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    placeholder="Ex.: Cristiano, Bruno, Son..."
                    className="mt-1.5 h-11 w-full rounded-xl px-3 text-sm outline-none"
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#111827",
                      border: "1px solid #d1d5db",
                    }}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerTeamFilter("ALL");
                    setPlayerPositionFilter("ALL");
                    setPlayerSearch("");
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                  }}
                >
                  Limpar filtros
                </button>

                <div
                  className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold"
                  style={{
                    backgroundColor: "#f9fafb",
                    color: "#4b5563",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {filteredPlayers.length} jogadores encontrados
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="md:col-span-2 lg:col-span-4">
                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#374151",
                    }}
                  >
                    Jogador
                  </label>

                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl px-3 text-sm outline-none"
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#111827",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    {filteredPlayers.length === 0 ? (
                      <option value="">Nenhum jogador encontrado</option>
                    ) : (
                      filteredPlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name} • {player.team} • {player.position}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#374151",
                    }}
                  >
                    Golos
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl px-3 text-sm outline-none"
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#111827",
                      border: "1px solid #d1d5db",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#374151",
                    }}
                  >
                    Assistências
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={assists}
                    onChange={(e) => setAssists(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl px-3 text-sm outline-none"
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#111827",
                      border: "1px solid #d1d5db",
                    }}
                  />
                </div>

                <div className="flex items-end md:col-span-2 lg:col-span-2">
                  <button
                    type="button"
                    onClick={handleSaveStats}
                    disabled={
                      loadingSave || loadingPlayerStats || !selectedPlayerId
                    }
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      backgroundColor: "#2f2140",
                      color: "#ffffff",
                      border: "1px solid #2f2140",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    }}
                  >
                    {loadingSave ? "A guardar..." : "Guardar stats"}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadHistory}
                  disabled={loadingHistory || !selectedPlayerId}
                  className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#111827",
                    border: "1px solid #d1d5db",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                  }}
                >
                  {loadingHistory
                    ? "A carregar histórico..."
                    : "Ver histórico de atualizações"}
                </button>
              </div>

              {selectedPlayer && (
                <div
                  className="mt-4 rounded-xl p-4"
                  style={{
                    backgroundColor: "#faf5ff",
                    border: "1px solid #e9d5ff",
                    color: "#111827",
                  }}
                >
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                    Jogador selecionado
                  </p>
                  <p
                    style={{
                      marginTop: 4,
                      marginBottom: 0,
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#111827",
                    }}
                  >
                    {selectedPlayer.name} • {selectedPlayer.team} •{" "}
                    {selectedPlayer.position}
                  </p>
                  <p style={{ marginTop: 8, fontSize: 14, color: "#374151" }}>
                    Valores atuais:{" "}
                    <span style={{ fontWeight: 700 }}>{goals}</span> golos •{" "}
                    <span style={{ fontWeight: 700 }}>{assists}</span> assistências
                  </p>
                </div>
              )}

              <div className="mt-6 rounded-2xl border border-gray-200 bg-[#f8fafc] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                  Snapshot leaderboard
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Stage ID
                    </label>
                    <input
                      type="text"
                      value={snapshotStageId}
                      onChange={(e) => setSnapshotStageId(e.target.value)}
                      placeholder="jornada 1, oitavos, quartos..."
                      className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Label
                    </label>
                    <input
                      type="text"
                      value={snapshotLabel}
                      onChange={(e) => setSnapshotLabel(e.target.value)}
                      placeholder="Jornada 1"
                      className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSnapshot}
                  disabled={savingSnapshot}
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition disabled:opacity-60"
                  style={{
                    backgroundColor: "#7c3aed",
                    color: "#ffffff",
                    border: "1px solid #6d28d9",
                    boxShadow: "0 2px 6px rgba(124,58,237,0.25)",
                    minWidth: 190,
                    display: "inline-flex",
                  }}
                >
                  {savingSnapshot ? "A guardar..." : "Guardar snapshot"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {historyOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl p-5 shadow-2xl"
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              color: "#111827",
            }}
          >
            <div
              className="flex items-start justify-between gap-3 pb-3"
              style={{ borderBottom: "1px solid #e5e7eb" }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  Histórico de atualizações
                </h3>
                <p style={{ marginTop: 4, fontSize: 14, color: "#6b7280" }}>
                  {selectedPlayer?.name || "Jogador"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                }}
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-1">
              {historyItems.length === 0 ? (
                <div
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                    color: "#6b7280",
                  }}
                >
                  Ainda não existem registos para este jogador.
                </div>
              ) : (
                historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: "#f9fafb",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#111827",
                        }}
                      >
                        {item.playerName}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 500,
                          color: "#6b7280",
                        }}
                      >
                        {formatDateTime(item.createdAt as TimestampLike)}
                      </p>
                    </div>

                    <div
                      className="mt-3 grid gap-2 sm:grid-cols-2"
                      style={{ fontSize: 14, color: "#374151" }}
                    >
                      <div
                        className="rounded-lg p-3"
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                          Golos totais
                        </p>
                        <p style={{ marginTop: 4, marginBottom: 0, fontWeight: 800 }}>
                          {item.goals}
                        </p>
                        <p
                          style={{
                            marginTop: 6,
                            marginBottom: 0,
                            fontSize: 12,
                            color:
                              item.goalsDiff !== null && item.goalsDiff > 0
                                ? "#15803d"
                                : "#6b7280",
                            fontWeight: 700,
                          }}
                        >
                          {formatDiff(item.goalsDiff, "golos")}
                        </p>
                      </div>

                      <div
                        className="rounded-lg p-3"
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                          Assistências totais
                        </p>
                        <p style={{ marginTop: 4, marginBottom: 0, fontWeight: 800 }}>
                          {item.assists}
                        </p>
                        <p
                          style={{
                            marginTop: 6,
                            marginBottom: 0,
                            fontSize: 12,
                            color:
                              item.assistsDiff !== null && item.assistsDiff > 0
                                ? "#15803d"
                                : "#6b7280",
                            fontWeight: 700,
                          }}
                        >
                          {formatDiff(item.assistsDiff, "assistências")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}