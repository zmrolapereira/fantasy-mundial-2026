"use client";

import { useEffect, useMemo, useState } from "react";
import { User } from "firebase/auth";
import Link from "next/link";
import { listenToAuth } from "@/lib/auth";
import { teams } from "@/data/teams";
import SiteHeader from "@/components/SiteHeader";
import {
  EMPTY_MINI_GAME_PICKS,
  MINI_GAME_PRICE,
  MINI_GAME_STAGE_META,
  MINI_GAME_STAGE_ORDER,
  MiniGameAccessRequest,
  MiniGameConfig,
  MiniGameEntry,
  MiniGamePicks,
  requestMiniGameAccess,
  saveMiniGameEntry,
  subscribeMiniGameAccessRequest,
  subscribeMiniGameConfig,
  subscribeMiniGameEntry,
  subscribeMiniGameEntries,
} from "@/lib/mini-game";

type BracketRound = {
  id: string;
  title: string;
  subtitle: string;
  sourceTeams: string[];
  targetStage: keyof MiniGamePicks;
};

type RankedMiniGameEntry = MiniGameEntry & {
  rank?: number;
};

type MiniGameTab = "bracket" | "publicPicks";

const MINI_GAME_DEADLINE = new Date("2026-06-28T20:00:00+01:00");

