"use client";

import { useMemo, useState } from "react";
import { games, type Game, type GamePhase } from "@/data/games";
import { teams } from "@/data/teams";
import SiteHeader from "@/components/SiteHeader";

type PhaseFilter =
  | "ALL"
  | "Fase de Grupos"
  | "16 avos"
  | "Oitavos"
  | "Quartos"
  | "Meias-finais"
  | "3º lugar"
  | "Final";

type RoundFilter = "ALL" | string;

function getTeamByName(name: string) {
  return teams.find((team) => team.name === name);
}

function getGameDateTime(game: Game) {
  return new Date(`${game.date}T${game.time}:00`);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function renderScore(homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) return "vs";
  return `${homeScore} - ${awayScore}`;
}

function getPhaseLabel(phase: GamePhase) {
  if (phase === "Oitavos") return "8avos";
  if (phase === "Meias-finais") return "Meias";
  return phase;
}

function getPhaseOrder(phase: PhaseFilter) {
  const order: Record<string, number> = {
    "Fase de Grupos": 1,
    "16 avos": 2,
    Oitavos: 3,
    Quartos: 4,
    "Meias-finais": 5,
    "3º lugar": 6,
    Final: 7,
  };

  return order[phase] ?? 999;
}

function getRoundOrder(round: string) {
  if (round === "Jornada 1") return 1;
  if (round === "Jornada 2") return 2;
  if (round === "Jornada 3") return 3;

  const jogoMatch = round.match(/^Jogo\s+(\d+)$/i);
  if (jogoMatch) return 100 + Number(jogoMatch[1]);

  if (round === "Oitavos") return 200;
  if (round === "Quartos") return 300;
  if (round === "Meias-finais") return 400;
  if (round === "3º lugar") return 500;
  if (round === "Final") return 600;

  return 999;
}

