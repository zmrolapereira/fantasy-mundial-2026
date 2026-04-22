"use client";

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
  saveBoostTokenForUser,
  type BoostToken,
  type BoostTokenTarget,
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
import SiteHeader from "@/components/SiteHeader";

type PredictionMap = Record<number, { home: string; away: string }>;
type PositionFilter = "ALL" | "GR" | "DEF" | "MED" | "ATA";

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
  const [savingToken, setSavingToken] = useState(false);

  const [livePlayers, setLivePlayers] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState("");
  const [topScorerId, setTopScorerId] = useState("");
  const [topAssistId, setTopAssistId] = useState("");
  const [championTeam, setChampionTeam] = useState("");
  const [predictions, setPredictions] = useState<PredictionMap>({});

  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"mbway" | "revolut" | "">("");

  // filtros melhor marcador
  const [topScorerTeamFilter, setTopScorerTeamFilter] = useState("ALL");
  const [topScorerPositionFilter, setTopScorerPositionFilter] =
    useState<PositionFilter>("ALL");
  const [topScorerSearch, setTopScorerSearch] = useState("");

  // filtros melhor assistente
  const [topAssistTeamFilter, setTopAssistTeamFilter] = useState("ALL");
  const [topAssistPositionFilter, setTopAssistPositionFilter] =
    useState<PositionFilter>("ALL");
  const [topAssistSearch, setTopAssistSearch] = useState("");

  // token única
  const [boostTokenTarget, setBoostTokenTarget] = useState<BoostTokenTarget | "">("");
  const [boostTokenStage, setBoostTokenStage] = useState("");
  const [savedBoostToken, setSavedBoostToken] = useState<BoostToken | null>(null);

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
          (profile?.paymentStatus as "pending" | "approved" | "rejected") ?? "pending"
        );

        if (entry) {
          setTeamName(entry.teamName ?? "");
          setTopScorerId(entry.topScorerPick ? String(entry.topScorerPick.playerId) : "");
          setTopAssistId(entry.topAssistPick ? String(entry.topAssistPick.playerId) : "");
          setChampionTeam(entry.championPick?.teamName ?? "");
          setSavedBoostToken(entry.boostToken ?? null);
          setBoostTokenTarget(entry.boostToken?.target ?? "");
          setBoostTokenStage(entry.boostToken?.stage ?? "");
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

  const availableTokenStages = useMemo(() => {
  const allowedStages = new Set([
    "Jornada 1",
    "Jornada 2",
    "Jornada 3",
    "Oitavos",
    "Quartos",
    "Meia-final 1",
    "Meia-final 2",
    "3º lugar",
    "Final",
  ]);

  return gamesByRound
    .map(([roundLabel]) => roundLabel)
    .filter((roundLabel) => allowedStages.has(roundLabel));
}, [gamesByRound]);

  const selectedTokenRoundGames = useMemo(() => {
    return gamesByRound.find(([roundLabel]) => roundLabel === boostTokenStage)?.[1] ?? [];
  }, [gamesByRound, boostTokenStage]);

  const selectedTokenLocked = useMemo(() => {
    if (!boostTokenStage || selectedTokenRoundGames.length === 0) return false;
    const firstGame = getRoundFirstGame(selectedTokenRoundGames);
    const lockDate = getLockDateFromGame(firstGame);
    return nowTick >= lockDate.getTime();
  }, [boostTokenStage, selectedTokenRoundGames, nowTick]);

  const savedTokenRoundGames = useMemo(() => {
    if (!savedBoostToken?.stage) return [];
    return gamesByRound.find(([roundLabel]) => roundLabel === savedBoostToken.stage)?.[1] ?? [];
  }, [gamesByRound, savedBoostToken]);

  const savedTokenLocked = useMemo(() => {
    if (!savedBoostToken?.stage || savedTokenRoundGames.length === 0) return false;
    const firstGame = getRoundFirstGame(savedTokenRoundGames);
    const lockDate = getLockDateFromGame(firstGame);
    return nowTick >= lockDate.getTime();
  }, [savedBoostToken, savedTokenRoundGames, nowTick]);

  const uniqueTeams = useMemo(() => {
    return ["ALL", ...Array.from(new Set(livePlayers.map((player) => player.team))).sort((a, b) =>
      a.localeCompare(b)
    )];
  }, [livePlayers]);

  const topScorerFilteredPlayers = useMemo(() => {
    const search = topScorerSearch.trim().toLowerCase();

    return [...livePlayers]
      .filter((player) => {
        const matchesTeam =
          topScorerTeamFilter === "ALL" || player.team === topScorerTeamFilter;

        const matchesPosition =
          topScorerPositionFilter === "ALL" ||
          player.position === topScorerPositionFilter;

        const matchesSearch =
          !search || player.name.toLowerCase().includes(search);

        return matchesTeam && matchesPosition && matchesSearch;
      })
      .sort((a, b) => {
        if (a.team !== b.team) return a.team.localeCompare(b.team);
        return a.name.localeCompare(b.name);
      });
  }, [livePlayers, topScorerTeamFilter, topScorerPositionFilter, topScorerSearch]);

  const topAssistFilteredPlayers = useMemo(() => {
    const search = topAssistSearch.trim().toLowerCase();

    return [...livePlayers]
      .filter((player) => {
        const matchesTeam =
          topAssistTeamFilter === "ALL" || player.team === topAssistTeamFilter;

        const matchesPosition =
          topAssistPositionFilter === "ALL" ||
          player.position === topAssistPositionFilter;

        const matchesSearch =
          !search || player.name.toLowerCase().includes(search);

        return matchesTeam && matchesPosition && matchesSearch;
      })
      .sort((a, b) => {
        if (a.team !== b.team) return a.team.localeCompare(b.team);
        return a.name.localeCompare(b.name);
      });
  }, [livePlayers, topAssistTeamFilter, topAssistPositionFilter, topAssistSearch]);

  useEffect(() => {
    if (!topScorerId && topScorerFilteredPlayers.length > 0) return;

    const exists = topScorerFilteredPlayers.some(
      (player) => String(player.id) === topScorerId
    );

    if (!exists && topScorerFilteredPlayers.length > 0) {
      setTopScorerId(String(topScorerFilteredPlayers[0].id));
    }

    if (!exists && topScorerFilteredPlayers.length === 0) {
      setTopScorerId("");
    }
  }, [topScorerFilteredPlayers, topScorerId]);

  useEffect(() => {
    if (!topAssistId && topAssistFilteredPlayers.length > 0) return;

    const exists = topAssistFilteredPlayers.some(
      (player) => String(player.id) === topAssistId
    );

    if (!exists && topAssistFilteredPlayers.length > 0) {
      setTopAssistId(String(topAssistFilteredPlayers[0].id));
    }

    if (!exists && topAssistFilteredPlayers.length === 0) {
      setTopAssistId("");
    }
  }, [topAssistFilteredPlayers, topAssistId]);

  const topScorerPlayer = livePlayers.find((player) => String(player.id) === topScorerId);
  const topAssistPlayer = livePlayers.find((player) => String(player.id) === topAssistId);
  const champion = teams.find((team) => team.name === championTeam);

  const totalPredictionsFilled = useMemo(() => {
    return Object.values(predictions).filter(
      (prediction) => prediction.home !== "" && prediction.away !== ""
    ).length;
  }, [predictions]);

  const canSaveToken = useMemo(() => {
    if (blockedByPayment) return false;
    if (!boostTokenTarget || !boostTokenStage.trim()) return false;
    if (selectedTokenLocked) return false;
    return true;
  }, [blockedByPayment, boostTokenTarget, boostTokenStage, selectedTokenLocked]);

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

      const result = await submitPaymentRequest({
        userId: user.uid,
        email: user.email || "",
        displayName: user.displayName || user.email || "Utilizador",
        paymentMethod,
      });

      closePaymentModal();

      if (result.status === "created") {
        setPaymentStatus("pending");
        setHasPaidAccess(false);
        alert("Pedido enviado com sucesso. Agora tens de aguardar pela aprovação do admin.");
        return;
      }

      if (result.status === "already_pending") {
        setPaymentStatus("pending");
        setHasPaidAccess(false);
        alert("O teu pedido já foi enviado. Agora tens de aguardar pela aprovação do admin.");
        return;
      }

      if (result.status === "already_approved") {
        setPaymentStatus("approved");
        setHasPaidAccess(true);
        alert("O teu pagamento já foi aprovado. Já tens acesso desbloqueado.");
        return;
      }

      if (result.status === "resent_after_rejected") {
        setPaymentStatus("pending");
        setHasPaidAccess(false);
        alert("Pedido reenviado com sucesso. Agora tens de aguardar pela aprovação do admin.");
        return;
      }
    } catch (error: any) {
      console.error("PAYMENT REQUEST ERROR:", error);
      alert(error?.message || "Erro ao registar o pedido de pagamento.");
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
        boostToken: existingEntry?.boostToken ?? savedBoostToken ?? null,
        totalPoints: existingEntry?.totalPoints ?? 0,
        predictionPoints: existingEntry?.predictionPoints ?? 0,
        topScorerPoints: existingEntry?.topScorerPoints ?? 0,
        topAssistPoints: existingEntry?.topAssistPoints ?? 0,
        selectedTeamPoints: existingEntry?.selectedTeamPoints ?? 0,
        boostTokenPoints: existingEntry?.boostTokenPoints ?? 0,
      });

      alert("Picks principais guardados com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao guardar os picks principais.");
    } finally {
      setSavingPicks(false);
    }
  };

  const handleSaveToken = async () => {
    if (!user) {
      alert("Tens de iniciar sessão primeiro.");
      router.push("/login");
      return;
    }

    if (blockedByPayment) {
      openPaymentModal();
      return;
    }

    const existingEntry = await getFantasyEntryByUserId(user.uid);

    if (!existingEntry) {
      alert("Primeiro tens de guardar os picks principais.");
      return;
    }

    if (!boostTokenTarget || !boostTokenStage.trim()) {
      alert("Escolhe o tipo da token e a jornada/fase.");
      return;
    }

    const roundGames =
      gamesByRound.find(([roundLabel]) => roundLabel === boostTokenStage)?.[1] ?? [];

    if (!roundGames.length) {
      alert("A jornada/fase da token não é válida.");
      return;
    }

    const firstGame = getRoundFirstGame(roundGames);
    const lockDate = getLockDateFromGame(firstGame);

    if (Date.now() >= lockDate.getTime()) {
      alert("Já não podes ativar a token para essa jornada/fase.");
      return;
    }

    if (savedBoostToken && savedTokenLocked) {
      alert("A tua token já ficou bloqueada e não pode ser alterada.");
      return;
    }

    try {
      setSavingToken(true);

      const finalToken: BoostToken = {
        target: boostTokenTarget,
        stage: boostTokenStage.trim(),
      };

      await saveBoostTokenForUser(user.uid, finalToken);
      setSavedBoostToken(finalToken);

      alert("Token guardada com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao guardar a token.");
    } finally {
      setSavingToken(false);
    }
  };

  const handleClearToken = async () => {
    if (!user) {
      alert("Tens de iniciar sessão primeiro.");
      router.push("/login");
      return;
    }

    if (blockedByPayment) {
      openPaymentModal();
      return;
    }

    const existingEntry = await getFantasyEntryByUserId(user.uid);

    if (!existingEntry) {
      setBoostTokenTarget("");
      setBoostTokenStage("");
      setSavedBoostToken(null);
      return;
    }

    if (savedBoostToken && savedTokenLocked) {
      alert("A tua token já ficou bloqueada e não pode ser removida.");
      return;
    }

    try {
      setSavingToken(true);

      await saveBoostTokenForUser(user.uid, null);
      setSavedBoostToken(null);
      setBoostTokenTarget("");
      setBoostTokenStage("");

      alert("Token removida com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao remover a token.");
    } finally {
      setSavingToken(false);
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
      <main className="min-h-screen bg-[#f4f5f7] text-gray-900">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <p className="text-lg text-gray-600">A carregar...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-gray-900">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
        {!hasPaidAccess && (
          <section className="mb-6 rounded-3xl border border-amber-300 bg-amber-50 p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              Acesso premium
            </p>

            <h2 className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Esta fantasy é paga
            </h2>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-gray-700 sm:text-base">
              Para participar, tens de pagar{" "}
              <strong>10€ por MB Way ou Revolut para o número 918 888 416</strong> e
              mandar mensagem para esse número para confirmar. Depois da confirmação
              manual do pagamento, o acesso é desbloqueado.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openPaymentModal();
                }}
                className="rounded-2xl bg-violet-900 px-5 py-3 text-sm font-bold text-white"
              >
                Desbloquear acesso
              </button>

              <span className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
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

        <section className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/85">
            Entrada fantasy
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
            Cria a tua entrada para o Mundial 2026
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/95 sm:text-lg">
            Escolhe os teus picks principais antes do arranque do torneio e faz os
            teus palpites por jornada até 1 hora antes do primeiro jogo de cada ronda.
          </p>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
                  Picks principais
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
                  Dados da tua equipa
                </h2>
              </div>

              <div
                className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${
                  picksLocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                }`}
              >
                {picksLocked ? "Picks fechados" : `Fecha em ${formatCountdown(picksLockDate)}`}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600">Nome da equipa</label>
              <input
                type="text"
                placeholder="Ex: Os Visionários"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={blockedByPayment}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6">
              <div className="rounded-2xl border border-gray-200 bg-[#fafafa] p-4">
                <label className="block text-sm font-bold text-gray-700">
                  Melhor marcador
                </label>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <select
                    value={topScorerTeamFilter}
                    onChange={(e) => setTopScorerTeamFilter(e.target.value)}
                    disabled={picksLocked || blockedByPayment}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {uniqueTeams.map((team) => (
                      <option key={team} value={team}>
                        {team === "ALL" ? "Todas as seleções" : team}
                      </option>
                    ))}
                  </select>

                  <select
                    value={topScorerPositionFilter}
                    onChange={(e) =>
                      setTopScorerPositionFilter(e.target.value as PositionFilter)
                    }
                    disabled={picksLocked || blockedByPayment}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="ALL">Todas as posições</option>
                    <option value="GR">GR</option>
                    <option value="DEF">DEF</option>
                    <option value="MED">MED</option>
                    <option value="ATA">ATA</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Pesquisar jogador"
                    value={topScorerSearch}
                    onChange={(e) => setTopScorerSearch(e.target.value)}
                    disabled={picksLocked || blockedByPayment}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTopScorerTeamFilter("ALL");
                      setTopScorerPositionFilter("ALL");
                      setTopScorerSearch("");
                    }}
                    disabled={picksLocked || blockedByPayment}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    Limpar filtros
                  </button>

                  <span className="inline-flex rounded-xl bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
                    {topScorerFilteredPlayers.length} jogadores
                  </span>
                </div>

                <select
                  value={topScorerId}
                  onChange={(e) => setTopScorerId(e.target.value)}
                  disabled={picksLocked || blockedByPayment}
                  className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">Escolher jogador</option>
                  {topScorerFilteredPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} • {player.team} • {player.position}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-[#fafafa] p-4">
                <label className="block text-sm font-bold text-gray-700">
                  Melhor assistente
                </label>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <select
                    value={topAssistTeamFilter}
                    onChange={(e) => setTopAssistTeamFilter(e.target.value)}
                    disabled={picksLocked || blockedByPayment}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {uniqueTeams.map((team) => (
                      <option key={team} value={team}>
                        {team === "ALL" ? "Todas as seleções" : team}
                      </option>
                    ))}
                  </select>

                  <select
                    value={topAssistPositionFilter}
                    onChange={(e) =>
                      setTopAssistPositionFilter(e.target.value as PositionFilter)
                    }
                    disabled={picksLocked || blockedByPayment}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="ALL">Todas as posições</option>
                    <option value="GR">GR</option>
                    <option value="DEF">DEF</option>
                    <option value="MED">MED</option>
                    <option value="ATA">ATA</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Pesquisar jogador"
                    value={topAssistSearch}
                    onChange={(e) => setTopAssistSearch(e.target.value)}
                    disabled={picksLocked || blockedByPayment}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTopAssistTeamFilter("ALL");
                      setTopAssistPositionFilter("ALL");
                      setTopAssistSearch("");
                    }}
                    disabled={picksLocked || blockedByPayment}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    Limpar filtros
                  </button>

                  <span className="inline-flex rounded-xl bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
                    {topAssistFilteredPlayers.length} jogadores
                  </span>
                </div>

                <select
                  value={topAssistId}
                  onChange={(e) => setTopAssistId(e.target.value)}
                  disabled={picksLocked || blockedByPayment}
                  className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">Escolher jogador</option>
                  {topAssistFilteredPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} • {player.team} • {player.position}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600">Seleção campeã</label>
                <select
                  value={championTeam}
                  onChange={(e) => setChampionTeam(e.target.value)}
                  disabled={picksLocked || blockedByPayment}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">Escolher seleção</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleSavePicks}
                disabled={savingPicks || picksLocked}
                className="rounded-2xl bg-violet-900 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
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

          <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Resumo</p>
            <h2 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              A tua entrada
            </h2>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl bg-violet-50 p-4">
                <p className="text-sm text-gray-500">Equipa</p>
                <p className="mt-2 text-xl font-extrabold text-gray-900 sm:text-2xl">
                  {teamName || "Sem nome ainda"}
                </p>
              </div>

              <div className="rounded-2xl bg-violet-50 p-4">
                <p className="text-sm text-gray-500">Melhor marcador</p>
                <p className="mt-2 text-base font-bold text-gray-900 sm:text-lg">
                  {topScorerPlayer
                    ? `${topScorerPlayer.name} • ${topScorerPlayer.team}`
                    : "Por escolher"}
                </p>
              </div>

              <div className="rounded-2xl bg-violet-50 p-4">
                <p className="text-sm text-gray-500">Melhor assistente</p>
                <p className="mt-2 text-base font-bold text-gray-900 sm:text-lg">
                  {topAssistPlayer
                    ? `${topAssistPlayer.name} • ${topAssistPlayer.team}`
                    : "Por escolher"}
                </p>
              </div>

              <div className="rounded-2xl bg-violet-50 p-4">
                <p className="text-sm text-gray-500">Campeã escolhida</p>
                <div className="mt-3 flex items-center gap-3">
                  {champion?.flag ? (
                    <img
                      src={champion.flag}
                      alt={champion.name}
                      className="h-7 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-7 w-10 rounded bg-gray-200" />
                  )}
                  <p className="text-base font-bold text-gray-900 sm:text-lg">
                    {championTeam || "Por escolher"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-sm text-gray-500">Token ativa</p>
                <p className="mt-2 text-base font-bold text-gray-900 sm:text-lg">
                  {savedBoostToken
                    ? `${
                        savedBoostToken.target === "topScorer"
                          ? "Melhor marcador"
                          : "Melhor assistente"
                      } • ${savedBoostToken.stage}`
                    : "Não usada"}
                </p>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 p-4 text-white">
                <p className="text-xs uppercase tracking-wide text-white/80">Palpites preenchidos</p>
                <p className="mt-2 text-3xl font-extrabold">
                  {totalPredictionsFilled}/{games.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Token única
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
                Boost de jornada / fase
              </h2>
              <p className="mt-3 text-sm leading-7 text-gray-700 sm:text-base">
                Esta token pode ser usada apenas uma vez na época. Escolhes uma jornada
                ou fase e decides se queres dobrar os pontos do teu{" "}
                <strong>melhor marcador</strong> ou do teu{" "}
                <strong>melhor assistente</strong> nessa etapa.
              </p>
              <p className="mt-2 text-sm leading-7 text-gray-700 sm:text-base">
                A token pode ser guardada até ao início da jornada/fase escolhida,
                mesmo depois de os picks principais já terem fechado.
              </p>
            </div>

            {savedBoostToken && (
              <div className="rounded-2xl bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Guardada
                </p>
                <p className="mt-1 text-sm font-bold text-gray-900">
                  {savedBoostToken.target === "topScorer"
                    ? "Melhor marcador"
                    : "Melhor assistente"}{" "}
                  • {savedBoostToken.stage}
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-gray-700">
                Aplicar a
              </label>
              <select
                value={boostTokenTarget}
                onChange={(e) =>
                  setBoostTokenTarget(e.target.value as BoostTokenTarget | "")
                }
                disabled={blockedByPayment || (savedBoostToken !== null && savedTokenLocked)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">Não usar token</option>
                <option value="topScorer">Melhor marcador</option>
                <option value="topAssist">Melhor assistente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700">
                Jornada / fase
              </label>
              <select
                value={boostTokenStage}
                onChange={(e) => setBoostTokenStage(e.target.value)}
                disabled={blockedByPayment || (savedBoostToken !== null && savedTokenLocked)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">Escolher jornada/fase</option>
                {availableTokenStages.map((roundLabel) => (
                  <option key={roundLabel} value={roundLabel}>
                    {roundLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {boostTokenStage && (
              <span
                className={`inline-flex rounded-xl px-4 py-2 text-sm font-semibold ${
                  selectedTokenLocked
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {selectedTokenLocked
                  ? "Essa jornada/fase já fechou"
                  : "Ainda podes usar esta token"}
              </span>
            )}

            {savedBoostToken && savedTokenLocked && (
              <span className="inline-flex rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                Token bloqueada
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSaveToken}
              disabled={savingToken || !canSaveToken || (savedBoostToken !== null && savedTokenLocked)}
              className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingToken ? "A guardar token..." : "Guardar token"}
            </button>

            <button
              type="button"
              onClick={handleClearToken}
              disabled={savingToken || (savedBoostToken !== null && savedTokenLocked)}
              className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remover token
            </button>
          </div>

          {!savedBoostToken && (
            <p className="mt-3 text-sm text-gray-500">
              Primeiro guarda os picks principais e depois podes guardar a token
              quando quiseres, até ao início da etapa escolhida.
            </p>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
              Palpites por jornada
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Jornadas e eliminatórias
            </h2>
          </div>

          <div className="space-y-8">
            {gamesByRound.map(([roundLabel, roundGames]) => {
              const firstGame = getRoundFirstGame(roundGames);
              const roundLockDate = getLockDateFromGame(firstGame);
              const roundLocked = nowTick >= roundLockDate.getTime();

              return (
                <div key={roundLabel}>
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-900 sm:text-2xl">
                        {roundLabel}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Fecha 1 hora antes do primeiro jogo da ronda
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                      <span
                        className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${
                          roundLocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        }`}
                      >
                        {roundLocked
                          ? "Submissões fechadas"
                          : `Fecha em ${formatCountdown(roundLockDate)}`}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSaveRound(roundLabel, roundGames)}
                        disabled={roundLocked || savingRoundLabel === roundLabel}
                        className="rounded-2xl bg-violet-900 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingRoundLabel === roundLabel
                          ? "A guardar..."
                          : blockedByPayment
                          ? "Bloqueado"
                          : `Guardar ${roundLabel}`}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {roundGames.map((game) => {
                      const homeTeam = teams.find((team) => team.name === game.homeTeam);
                      const awayTeam = teams.find((team) => team.name === game.awayTeam);
                      const prediction = predictions[game.id] || { home: "", away: "" };

                      return (
                        <article
                          key={game.id}
                          className={`rounded-2xl border p-4 ${
                            roundLocked || blockedByPayment
                              ? "border-gray-200 bg-gray-50"
                              : "border-gray-100 bg-[#fcfcfd]"
                          }`}
                        >
                          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                                {formatDate(game.date)} • {game.time}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {game.group && (
                                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                    Grupo {game.group}
                                  </span>
                                )}

                                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                                  {game.phase}
                                </span>
                              </div>
                            </div>

                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                              {game.status}
                            </span>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                {homeTeam?.flag ? (
                                  <img
                                    src={homeTeam.flag}
                                    alt={game.homeTeam}
                                    className="h-6 w-9 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-6 w-9 rounded bg-gray-200" />
                                )}
                                <span className="truncate text-sm font-bold text-gray-900">
                                  {game.homeTeam}
                                </span>
                              </div>

                              <input
                                type="text"
                                inputMode="numeric"
                                value={prediction.home}
                                disabled={roundLocked || blockedByPayment}
                                onChange={(e) =>
                                  handlePredictionChange(game.id, "home", e.target.value, roundLocked)
                                }
                                className="h-12 w-14 rounded-xl border border-gray-200 bg-white text-center text-lg font-bold text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                              />
                            </div>

                            <div className="flex items-center justify-center">
                              <span className="text-xl font-extrabold text-violet-900">-</span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                {awayTeam?.flag ? (
                                  <img
                                    src={awayTeam.flag}
                                    alt={game.awayTeam}
                                    className="h-6 w-9 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-6 w-9 rounded bg-gray-200" />
                                )}
                                <span className="truncate text-sm font-bold text-gray-900">
                                  {game.awayTeam}
                                </span>
                              </div>

                              <input
                                type="text"
                                inputMode="numeric"
                                value={prediction.away}
                                disabled={roundLocked || blockedByPayment}
                                onChange={(e) =>
                                  handlePredictionChange(game.id, "away", e.target.value, roundLocked)
                                }
                                className="h-12 w-14 rounded-xl border border-gray-200 bg-white text-center text-lg font-bold text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                              />
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
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <h3 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Desbloquear Fantasy Mundial 2026
            </h3>

            <p className="mt-3 text-sm text-gray-600">
              O acesso completo custa <strong>10€</strong>.
            </p>

            <div className="mt-4 rounded-2xl bg-violet-50 p-4">
              <p className="text-sm text-gray-500">Pagamento por MB Way ou Revolut</p>
              <p className="mt-2 text-2xl font-extrabold text-gray-900">918 888 416</p>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Faz o pagamento e manda mensagem para esse número. Depois escolhe o
                método utilizado e carrega em “Já paguei” para eu validar manualmente.
              </p>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-bold text-gray-700">Método de pagamento</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("mbway")}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                    paymentMethod === "mbway"
                      ? "border-2 border-violet-900 bg-violet-50 text-gray-900"
                      : "border border-gray-300 bg-white text-gray-900"
                  }`}
                >
                  MB Way
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("revolut")}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                    paymentMethod === "revolut"
                      ? "border-2 border-violet-900 bg-violet-50 text-gray-900"
                      : "border border-gray-300 bg-white text-gray-900"
                  }`}
                >
                  Revolut
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handlePaymentSubmit}
                disabled={submittingPayment}
                className="rounded-2xl bg-violet-900 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingPayment ? "A enviar..." : "Já paguei"}
              </button>

              <button
                type="button"
                onClick={closePaymentModal}
                className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700"
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