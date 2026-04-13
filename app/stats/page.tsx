"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player } from "@/data/players";
import { subscribeToLivePlayers } from "@/lib/player-stats";
import SiteHeader from "@/components/HeaderTemp";

type StatType = "goals" | "assists" | "points";
type PositionType = "ALL" | "GR" | "DEF" | "MED" | "ATA";

export default function StatsPage() {
  const [livePlayers, setLivePlayers] = useState<Player[]>([]);
  const [selectedStat, setSelectedStat] = useState<StatType>("goals");
  const [selectedTeam, setSelectedTeam] = useState<string>("ALL");
  const [selectedPosition, setSelectedPosition] = useState<PositionType>("ALL");

  useEffect(() => {
    const unsubscribe = subscribeToLivePlayers((updatedPlayers) => {
      setLivePlayers(updatedPlayers);
    });

    return () => unsubscribe();
  }, []);

  const uniqueTeams = useMemo(() => {
    return ["ALL", ...Array.from(new Set(livePlayers.map((player) => player.team)))];
  }, [livePlayers]);

  const filteredAndSortedPlayers = useMemo(() => {
    return [...livePlayers]
      .filter((player) => {
        const matchesTeam = selectedTeam === "ALL" || player.team === selectedTeam;
        const matchesPosition =
          selectedPosition === "ALL" || player.position === selectedPosition;

        return matchesTeam && matchesPosition;
      })
      .sort((a, b) => b[selectedStat] - a[selectedStat]);
  }, [livePlayers, selectedStat, selectedTeam, selectedPosition]);

  const totalGoals = livePlayers.reduce((sum, player) => sum + player.goals, 0);
  const totalAssists = livePlayers.reduce((sum, player) => sum + player.assists, 0);
  const totalPoints = livePlayers.reduce((sum, player) => sum + player.points, 0);

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-gray-900">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Estatísticas</h1>
          <p className="text-sm text-gray-500 sm:text-base">
            Consulta os jogadores com mais golos, assistências e pontos.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-gray-500">Total de golos</p>
            <p className="mt-2 text-3xl font-extrabold text-blue-600">{totalGoals}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-gray-500">Total de assistências</p>
            <p className="mt-2 text-3xl font-extrabold text-purple-600">{totalAssists}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-gray-500">Total de pontos</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-600">{totalPoints}</p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xl font-bold sm:text-2xl">Tabela de jogadores</h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
              <select
                value={selectedStat}
                onChange={(e) => setSelectedStat(e.target.value as StatType)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500"
              >
                <option value="goals">Golos</option>
                <option value="assists">Assistências</option>
                <option value="points">Pontos</option>
              </select>

              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500"
              >
                {uniqueTeams.map((team) => (
                  <option key={team} value={team}>
                    {team === "ALL" ? "Todas as seleções" : team}
                  </option>
                ))}
              </select>

              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value as PositionType)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500"
              >
                <option value="ALL">Todas as posições</option>
                <option value="GR">GR</option>
                <option value="DEF">DEF</option>
                <option value="MED">MED</option>
                <option value="ATA">ATA</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-4">#</th>
                  <th className="px-4">Jogador</th>
                  <th className="px-4">Seleção</th>
                  <th className="px-4">Posição</th>
                  <th className="px-4">Golos</th>
                  <th className="px-4">Assistências</th>
                  <th className="px-4">Pontos</th>
                </tr>
              </thead>

              <tbody>
                {filteredAndSortedPlayers.map((player, index) => (
                  <tr key={player.id} className="bg-gray-50">
                    <td className="rounded-l-2xl px-4 py-4 font-bold">{index + 1}</td>
                    <td className="px-4 py-4 font-bold">{player.name}</td>
                    <td className="px-4 py-4 text-gray-600">{player.team}</td>
                    <td className="px-4 py-4 text-gray-600">{player.position}</td>
                    <td className="px-4 py-4 font-semibold text-blue-600">{player.goals}</td>
                    <td className="px-4 py-4 font-semibold text-purple-600">{player.assists}</td>
                    <td className="rounded-r-2xl px-4 py-4 font-semibold text-emerald-600">
                      {player.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAndSortedPlayers.length === 0 && (
            <div className="pt-6 text-center text-gray-500">
              Nenhum jogador encontrado com esses filtros.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}