export default function GamesPage() {
  const [selectedTeam, setSelectedTeam] = useState<string>("ALL");
  const [selectedPhase, setSelectedPhase] = useState<PhaseFilter>("ALL");
  const [selectedRound, setSelectedRound] = useState<RoundFilter>("ALL");

  const validTeamNames = useMemo(() => {
    return new Set(teams.map((team) => team.name));
  }, []);

  const uniqueTeams = useMemo(() => {
    return ["ALL", ...teams.map((team) => team.name).sort((a, b) => a.localeCompare(b))];
  }, []);

  const phaseOptions: PhaseFilter[] = [
    "ALL",
    "Fase de Grupos",
    "16 avos",
    "Oitavos",
    "Quartos",
    "Meias-finais",
    "3º lugar",
    "Final",
  ];

  const availableRounds = useMemo(() => {
    const roundsSet = new Set<string>();

    games.forEach((game) => {
      const matchesSelectedPhase =
        selectedPhase === "ALL" || game.phase === selectedPhase;

      const matchesSelectedTeam =
        selectedTeam === "ALL" ||
        game.homeTeam === selectedTeam ||
        game.awayTeam === selectedTeam;

      if (matchesSelectedPhase && matchesSelectedTeam) {
        roundsSet.add(game.round);
      }
    });

    return ["ALL", ...Array.from(roundsSet).sort((a, b) => getRoundOrder(a) - getRoundOrder(b))];
  }, [selectedPhase, selectedTeam]);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesTeam =
        selectedTeam === "ALL" ||
        game.homeTeam === selectedTeam ||
        game.awayTeam === selectedTeam;

      const matchesPhase = selectedPhase === "ALL" || game.phase === selectedPhase;
      const matchesRound = selectedRound === "ALL" || game.round === selectedRound;

      return matchesTeam && matchesPhase && matchesRound;
    });
  }, [selectedTeam, selectedPhase, selectedRound]);

  const groupedByPhase = useMemo(() => {
    const groups: Record<string, Game[]> = {};

    filteredGames.forEach((game) => {
      if (!groups[game.phase]) groups[game.phase] = [];
      groups[game.phase].push(game);
    });

    const sortedEntries = Object.entries(groups).sort(
      ([phaseA], [phaseB]) =>
        getPhaseOrder(phaseA as PhaseFilter) - getPhaseOrder(phaseB as PhaseFilter)
    );

    return sortedEntries.map(([phase, phaseGames]) => ({
      phase,
      games: [...phaseGames].sort(
        (a, b) => getGameDateTime(a).getTime() - getGameDateTime(b).getTime()
      ),
    }));
  }, [filteredGames]);

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-gray-900">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Jogos</h1>
          <p className="text-sm text-gray-500 sm:text-base">
            Calendário completo do Mundial 2026 com filtros por fase, jornada e seleção.
          </p>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <select
              value={selectedPhase}
              onChange={(e) => {
                setSelectedPhase(e.target.value as PhaseFilter);
                setSelectedRound("ALL");
              }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500"
            >
              {phaseOptions.map((phase) => (
                <option key={phase} value={phase}>
                  {phase === "ALL" ? "Todas as fases" : getPhaseLabel(phase as GamePhase)}
                </option>
              ))}
            </select>

            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500"
            >
              {availableRounds.map((round) => (
                <option key={round} value={round}>
                  {round === "ALL" ? "Todas as jornadas / rondas" : round}
                </option>
              ))}
            </select>

            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                setSelectedRound("ALL");
              }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500"
            >
              {uniqueTeams.map((team) => (
                <option key={team} value={team}>
                  {team === "ALL" ? "Todas as seleções" : team}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSelectedPhase("ALL");
                setSelectedRound("ALL");
                setSelectedTeam("ALL");
              }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {groupedByPhase.map(({ phase, games: phaseGames }) => (
            <section key={phase} className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600">
                    Mundial 2026
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-[#3a0d57] sm:text-2xl">
                    {getPhaseLabel(phase as GamePhase)}
                  </h2>
                </div>

                <div className="rounded-full bg-[#f3ecf8] px-4 py-2 text-sm font-semibold text-[#4a145f]">
                  {phaseGames.length} jogos
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {phaseGames.map((game) => {
                  const homeTeam = validTeamNames.has(game.homeTeam)
                    ? getTeamByName(game.homeTeam)
                    : undefined;
                  const awayTeam = validTeamNames.has(game.awayTeam)
                    ? getTeamByName(game.awayTeam)
                    : undefined;
                  const hasResult = game.homeScore !== null && game.awayScore !== null;

                  return (
                    <article
                      key={game.id}
                      className="rounded-2xl border border-gray-100 bg-[#fbfbfc] p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {formatDate(game.date)}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium">
                              {game.time}
                            </span>

                            {game.phase === "Fase de Grupos" && game.group && (
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                                Grupo {game.group}
                              </span>
                            )}

                            <span className="rounded-full bg-purple-50 px-2.5 py-1 font-medium text-purple-700">
                              {game.round}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            game.status === "FT"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {game.status}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            {homeTeam?.flag ? (
                              <img
                                src={homeTeam.flag}
                                alt={homeTeam.name}
                                className="h-6 w-9 rounded object-cover shadow-sm"
                              />
                            ) : (
                              <div className="h-6 w-9 rounded bg-gray-200" />
                            )}

                            <span className="truncate text-sm font-bold text-[#2f2140]">
                              {game.homeTeam}
                            </span>
                          </div>

                          <span className="text-lg font-extrabold text-[#3a0d57]">
                            {game.homeScore ?? "-"}
                          </span>
                        </div>

                        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            {awayTeam?.flag ? (
                              <img
                                src={awayTeam.flag}
                                alt={awayTeam.name}
                                className="h-6 w-9 rounded object-cover shadow-sm"
                              />
                            ) : (
                              <div className="h-6 w-9 rounded bg-gray-200" />
                            )}

                            <span className="truncate text-sm font-bold text-[#2f2140]">
                              {game.awayTeam}
                            </span>
                          </div>

                          <span className="text-lg font-extrabold text-[#3a0d57]">
                            {game.awayScore ?? "-"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-gray-100 pt-3">
                        <div className="flex items-center justify-center">
                          <span className="rounded-xl bg-[#f1ebf6] px-4 py-2 text-sm font-extrabold text-[#4a145f]">
                            {hasResult ? renderScore(game.homeScore, game.awayScore) : "Por jogar"}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {filteredGames.length === 0 && (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <p className="text-lg text-gray-500">
                Não existem jogos para os filtros escolhidos.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}