function formatDeadline(date: Date) {
  return date.toLocaleString("pt-PT", {
    timeZone: "Europe/Lisbon",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeLeft(targetDate: Date, now: number) {
  const distance = targetDate.getTime() - now;

  if (distance <= 0) return "Deadline terminada";

  const totalSeconds = Math.floor(distance / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getFlagByCountry(countryName?: string) {
  if (!countryName) return undefined;
  return teams.find((team) => team.name === countryName)?.flag;
}

function clonePicks(picks: MiniGamePicks): MiniGamePicks {
  return {
    oitavos: [...(picks.oitavos ?? [])],
    quartos: [...(picks.quartos ?? [])],
    meias: [...(picks.meias ?? [])],
    final: [...(picks.final ?? [])],
    campeao: [...(picks.campeao ?? [])],
  };
}

function cleanPicks(picks: MiniGamePicks): MiniGamePicks {
  return {
    oitavos: picks.oitavos.filter(Boolean),
    quartos: picks.quartos.filter(Boolean),
    meias: picks.meias.filter(Boolean),
    final: picks.final.filter(Boolean),
    campeao: picks.campeao.filter(Boolean),
  };
}

function pairTeams(teamsList: string[]) {
  const pairs: [string, string][] = [];

  for (let index = 0; index < teamsList.length; index += 2) {
    pairs.push([teamsList[index] || "", teamsList[index + 1] || ""]);
  }

  return pairs;
}

function countFilled(values?: string[]) {
  return (values ?? []).filter(Boolean).length;
}

function getDownstreamStages(
  stage: keyof MiniGamePicks,
): (keyof MiniGamePicks)[] {
  if (stage === "oitavos") return ["quartos", "meias", "final", "campeao"];
  if (stage === "quartos") return ["meias", "final", "campeao"];
  if (stage === "meias") return ["final", "campeao"];
  if (stage === "final") return ["campeao"];
  return [];
}

function validateBracketPicks(picks: MiniGamePicks) {
  for (const stage of MINI_GAME_STAGE_ORDER) {
    const selected = countFilled(picks[stage]);
    const max = MINI_GAME_STAGE_META[stage].max;

    if (selected !== max) {
      return {
        valid: false,
        message: `Tens de escolher ${max} ${
          max === 1 ? "seleção" : "seleções"
        } em "${MINI_GAME_STAGE_META[stage].label}".`,
      };
    }
  }

  return { valid: true, message: "" };
}

function PaymentNotice() {
  return (
    <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
        Pagamento do mini jogo
      </p>
      <p className="mt-2 text-sm font-bold leading-6">
        Para validar a inscrição, envia <span className="font-black">5€</span>{" "}
        por <span className="font-black">Revolut ou MB WAY</span> para:
      </p>
      <p className="mt-2 rounded-2xl bg-white px-4 py-3 text-2xl font-black tracking-tight text-gray-950">
        918 888 416
      </p>
      <p className="mt-2 text-xs font-semibold leading-5 text-amber-800">
        Coloca no descritivo o nome da tua equipa para ser mais fácil confirmar.
        Depois o admin marca como pago e aprova o teu acesso.
      </p>
    </div>
  );
}

function DeadlineNotice({
  deadlinePassed,
  countdown,
}: {
  deadlinePassed: boolean;
  countdown: string;
}) {
  return (
    <div
      className={`rounded-[24px] border p-4 ${
        deadlinePassed
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-violet-200 bg-violet-50 text-violet-900"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-75">
        Deadline das previsões
      </p>
      <p className="mt-2 text-sm font-bold leading-6">
        Tens até{" "}
        <span className="font-black">{formatDeadline(MINI_GAME_DEADLINE)}</span>{" "}
        para submeter a tua bracket. Depois dessa hora, as previsões ficam
        fechadas automaticamente.
      </p>
      <p className="mt-2 rounded-2xl bg-white px-4 py-3 text-2xl font-black tracking-tight text-gray-950">
        {countdown}
      </p>
    </div>
  );
}

function AccessStatusCard({ request }: { request: MiniGameAccessRequest }) {
  const statusCopy = {
    pending: {
      title: "Pedido enviado",
      text: "O teu pedido está pendente. Faz o pagamento e aguarda aprovação do admin.",
      color: "border-amber-200 bg-amber-50 text-amber-800",
    },
    approved: {
      title: "Acesso aprovado",
      text: "Já podes preencher ou consultar a tua bracket do mini jogo.",
      color: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
    rejected: {
      title: "Pedido recusado",
      text: "O teu pedido foi recusado. Fala com o organizador se achares que houve engano.",
      color: "border-rose-200 bg-rose-50 text-rose-800",
    },
  }[request.status];

  return (
    <div className={`rounded-3xl border p-5 ${statusCopy.color}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] opacity-75">
        Mini jogo
      </p>
      <h2 className="mt-2 text-2xl font-black">{statusCopy.title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6">{statusCopy.text}</p>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-white/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide opacity-60">
            Equipa
          </p>
          <p className="mt-1 font-black">{request.teamName || "—"}</p>
        </div>

        <div className="rounded-2xl bg-white/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide opacity-60">
            Pagamento
          </p>
          <p className="mt-1 font-black">
            {request.paid ? "Confirmado" : "Por confirmar"}
          </p>
        </div>
      </div>
    </div>
  );
}

function TeamButton({
  teamName,
  selected,
  disabled,
  onClick,
}: {
  teamName: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const flag = getFlagByCountry(teamName);

  return (
    <button
      type="button"
      disabled={disabled || !teamName}
      onClick={onClick}
      className={`flex min-h-[44px] w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left transition ${
        selected
          ? "border-violet-500 bg-violet-50 text-violet-900 ring-2 ring-violet-100"
          : "border-gray-200 bg-white text-gray-700 hover:border-violet-200 hover:bg-violet-50/40"
      } ${disabled || !teamName ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {flag ? (
        <img
          src={flag}
          alt={teamName}
          className="h-5 w-7 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="h-5 w-7 shrink-0 rounded bg-gray-200" />
      )}

      <span className="truncate text-xs font-black">
        {teamName || "Por definir"}
      </span>
    </button>
  );
}

function BracketColumn({
  round,
  picks,
  locked,
  onSelectWinner,
}: {
  round: BracketRound;
  picks: MiniGamePicks;
  locked: boolean;
  onSelectWinner: (
    targetStage: keyof MiniGamePicks,
    matchIndex: number,
    teamName: string,
  ) => void;
}) {
  const pairs = pairTeams(round.sourceTeams);
  const selectedWinners = picks[round.targetStage] ?? [];

  return (
    <div className="min-w-[260px] flex-1">
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
          {round.title}
        </p>
        <p className="mt-1 text-xs font-semibold text-gray-500">
          {round.subtitle}
        </p>
      </div>

      <div className="space-y-3">
        {pairs.map(([home, away], matchIndex) => {
          const selected = selectedWinners[matchIndex] || "";

          return (
            <div
              key={`${round.id}-${matchIndex}`}
              className="rounded-[22px] border border-gray-200 bg-gray-50 p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                  Jogo {matchIndex + 1}
                </span>
                {selected && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700">
                    Escolhido
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <TeamButton
                  teamName={home}
                  selected={selected === home}
                  disabled={locked}
                  onClick={() =>
                    onSelectWinner(round.targetStage, matchIndex, home)
                  }
                />
                <TeamButton
                  teamName={away}
                  selected={selected === away}
                  disabled={locked}
                  onClick={() =>
                    onSelectWinner(round.targetStage, matchIndex, away)
                  }
                />
              </div>
            </div>
          );
        })}

        {pairs.length === 0 && (
          <div className="rounded-[22px] border border-dashed border-gray-300 bg-white p-5 text-center text-sm font-semibold text-gray-500">
            Completa a ronda anterior para esta coluna aparecer.
          </div>
        )}
      </div>
    </div>
  );
}

function SmallTeamChip({ teamName }: { teamName: string }) {
  const flag = getFlagByCountry(teamName);

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-black text-gray-700 shadow-sm">
      {flag ? (
        <img
          src={flag}
          alt={teamName}
          className="h-3.5 w-5 rounded object-cover"
        />
      ) : (
        <span className="h-3.5 w-5 rounded bg-gray-200" />
      )}
      <span className="truncate">{teamName}</span>
    </span>
  );
}

function MiniGameLeaderboard({
  entries,
  selectedEntry,
  onSelectEntry,
  canShowPicks,
}: {
  entries: RankedMiniGameEntry[];
  selectedEntry?: RankedMiniGameEntry | null;
  onSelectEntry: (entry: RankedMiniGameEntry) => void;
  canShowPicks: boolean;
}) {
  const leader = entries[0];

  return (
    <section className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gradient-to-r from-slate-950 via-indigo-700 to-violet-700 p-5 text-white sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
              Leaderboard pública
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Classificação do mini jogo
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
              Ranking separado da fantasy. Clica numa equipa para ver a bracket
              submetida.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[230px]">
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-[9px] font-black uppercase tracking-wide text-white/60">
                Entradas
              </p>
              <p className="mt-1 text-2xl font-black">{entries.length}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-[9px] font-black uppercase tracking-wide text-white/60">
                Líder
              </p>
              <p className="mt-1 truncate text-sm font-black">
                {leader?.teamName || "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {entries.length === 0 ? (
            <div className="p-7 text-center">
              <p className="text-sm font-bold text-gray-500">
                Ainda não há brackets submetidas.
              </p>
            </div>
          ) : (
            entries.map((entry) => {
              const selected = selectedEntry?.userId === entry.userId;

              return (
                <button
                  key={entry.userId}
                  type="button"
                  onClick={() => onSelectEntry(entry)}
                  className={`grid w-full grid-cols-[46px_1fr_70px] items-center gap-3 px-4 py-3 text-left transition hover:bg-violet-50 ${
                    selected ? "bg-violet-50" : "bg-white"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${
                      entry.rank === 1
                        ? "bg-yellow-300 text-slate-950"
                        : entry.rank === 2
                          ? "bg-slate-200 text-slate-950"
                          : entry.rank === 3
                            ? "bg-amber-500 text-white"
                            : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {entry.rank ?? "—"}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-gray-950">
                      {entry.teamName || "Sem equipa"}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-gray-500">
                      {entry.managerName || "—"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">
                      Pontos
                    </p>
                    <p className="text-2xl font-black text-violet-700">
                      {entry.totalPoints ?? 0}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-[30px] border border-gray-200 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:self-start">
        {!selectedEntry ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-7 text-center">
            <p className="text-sm font-bold text-gray-500">
              Seleciona uma equipa na leaderboard para ver a bracket.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-[24px] bg-gradient-to-r from-slate-950 via-indigo-700 to-violet-700 p-5 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/65">
                Bracket selecionada
              </p>
              <h3 className="mt-2 text-2xl font-black">
                {selectedEntry.teamName || "Sem equipa"}
              </h3>
              <p className="mt-1 text-sm font-semibold text-white/75">
                {selectedEntry.managerName || "—"}
              </p>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                <span className="text-xs font-black uppercase tracking-wide text-white/65">
                  Total
                </span>
                <span className="text-2xl font-black">
                  {selectedEntry.totalPoints ?? 0} pts
                </span>
              </div>
            </div>

            {!canShowPicks ? (
              <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Picks ocultas
                </p>
                <p className="mt-2 text-sm font-bold leading-6">
                  As brackets ficam visíveis quando a deadline terminar ou
                  quando o admin fechar as picks, para ninguém copiar apostas
                  antes do fecho.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {MINI_GAME_STAGE_ORDER.map((stage) => {
                  const selectedTeams = selectedEntry.picks?.[stage] ?? [];
                  const points = selectedEntry.stagePoints?.[stage] ?? 0;
                  const meta = MINI_GAME_STAGE_META[stage];

                  return (
                    <div
                      key={stage}
                      className="rounded-3xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
                            {meta.label}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-gray-500">
                            {selectedTeams.length}/{meta.max} escolhas
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                          {points} pts
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {selectedTeams.length === 0 ? (
                          <span className="text-xs font-semibold text-gray-400">
                            Sem escolhas guardadas.
                          </span>
                        ) : (
                          selectedTeams.map((teamName, index) => (
                            <SmallTeamChip
                              key={`${stage}-${teamName}-${index}`}
                              teamName={teamName}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default function MiniGamePage() {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<MiniGameConfig | null>(null);
  const [accessRequest, setAccessRequest] =
    useState<MiniGameAccessRequest | null>(null);
  const [entry, setEntry] = useState<MiniGameEntry | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    RankedMiniGameEntry[]
  >([]);
  const [selectedLeaderboardUserId, setSelectedLeaderboardUserId] =
    useState("");
  const [activeTab, setActiveTab] = useState<MiniGameTab>("bracket");

  const [teamName, setTeamName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [picks, setPicks] = useState<MiniGamePicks>(EMPTY_MINI_GAME_PICKS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const unsubscribe = listenToAuth(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeMiniGameConfig(setConfig);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeMiniGameEntries((entries) => {
      setLeaderboardEntries(entries as RankedMiniGameEntry[]);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setAccessRequest(null);
      setEntry(null);
      return;
    }

    const unsubscribeAccess = subscribeMiniGameAccessRequest(
      user.uid,
      setAccessRequest,
    );
    const unsubscribeEntry = subscribeMiniGameEntry(user.uid, setEntry);

    return () => {
      unsubscribeAccess();
      unsubscribeEntry();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (accessRequest) {
      setTeamName(accessRequest.teamName ?? "");
      setManagerName(accessRequest.managerName ?? "");
    }
  }, [accessRequest]);

  useEffect(() => {
    if (entry?.picks) {
      setPicks(clonePicks(entry.picks));
    }
  }, [entry?.userId]);

  const approved = accessRequest?.status === "approved";
  const deadlinePassed = now >= MINI_GAME_DEADLINE.getTime();
  const countdown = formatTimeLeft(MINI_GAME_DEADLINE, now);
  const locked = Boolean(config?.isLocked) || deadlinePassed;
  const canEdit = approved && Boolean(config?.isOpen) && !locked;
  const canRequestAccess = Boolean(config?.isOpen) && !deadlinePassed;

  const selectedLeaderboardEntry = useMemo(() => {
    if (leaderboardEntries.length === 0) return null;

    return (
      leaderboardEntries.find(
        (item) => item.userId === selectedLeaderboardUserId,
      ) ?? leaderboardEntries[0]
    );
  }, [leaderboardEntries, selectedLeaderboardUserId]);

  const canShowPublicPicks = deadlinePassed || Boolean(config?.isLocked);

  const bracketRounds: BracketRound[] = useMemo(() => {
    return [
      {
        id: "16avos",
        title: "16 avos",
        subtitle: "Escolhe quem passa aos oitavos.",
        sourceTeams: config?.qualifiedTeams ?? [],
        targetStage: "oitavos",
      },
      {
        id: "oitavos",
        title: "Oitavos",
        subtitle: "Escolhe quem passa aos quartos.",
        sourceTeams: picks.oitavos.filter(Boolean),
        targetStage: "quartos",
      },
      {
        id: "quartos",
        title: "Quartos",
        subtitle: "Escolhe quem passa às meias.",
        sourceTeams: picks.quartos.filter(Boolean),
        targetStage: "meias",
      },
      {
        id: "meias",
        title: "Meias-finais",
        subtitle: "Escolhe quem chega à final.",
        sourceTeams: picks.meias.filter(Boolean),
        targetStage: "final",
      },
      {
        id: "final",
        title: "Final",
        subtitle: "Escolhe o campeão.",
        sourceTeams: picks.final.filter(Boolean),
        targetStage: "campeao",
      },
    ];
  }, [config?.qualifiedTeams, picks]);

  const selectedTotal = useMemo(() => {
    return MINI_GAME_STAGE_ORDER.reduce(
      (sum, stage) => sum + countFilled(picks[stage]),
      0,
    );
  }, [picks]);

  const handleRequestAccess = async () => {
    if (!user?.uid || !user.email) {
      setMessage("Tens de iniciar sessão primeiro.");
      return;
    }

    if (deadlinePassed) {
      setMessage(
        "A deadline do mini jogo já terminou. Já não é possível pedir acesso.",
      );
      return;
    }

    if (!config?.isOpen) {
      setMessage("O mini jogo ainda não está aberto para pedidos.");
      return;
    }

    if (!teamName.trim() || !managerName.trim()) {
      setMessage("Preenche o nome da equipa e o teu nome.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await requestMiniGameAccess({
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
        teamName,
        managerName,
      });

      setMessage(
        "Pedido enviado. Agora envia 5€ por Revolut ou MB WAY para 918 888 416.",
      );
    } catch (error) {
      console.error(error);
      setMessage("Não foi possível enviar o pedido.");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectWinner = (
    targetStage: keyof MiniGamePicks,
    matchIndex: number,
    selectedTeam: string,
  ) => {
    if (!selectedTeam) return;

    setMessage("");

    setPicks((current) => {
      const next = clonePicks(current);
      const selected = [...(next[targetStage] ?? [])];

      selected[matchIndex] = selectedTeam;
      next[targetStage] = selected;

      getDownstreamStages(targetStage).forEach((stage) => {
        next[stage] = [];
      });

      return next;
    });
  };

  const handleSavePicks = async () => {
    if (!user?.uid || !user.email || !config || !accessRequest) return;

    const cleanedPicks = cleanPicks(picks);
    const validation = validateBracketPicks(cleanedPicks);

    if (!validation.valid) {
      setMessage(validation.message);
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await saveMiniGameEntry({
        userId: user.uid,
        email: user.email,
        teamName: accessRequest.teamName,
        managerName: accessRequest.managerName,
        picks: cleanedPicks,
        config,
      });

      setMessage("Bracket guardada com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar a bracket.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f6fb] text-gray-950">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div
          className="overflow-hidden rounded-[34px] p-6 text-white shadow-lg sm:p-8"
          style={{
            background:
              "linear-gradient(90deg, #101828 0%, #4f46e5 52%, #7c3aed 100%)",
          }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/75">
            Mini jogo • Mundial 2026
          </p>

          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
                Bracket da fase a eliminar
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/85">
                Jogo paralelo à fantasy. Entrada de {MINI_GAME_PRICE}€. Começa
                nos 16 avos e escolhe quem passa ronda a ronda até ao campeão.
                Cada seleção certa vale 1 ponto.
              </p>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/15 p-5 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
                Estado
              </p>
              <p className="mt-2 text-3xl font-black">
                {deadlinePassed
                  ? "Deadline terminou"
                  : locked
                    ? "Fechado"
                    : config?.isOpen
                      ? "Aberto"
                      : "Por abrir"}
              </p>
              <p className="mt-2 text-sm font-semibold text-white/75">
                {config?.qualifiedTeams.length ?? 0} seleções carregadas
              </p>
              <p className="mt-1 text-sm font-black text-white">
                Deadline: {countdown}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <DeadlineNotice
            deadlinePassed={deadlinePassed}
            countdown={countdown}
          />
        </div>

        <div className="mt-5 rounded-[26px] border border-gray-200 bg-white p-2 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveTab("bracket")}
              className={`rounded-2xl px-4 py-3 text-left transition ${
                activeTab === "bracket"
                  ? "bg-gray-950 text-white shadow"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
                Jogar
              </p>
              <p className="mt-1 text-sm font-black">A minha bracket</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("publicPicks")}
              className={`rounded-2xl px-4 py-3 text-left transition ${
                activeTab === "publicPicks"
                  ? "bg-violet-600 text-white shadow"
                  : "bg-violet-50 text-violet-800 hover:bg-violet-100"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
                Depois da deadline
              </p>
              <p className="mt-1 text-sm font-black">Apostas dos outros</p>
            </button>
          </div>

          {!canShowPublicPicks && activeTab === "publicPicks" && (
            <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
              As apostas dos outros só ficam visíveis depois da deadline das 20h
              ou quando o admin fechar as picks.
            </div>
          )}
        </div>

        {activeTab === "publicPicks" && (
          <MiniGameLeaderboard
            entries={leaderboardEntries}
            selectedEntry={selectedLeaderboardEntry}
            onSelectEntry={(selectedEntry) =>
              setSelectedLeaderboardUserId(selectedEntry.userId)
            }
            canShowPicks={canShowPublicPicks}
          />
        )}

        {activeTab === "bracket" && (
          <>

        {!user && (
          <div className="mt-5 rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-2xl font-black">Inicia sessão para jogar</h2>
            <p className="mt-2 text-sm font-semibold text-gray-500">
              Tens de entrar na tua conta antes de pedir acesso ao mini jogo.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex rounded-full bg-violet-600 px-6 py-3 text-sm font-black text-white transition hover:bg-violet-700"
            >
              Fazer login
            </Link>
          </div>
        )}

        {user && !accessRequest && (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
                Pedido de acesso
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Participar no mini jogo
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
                Envia o pedido. Depois de confirmares o pagamento de{" "}
                {MINI_GAME_PRICE}€, o admin aprova o teu acesso.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="Nome da equipa"
                  className="h-12 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold outline-none focus:border-violet-500"
                />
                <input
                  value={managerName}
                  onChange={(event) => setManagerName(event.target.value)}
                  placeholder="O teu nome"
                  className="h-12 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold outline-none focus:border-violet-500"
                />
              </div>

              <button
                type="button"
                disabled={saving || !canRequestAccess}
                onClick={handleRequestAccess}
                className="mt-4 rounded-full bg-violet-600 px-6 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:opacity-70"
              >
                {deadlinePassed
                  ? "Deadline terminada"
                  : saving
                    ? "A enviar..."
                    : `Pedir acesso • ${MINI_GAME_PRICE}€`}
              </button>
            </div>

            <PaymentNotice />
          </div>
        )}

        {user && accessRequest && (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
            <AccessStatusCard request={accessRequest} />
            {!accessRequest.paid && <PaymentNotice />}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">
            {message}
          </div>
        )}

        {user && approved && config && config.qualifiedTeams.length === 0 && (
          <div className="mt-5 rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black">
              Mini jogo ainda não configurado
            </h2>
            <p className="mt-2 text-sm font-semibold text-gray-500">
              O admin ainda vai carregar as seleções dos 16 avos.
            </p>
          </div>
        )}

        {user && approved && config && config.qualifiedTeams.length > 0 && (
          <div className="mt-5 space-y-4">
            <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
                    A tua bracket
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {entry ? `${entry.totalPoints} pts` : "Ainda sem submissão"}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    Selecionaste {selectedTotal} opções no total. A bracket
                    fecha quando o admin bloquear as picks.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!canEdit || saving}
                  onClick={handleSavePicks}
                  className="rounded-full bg-violet-600 px-6 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {locked
                    ? "Bracket fechada"
                    : saving
                      ? "A guardar..."
                      : entry
                        ? "Atualizar bracket"
                        : "Guardar bracket"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex min-w-max gap-4">
                {bracketRounds.map((round) => (
                  <BracketColumn
                    key={round.id}
                    round={round}
                    picks={picks}
                    locked={!canEdit}
                    onSelectWinner={handleSelectWinner}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

          </>
        )}
      </section>
    </main>
  );
}
