"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { listenToAuth } from "@/lib/auth";
import { type Player } from "@/data/players";
import { subscribeToLivePlayers } from "@/lib/player-stats";
import { games, type Game } from "@/data/games";
import { teams } from "@/data/teams";
import {
  getFantasyEntryByUserId,
  getPredictionsByUserId,
  saveFantasyEntry,
  saveMatchPredictions,
  type MatchPredictionInput,
} from "@/lib/fantasy-entry";
import {
  formatCountdown,
  getFirstTournamentGame,
  getLockDateFromGame,
  getRoundFirstGame,
  getRoundGroups,
} from "@/lib/fantasy-deadlines";
import { getUserProfile, submitPaymentRequest } from "@/lib/users";

type PredictionMap = Record<number, { home: string; away: string }>;

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default function TeamPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [nowTick, setNowTick] = useState(Date.now());

  const [savingPicks, setSavingPicks] = useState(false);
  const [savingRoundLabel, setSavingRoundLabel] = useState<string | null>(null);
  const [livePlayers, setLivePlayers] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState("");
  const [topScorerId, setTopScorerId] = useState("");
  const [topAssistId, setTopAssistId] = useState("");
  const [championTeam, setChampionTeam] = useState("");
  const [predictions, setPredictions] = useState<PredictionMap>({});

  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "mbway" | "revolut" | ""
  >("");

  useEffect(() => {
    const unsubscribe = listenToAuth((authUser) => {
      setUser(authUser);
      setLoadingInitial(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToLivePlayers((updatedPlayers) => {
      setLivePlayers(updatedPlayers);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadEverything = async () => {
      const initialPredictions: PredictionMap = {};
      games.forEach((game) => {
        initialPredictions[game.id] = { home: "", away: "" };
      });

      setPredictions(initialPredictions);

      if (!user) return;

      try {
        const [entry, userPredictions, profile] = await Promise.all([
          getFantasyEntryByUserId(user.uid),
          getPredictionsByUserId(user.uid),
          getUserProfile(user.uid),
        ]);

        setHasPaidAccess(profile?.hasPaidAccess ?? false);
        setPaymentStatus(
          (profile?.paymentStatus as "pending" | "approved" | "rejected") ??
            "pending"
        );

        if (entry) {
          setTeamName(entry.teamName ?? "");
          setTopScorerId(
            entry.topScorerPick ? String(entry.topScorerPick.playerId) : ""
          );
          setTopAssistId(
            entry.topAssistPick ? String(entry.topAssistPick.playerId) : ""
          );
          setChampionTeam(entry.championPick?.teamName ?? "");
        }

        const mergedPredictions: PredictionMap = { ...initialPredictions };

        userPredictions.forEach((prediction) => {
          mergedPredictions[prediction.gameId] = {
            home: String(prediction.predictedHomeScore),
            away: String(prediction.predictedAwayScore),
          };
        });

        setPredictions(mergedPredictions);
      } catch (error) {
        console.error(error);
        alert("Erro ao carregar os teus dados.");
      }
    };

    loadEverything();
  }, [user]);

  const firstTournamentGame = useMemo(() => getFirstTournamentGame(games), []);
  const picksLockDate = useMemo(
    () => getLockDateFromGame(firstTournamentGame),
    [firstTournamentGame]
  );

  const picksLocked = useMemo(() => {
    return nowTick >= picksLockDate.getTime();
  }, [nowTick, picksLockDate]);

  const blockedByPayment = !hasPaidAccess;

  const gamesByRound = useMemo<[string, Game[]][]>(() => {
    const grouped = getRoundGroups(games);

    const order = [
      "Jornada 1",
      "Jornada 2",
      "Jornada 3",
      "Jogo 1",
      "Jogo 2",
      "Jogo 3",
      "Jogo 4",
      "Jogo 5",
      "Jogo 6",
      "Jogo 7",
      "Jogo 8",
      "Jogo 9",
      "Jogo 10",
      "Jogo 11",
      "Jogo 12",
      "Jogo 13",
      "Jogo 14",
      "Jogo 15",
      "Jogo 16",
      "Oitavos",
      "Quartos",
      "Meia-final 1",
      "Meia-final 2",
      "3º lugar",
      "Final",
    ];

    return (Object.entries(grouped) as [string, Game[]][]).sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);

      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, []);

  const topScorerPlayer = livePlayers.find(
    (player) => String(player.id) === topScorerId
  );
  const topAssistPlayer = livePlayers.find(
    (player) => String(player.id) === topAssistId
  );
  const champion = teams.find((team) => team.name === championTeam);

  const totalPredictionsFilled = useMemo(() => {
    return Object.values(predictions).filter(
      (prediction) => prediction.home !== "" && prediction.away !== ""
    ).length;
  }, [predictions]);

  const handlePredictionChange = (
    gameId: number,
    side: "home" | "away",
    value: string,
    locked: boolean
  ) => {
    if (locked || blockedByPayment) return;
    if (value !== "" && !/^\d+$/.test(value)) return;

    setPredictions((prev) => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        [side]: value,
      },
    }));
  };

  const openPaymentModal = () => {
    setPaymentMethod("");
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentMethod("");
  };

  const handlePaymentSubmit = async () => {
    if (!user) {
      alert("Tens de iniciar sessão primeiro.");
      router.push("/login");
      return;
    }

    if (!paymentMethod) {
      alert("Escolhe o método de pagamento.");
      return;
    }

    try {
      setSubmittingPayment(true);

      await submitPaymentRequest({
        userId: user.uid,
        email: user.email || "",
        displayName: user.displayName || user.email || "Utilizador",
        paymentMethod,
      });

      setPaymentStatus("pending");
      closePaymentModal();

      alert(
        "Pedido enviado com sucesso. Agora vais aparecer no /admin para aprovação manual."
      );
    } catch (error) {
      console.error(error);
      alert("Erro ao registar o pedido de pagamento.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleSavePicks = async () => {
    if (!user) {
      alert("Tens de iniciar sessão primeiro.");
      router.push("/login");
      return;
    }

    if (blockedByPayment) {
      openPaymentModal();
      return;
    }

    if (!teamName.trim()) {
      alert("Escolhe um nome para a tua equipa.");
      return;
    }

    if (picksLocked) {
      alert("Os picks principais já estão fechados.");
      return;
    }

    if (!topScorerPlayer) {
      alert("Escolhe um jogador para melhor marcador.");
      return;
    }

    if (!topAssistPlayer) {
      alert("Escolhe um jogador para melhor assistente.");
      return;
    }

    if (!championTeam) {
      alert("Escolhe uma seleção vencedora do Mundial.");
      return;
    }

    try {
      setSavingPicks(true);

      const existingEntry = await getFantasyEntryByUserId(user.uid);

      await saveFantasyEntry({
        userId: user.uid,
        teamName: teamName.trim(),
        managerName: user.displayName || user.email || "Utilizador",
        topScorerPick: {
          playerId: topScorerPlayer.id,
          playerName: topScorerPlayer.name,
        },
        topAssistPick: {
          playerId: topAssistPlayer.id,
          playerName: topAssistPlayer.name,
        },
        championPick: {
          teamName: championTeam,
        },
        totalPoints: existingEntry?.totalPoints ?? 0,
        predictionPoints: existingEntry?.predictionPoints ?? 0,
        topScorerPoints: existingEntry?.topScorerPoints ?? 0,
        topAssistPoints: existingEntry?.topAssistPoints ?? 0,
        selectedTeamPoints: existingEntry?.selectedTeamPoints ?? 0,
      });

      alert("Picks principais guardados com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao guardar os picks principais.");
    } finally {
      setSavingPicks(false);
    }
  };

  const handleSaveRound = async (roundLabel: string, roundGames: Game[]) => {
    if (!user) {
      alert("Tens de iniciar sessão primeiro.");
      router.push("/login");
      return;
    }

    if (blockedByPayment) {
      openPaymentModal();
      return;
    }

    const firstGame = getRoundFirstGame(roundGames);
    const roundLockDate = getLockDateFromGame(firstGame);
    const roundLocked = Date.now() >= roundLockDate.getTime();

    if (roundLocked) {
      alert(`A ronda ${roundLabel} já está fechada.`);
      return;
    }

    const missingGame = roundGames.find((game) => {
      const prediction = predictions[game.id];
      return !prediction || prediction.home === "" || prediction.away === "";
    });

    if (missingGame) {
      alert(`Tens de preencher todos os jogos da ${roundLabel}.`);
      return;
    }

    try {
      setSavingRoundLabel(roundLabel);

      const predictionPayload: MatchPredictionInput[] = roundGames.map((game) => ({
        userId: user.uid,
        gameId: game.id,
        predictedHomeScore: Number(predictions[game.id].home),
        predictedAwayScore: Number(predictions[game.id].away),
      }));

      await saveMatchPredictions(user.uid, predictionPayload);

      alert(`Palpites da ${roundLabel} guardados com sucesso.`);
    } catch (error) {
      console.error(error);
      alert(`Erro ao guardar os palpites da ${roundLabel}.`);
    } finally {
      setSavingRoundLabel(null);
    }
  };

  if (loadingInitial) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f4f5f7",
          padding: "40px 16px",
          color: "#111827",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            background: "#ffffff",
            borderRadius: 24,
            padding: 32,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <p style={{ fontSize: 18, color: "#4b5563" }}>A carregar...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f4f5f7", color: "#111827" }}>
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

      <Link href="/team" className="font-semibold text-blue-600">
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

      <Link href="/ranking" className="hover:text-blue-600">
        Ranking
      </Link>
    </nav>
  </div>
</header>

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 16px 40px", color: "#111827" }}>
        {!hasPaidAccess && (
          <section
            style={{
              position: "relative",
              zIndex: 1,
              marginBottom: 24,
              borderRadius: 24,
              border: "1px solid #fcd34d",
              background: "#fffbeb",
              padding: 24,
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              color: "#111827",
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "#b45309",
              }}
            >
              Acesso premium
            </p>

            <h2
              style={{
                marginTop: 8,
                fontSize: 34,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              Esta fantasy é paga
            </h2>

            <p
              style={{
                marginTop: 12,
                fontSize: 15,
                color: "#374151",
                maxWidth: 1000,
                lineHeight: 1.6,
              }}
            >
              Para participar, tens de pagar{" "}
              <strong>10€ por MB Way ou Revolut para o número 918 888 416</strong>{" "}
              e mandar mensagem para esse número para confirmar. Depois da confirmação
              manual do pagamento, o acesso é desbloqueado.
            </p>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openPaymentModal();
                }}
                style={{
                  appearance: "none",
                  WebkitAppearance: "none",
                  background: "#4c1d95",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 16,
                  padding: "12px 20px",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                Desbloquear acesso
              </button>

              <span
                style={{
                  background: "#ffffff",
                  color: "#374151",
                  borderRadius: 9999,
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                Estado:{" "}
                {paymentStatus === "approved"
                  ? "Aprovado"
                  : paymentStatus === "rejected"
                  ? "Rejeitado"
                  : "Pendente"}
              </span>
            </div>
          </section>
        )}

        <section
          style={{
            marginBottom: 24,
            borderRadius: 24,
            padding: "40px 32px",
            color: "#ffffff",
            background:
              "linear-gradient(90deg, rgba(34,211,238,1) 0%, rgba(37,99,235,1) 50%, rgba(147,51,234,1) 100%)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              opacity: 0.85,
            }}
          >
            Entrada fantasy
          </p>
          <h1
            style={{
              marginTop: 12,
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 1.05,
              color: "#ffffff",
            }}
          >
            Cria a tua entrada para o Mundial 2026
          </h1>
          <p
            style={{
              marginTop: 16,
              maxWidth: 900,
              fontSize: 20,
              opacity: 0.95,
              lineHeight: 1.6,
              color: "#ffffff",
            }}
          >
            Escolhe os teus picks principais antes do arranque do torneio e faz os
            teus palpites por jornada até 1 hora antes do primeiro jogo de cada ronda.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              padding: 24,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              color: "#111827",
            }}
          >
            <div
              style={{
                marginBottom: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "#7c3aed",
                  }}
                >
                  Picks principais
                </p>
                <h2
                  style={{
                    marginTop: 8,
                    fontSize: 32,
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  Dados da tua equipa
                </h2>
              </div>

              <div
                style={{
                  background: picksLocked ? "#fee2e2" : "#dcfce7",
                  color: picksLocked ? "#b91c1c" : "#15803d",
                  borderRadius: 9999,
                  padding: "8px 16px",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {picksLocked ? "Picks fechados" : `Fecha em ${formatCountdown(picksLockDate)}`}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#4b5563",
                }}
              >
                Nome da equipa
              </label>
              <input
                type="text"
                placeholder="Ex: Os Visionários"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={blockedByPayment}
                style={{
                  marginTop: 8,
                  width: "100%",
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                  padding: "14px 16px",
                  fontSize: 15,
                  background: blockedByPayment ? "#f3f4f6" : "#ffffff",
                  color: blockedByPayment ? "#6b7280" : "#111827",
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                marginTop: 20,
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#4b5563",
                  }}
                >
                  Melhor marcador
                </label>
                <select
                  value={topScorerId}
                  onChange={(e) => setTopScorerId(e.target.value)}
                  disabled={picksLocked || blockedByPayment}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    borderRadius: 16,
                    border: "1px solid #e5e7eb",
                    padding: "14px 16px",
                    background: picksLocked || blockedByPayment ? "#f3f4f6" : "#ffffff",
                    color: picksLocked || blockedByPayment ? "#6b7280" : "#111827",
                    appearance: "none",
                    WebkitAppearance: "none",
                  }}
                >
                  <option value="" style={{ color: "#111827" }}>
                    Escolher jogador
                  </option>
                  {livePlayers.map((player) => (
                    <option key={player.id} value={player.id} style={{ color: "#111827" }}>
                      {player.name} • {player.team}
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
                    color: "#4b5563",
                  }}
                >
                  Melhor assistente
                </label>
                <select
                  value={topAssistId}
                  onChange={(e) => setTopAssistId(e.target.value)}
                  disabled={picksLocked || blockedByPayment}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    borderRadius: 16,
                    border: "1px solid #e5e7eb",
                    padding: "14px 16px",
                    background: picksLocked || blockedByPayment ? "#f3f4f6" : "#ffffff",
                    color: picksLocked || blockedByPayment ? "#6b7280" : "#111827",
                    appearance: "none",
                    WebkitAppearance: "none",
                  }}
                >
                  <option value="" style={{ color: "#111827" }}>
                    Escolher jogador
                  </option>
                  {livePlayers.map((player) => (
                    <option key={player.id} value={player.id} style={{ color: "#111827" }}>
                      {player.name} • {player.team}
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
                    color: "#4b5563",
                  }}
                >
                  Seleção campeã
                </label>
                <select
                  value={championTeam}
                  onChange={(e) => setChampionTeam(e.target.value)}
                  disabled={picksLocked || blockedByPayment}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    borderRadius: 16,
                    border: "1px solid #e5e7eb",
                    padding: "14px 16px",
                    background: picksLocked || blockedByPayment ? "#f3f4f6" : "#ffffff",
                    color: picksLocked || blockedByPayment ? "#6b7280" : "#111827",
                    appearance: "none",
                    WebkitAppearance: "none",
                  }}
                >
                  <option value="" style={{ color: "#111827" }}>
                    Escolher seleção
                  </option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.name} style={{ color: "#111827" }}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <button
                type="button"
                onClick={handleSavePicks}
                disabled={savingPicks || picksLocked}
                style={{
                  background: "#4c1d95",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 16,
                  padding: "12px 24px",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: savingPicks || picksLocked ? "not-allowed" : "pointer",
                  opacity: savingPicks || picksLocked ? 0.6 : 1,
                }}
              >
                {savingPicks
                  ? "A guardar picks..."
                  : blockedByPayment
                  ? "Desbloquear para guardar"
                  : picksLocked
                  ? "Picks fechados"
                  : "Guardar picks principais"}
              </button>
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              padding: 24,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              color: "#111827",
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#7c3aed",
              }}
            >
              Resumo
            </p>
            <h2
              style={{
                marginTop: 8,
                fontSize: 32,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              A tua entrada
            </h2>

            <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
              <div style={{ borderRadius: 16, background: "#faf5ff", padding: 16 }}>
                <p style={{ fontSize: 14, color: "#6b7280" }}>Equipa</p>
                <p
                  style={{
                    marginTop: 6,
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  {teamName || "Sem nome ainda"}
                </p>
              </div>

              <div style={{ borderRadius: 16, background: "#faf5ff", padding: 16 }}>
                <p style={{ fontSize: 14, color: "#6b7280" }}>Melhor marcador</p>
                <p
                  style={{
                    marginTop: 6,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  {topScorerPlayer
                    ? `${topScorerPlayer.name} • ${topScorerPlayer.team}`
                    : "Por escolher"}
                </p>
              </div>

              <div style={{ borderRadius: 16, background: "#faf5ff", padding: 16 }}>
                <p style={{ fontSize: 14, color: "#6b7280" }}>Melhor assistente</p>
                <p
                  style={{
                    marginTop: 6,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  {topAssistPlayer
                    ? `${topAssistPlayer.name} • ${topAssistPlayer.team}`
                    : "Por escolher"}
                </p>
              </div>

              <div style={{ borderRadius: 16, background: "#faf5ff", padding: 16 }}>
                <p style={{ fontSize: 14, color: "#6b7280" }}>Campeã escolhida</p>
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
                  {champion?.flag ? (
                    <img
                      src={champion.flag}
                      alt={champion.name}
                      style={{ height: 28, width: 40, objectFit: "cover", borderRadius: 8 }}
                    />
                  ) : (
                    <div
                      style={{
                        height: 28,
                        width: 40,
                        borderRadius: 8,
                        background: "#e5e7eb",
                      }}
                    />
                  )}
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                    {championTeam || "Por escolher"}
                  </p>
                </div>
              </div>

              <div
                style={{
                  borderRadius: 16,
                  padding: 16,
                  color: "#ffffff",
                  background: "linear-gradient(90deg, #22d3ee 0%, #6366f1 100%)",
                }}
              >
                <p style={{ fontSize: 14, textTransform: "uppercase", opacity: 0.8 }}>
                  Palpites preenchidos
                </p>
                <p style={{ marginTop: 6, fontSize: 34, fontWeight: 800 }}>
                  {totalPredictionsFilled}/{games.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            background: "#ffffff",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            color: "#111827",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#7c3aed",
              }}
            >
              Palpites por jornada
            </p>
            <h2
              style={{
                marginTop: 8,
                fontSize: 32,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              Jornadas e eliminatórias
            </h2>
          </div>

          <div style={{ display: "grid", gap: 32 }}>
            {gamesByRound.map(([roundLabel, roundGames]) => {
              const firstGame = getRoundFirstGame(roundGames);
              const roundLockDate = getLockDateFromGame(firstGame);
              const roundLocked = nowTick >= roundLockDate.getTime();

              return (
                <div key={roundLabel}>
                  <div
                    style={{
                      marginBottom: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>
                        {roundLabel}
                      </h3>
                      <p style={{ fontSize: 14, color: "#6b7280" }}>
                        Fecha 1 hora antes do primeiro jogo da ronda
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          background: roundLocked ? "#fee2e2" : "#dcfce7",
                          color: roundLocked ? "#b91c1c" : "#15803d",
                          borderRadius: 9999,
                          padding: "8px 12px",
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {roundLocked
                          ? "Submissões fechadas"
                          : `Fecha em ${formatCountdown(roundLockDate)}`}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSaveRound(roundLabel, roundGames)}
                        disabled={roundLocked || savingRoundLabel === roundLabel}
                        style={{
                          background: "#4c1d95",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 16,
                          padding: "10px 20px",
                          fontWeight: 700,
                          fontSize: 14,
                          cursor:
                            roundLocked || savingRoundLabel === roundLabel
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            roundLocked || savingRoundLabel === roundLabel ? 0.6 : 1,
                        }}
                      >
                        {savingRoundLabel === roundLabel
                          ? "A guardar..."
                          : blockedByPayment
                          ? "Bloqueado"
                          : `Guardar ${roundLabel}`}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 16,
                    }}
                  >
                    {roundGames.map((game) => {
                      const homeTeam = teams.find((team) => team.name === game.homeTeam);
                      const awayTeam = teams.find((team) => team.name === game.awayTeam);
                      const prediction = predictions[game.id] || { home: "", away: "" };

                      return (
                        <article
                          key={game.id}
                          style={{
                            borderRadius: 16,
                            border: "1px solid #f3f4f6",
                            padding: 16,
                            background: roundLocked || blockedByPayment ? "#f9fafb" : "#fcfcfd",
                            color: "#111827",
                          }}
                        >
                          <div
                            style={{
                              marginBottom: 16,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  color: "#9ca3af",
                                }}
                              >
                                {formatDate(game.date)} • {game.time}
                              </p>
                              <div
                                style={{
                                  marginTop: 8,
                                  display: "flex",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                {game.group && (
                                  <span
                                    style={{
                                      borderRadius: 9999,
                                      background: "#eff6ff",
                                      color: "#1d4ed8",
                                      padding: "4px 10px",
                                      fontSize: 12,
                                      fontWeight: 600,
                                    }}
                                  >
                                    Grupo {game.group}
                                  </span>
                                )}
                                <span
                                  style={{
                                    borderRadius: 9999,
                                    background: "#faf5ff",
                                    color: "#7c3aed",
                                    padding: "4px 10px",
                                    fontSize: 12,
                                    fontWeight: 600,
                                  }}
                                >
                                  {game.phase}
                                </span>
                              </div>
                            </div>

                            <span
                              style={{
                                borderRadius: 9999,
                                background: "#f3f4f6",
                                color: "#4b5563",
                                padding: "4px 12px",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {game.status}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr auto 1fr",
                              alignItems: "center",
                              gap: 16,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: 12,
                              }}
                            >
                              <span
                                style={{
                                  textAlign: "right",
                                  fontSize: 14,
                                  fontWeight: 700,
                                  color: "#111827",
                                }}
                              >
                                {game.homeTeam}
                              </span>
                              {homeTeam?.flag ? (
                                <img
                                  src={homeTeam.flag}
                                  alt={game.homeTeam}
                                  style={{
                                    height: 24,
                                    width: 36,
                                    objectFit: "cover",
                                    borderRadius: 6,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    height: 24,
                                    width: 36,
                                    borderRadius: 6,
                                    background: "#e5e7eb",
                                  }}
                                />
                              )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={prediction.home}
                                disabled={roundLocked || blockedByPayment}
                                onChange={(e) =>
                                  handlePredictionChange(
                                    game.id,
                                    "home",
                                    e.target.value,
                                    roundLocked
                                  )
                                }
                                style={{
                                  height: 48,
                                  width: 56,
                                  borderRadius: 12,
                                  border: "1px solid #e5e7eb",
                                  textAlign: "center",
                                  fontSize: 18,
                                  fontWeight: 700,
                                  background:
                                    roundLocked || blockedByPayment ? "#f3f4f6" : "#ffffff",
                                  color:
                                    roundLocked || blockedByPayment ? "#6b7280" : "#111827",
                                }}
                              />
                              <span
                                style={{ fontSize: 20, fontWeight: 800, color: "#4c1d95" }}
                              >
                                -
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={prediction.away}
                                disabled={roundLocked || blockedByPayment}
                                onChange={(e) =>
                                  handlePredictionChange(
                                    game.id,
                                    "away",
                                    e.target.value,
                                    roundLocked
                                  )
                                }
                                style={{
                                  height: 48,
                                  width: 56,
                                  borderRadius: 12,
                                  border: "1px solid #e5e7eb",
                                  textAlign: "center",
                                  fontSize: 18,
                                  fontWeight: 700,
                                  background:
                                    roundLocked || blockedByPayment ? "#f3f4f6" : "#ffffff",
                                  color:
                                    roundLocked || blockedByPayment ? "#6b7280" : "#111827",
                                }}
                              />
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              {awayTeam?.flag ? (
                                <img
                                  src={awayTeam.flag}
                                  alt={game.awayTeam}
                                  style={{
                                    height: 24,
                                    width: 36,
                                    objectFit: "cover",
                                    borderRadius: 6,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    height: 24,
                                    width: 36,
                                    borderRadius: 6,
                                    background: "#e5e7eb",
                                  }}
                                />
                              )}
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                                {game.awayTeam}
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {showPaymentModal && (
        <div
          onClick={closePaymentModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 24,
              background: "#ffffff",
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              color: "#111827",
            }}
          >
            <h3 style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>
              Desbloquear Fantasy Mundial 2026
            </h3>

            <p style={{ marginTop: 12, fontSize: 14, color: "#4b5563" }}>
              O acesso completo custa <strong>10€</strong>.
            </p>

            <div
              style={{
                marginTop: 16,
                borderRadius: 16,
                background: "#faf5ff",
                padding: 16,
              }}
            >
              <p style={{ fontSize: 14, color: "#6b7280" }}>
                Pagamento por MB Way ou Revolut
              </p>
              <p style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#111827" }}>
                918 888 416
              </p>
              <p style={{ marginTop: 10, fontSize: 14, color: "#4b5563", lineHeight: 1.6 }}>
                Faz o pagamento e manda mensagem para esse número. Depois escolhe o
                método utilizado e carrega em “Já paguei” para eu validar manualmente.
              </p>
            </div>

            <div style={{ marginTop: 18 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
                Método de pagamento
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("mbway")}
                  style={{
                    border:
                      paymentMethod === "mbway"
                        ? "2px solid #4c1d95"
                        : "1px solid #d1d5db",
                    background: paymentMethod === "mbway" ? "#f5f3ff" : "#ffffff",
                    color: "#111827",
                    borderRadius: 16,
                    padding: "14px 16px",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  MB Way
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("revolut")}
                  style={{
                    border:
                      paymentMethod === "revolut"
                        ? "2px solid #4c1d95"
                        : "1px solid #d1d5db",
                    background: paymentMethod === "revolut" ? "#f5f3ff" : "#ffffff",
                    color: "#111827",
                    borderRadius: 16,
                    padding: "14px 16px",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  Revolut
                </button>
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={handlePaymentSubmit}
                disabled={submittingPayment}
                style={{
                  background: "#4c1d95",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 16,
                  padding: "12px 20px",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: submittingPayment ? "not-allowed" : "pointer",
                  opacity: submittingPayment ? 0.6 : 1,
                }}
              >
                {submittingPayment ? "A enviar..." : "Já paguei"}
              </button>

              <button
                type="button"
                onClick={closePaymentModal}
                style={{
                  background: "#ffffff",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: 16,
                  padding: "12px 20px",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}