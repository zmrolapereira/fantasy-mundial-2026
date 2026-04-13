"use client";

import { useMemo, useState } from "react";
import { teams } from "@/data/teams";
import { games, type Game } from "@/data/games";
import SiteHeader from "@/components/HeaderTemp";

type ViewMode = "groups" | "playoffs";

type StandingRow = {
  teamId: string;
  teamName: string;
  teamCode: string;
  teamFlag: string;
  group: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

const allGroups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function getGroupStandings(group: string): StandingRow[] {
  const groupTeams = teams.filter((team) => team.group === group);

  const standings: StandingRow[] = groupTeams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    teamCode: team.code,
    teamFlag: team.flag,
    group: team.group,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }));

  const groupGames = games.filter(
    (game) =>
      game.phase === "Fase de Grupos" &&
      game.group === group &&
      game.homeScore !== null &&
      game.awayScore !== null
  );

  for (const game of groupGames) {
    const homeTeam = standings.find((row) => row.teamName === game.homeTeam);
    const awayTeam = standings.find((row) => row.teamName === game.awayTeam);

    if (!homeTeam || !awayTeam) continue;

    const homeScore = game.homeScore!;
    const awayScore = game.awayScore!;

    homeTeam.played += 1;
    awayTeam.played += 1;

    homeTeam.goalsFor += homeScore;
    homeTeam.goalsAgainst += awayScore;

    awayTeam.goalsFor += awayScore;
    awayTeam.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      homeTeam.wins += 1;
      homeTeam.points += 3;
      awayTeam.losses += 1;
    } else if (homeScore < awayScore) {
      awayTeam.wins += 1;
      awayTeam.points += 3;
      homeTeam.losses += 1;
    } else {
      homeTeam.draws += 1;
      awayTeam.draws += 1;
      homeTeam.points += 1;
      awayTeam.points += 1;
    }
  }

  for (const row of standings) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  return standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });
}

function MatchCard({ game }: { game: Game }) {
  const isFinished = game.status === "FT";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {formatDate(game.date)}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            isFinished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {game.status}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-[#faf8fc] px-3 py-2">
          <span className="text-sm font-semibold text-[#2f2140]">{game.homeTeam}</span>
          <span className="text-sm font-extrabold text-[#4a145f]">{game.homeScore ?? "-"}</span>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-[#faf8fc] px-3 py-2">
          <span className="text-sm font-semibold text-[#2f2140]">{game.awayTeam}</span>
          <span className="text-sm font-extrabold text-[#4a145f]">{game.awayScore ?? "-"}</span>
        </div>
      </div>

      <div className="mt-3 text-center text-xs font-medium text-gray-400">{game.round}</div>
    </div>
  );
}

function GroupTable({ selectedGroup }: { selectedGroup: string }) {
  const standings = useMemo(() => getGroupStandings(selectedGroup), [selectedGroup]);

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#7b3aed]">
              Fase de grupos
            </p>
            <h2 className="text-2xl font-extrabold text-[#3a0d57]">Grupo {selectedGroup}</h2>
          </div>

          <div className="rounded-full bg-[#f3ecf8] px-4 py-2 text-sm font-semibold text-[#4a145f]">
            {standings.length} seleções
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full">
          <thead className="bg-[#faf7fc]">
            <tr className="border-b border-gray-100 text-left text-sm uppercase tracking-wide text-gray-500">
              <th className="px-4 py-4 font-semibold sm:px-6">#</th>
              <th className="px-4 py-4 font-semibold sm:px-6">Seleção</th>
              <th className="px-3 py-4 text-center font-semibold">J</th>
              <th className="px-3 py-4 text-center font-semibold">V</th>
              <th className="px-3 py-4 text-center font-semibold">E</th>
              <th className="px-3 py-4 text-center font-semibold">D</th>
              <th className="px-3 py-4 text-center font-semibold">GM</th>
              <th className="px-3 py-4 text-center font-semibold">GS</th>
              <th className="px-3 py-4 text-center font-semibold">DG</th>
              <th className="px-4 py-4 text-center font-semibold sm:px-6">Pts</th>
            </tr>
          </thead>

          <tbody>
            {standings.map((team, index) => {
              const isQualified = index < 2;

              return (
                <tr
                  key={team.teamId}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-center gap-3">
                      <span className={`h-10 w-1 rounded-full ${isQualified ? "bg-green-500" : "bg-transparent"}`} />
                      <span className="text-base font-bold text-[#3a0d57]">{index + 1}</span>
                    </div>
                  </td>

                  <td className="px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={team.teamFlag}
                        alt={team.teamName}
                        className="h-7 w-10 rounded object-cover shadow-sm"
                      />
                      <div>
                        <p className="text-base font-bold text-[#2f2140]">{team.teamName}</p>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          {team.teamCode}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-700">{team.played}</td>
                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-700">{team.wins}</td>
                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-700">{team.draws}</td>
                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-700">{team.losses}</td>
                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-700">{team.goalsFor}</td>
                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-700">{team.goalsAgainst}</td>
                  <td
                    className={`px-3 py-4 text-center text-sm font-bold ${
                      team.goalDifference > 0
                        ? "text-green-600"
                        : team.goalDifference < 0
                        ? "text-red-500"
                        : "text-gray-600"
                    }`}
                  >
                    {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                  </td>
                  <td className="px-4 py-4 text-center sm:px-6">
                    <span className="inline-flex min-w-[52px] items-center justify-center rounded-full bg-[#f3ecf8] px-3 py-1.5 text-sm font-extrabold text-[#4a145f]">
                      {team.points}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 bg-[#fcfcfd] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span>Top 2 destacados</span>
          </div>
          <div>J = Jogos</div>
          <div>V = Vitórias</div>
          <div>E = Empates</div>
          <div>D = Derrotas</div>
          <div>GM = Golos Marcados</div>
          <div>GS = Golos Sofridos</div>
          <div>DG = Diferença de Golos</div>
          <div>Pts = Pontos</div>
        </div>
      </div>
    </div>
  );
}

function PlayoffBracket() {
  const roundOf32 = games.filter((game) => game.phase === "16 avos");
  const roundOf16 = games.filter((game) => game.phase === "Oitavos");
  const quarterFinals = games.filter((game) => game.phase === "Quartos");
  const semiFinals = games.filter((game) => game.phase === "Meias-finais");
  const thirdPlace = games.filter((game) => game.phase === "3º lugar");
  const final = games.filter((game) => game.phase === "Final");

  return (
    <div className="overflow-x-auto rounded-3xl bg-[#f5f2f8] p-4 shadow-sm sm:p-6">
      <div className="flex min-w-[1500px] items-start gap-4 sm:gap-6">
        <div className="min-w-[220px] flex-1">
          <h3 className="mb-4 text-center text-lg font-extrabold text-[#3a0d57]">16 avos</h3>
          <div className="space-y-4">
            {roundOf32.map((game) => <MatchCard key={game.id} game={game} />)}
          </div>
        </div>

        <div className="min-w-[220px] flex-1">
          <h3 className="mb-4 text-center text-lg font-extrabold text-[#3a0d57]">Oitavos</h3>
          <div className="space-y-8 pt-8">
            {roundOf16.map((game) => <MatchCard key={game.id} game={game} />)}
          </div>
        </div>

        <div className="min-w-[220px] flex-1">
          <h3 className="mb-4 text-center text-lg font-extrabold text-[#3a0d57]">Quartos</h3>
          <div className="space-y-16 pt-24">
            {quarterFinals.map((game) => <MatchCard key={game.id} game={game} />)}
          </div>
        </div>

        <div className="min-w-[220px] flex-1">
          <h3 className="mb-4 text-center text-lg font-extrabold text-[#3a0d57]">Meias-finais</h3>
          <div className="space-y-24 pt-44">
            {semiFinals.map((game) => <MatchCard key={game.id} game={game} />)}
          </div>
        </div>

        <div className="min-w-[240px] flex-1">
          <h3 className="mb-4 text-center text-lg font-extrabold text-[#3a0d57]">Final</h3>
          <div className="pt-[210px]">
            {final.map((game) => <MatchCard key={game.id} game={game} />)}
          </div>

          <h3 className="mb-4 mt-12 text-center text-lg font-extrabold text-[#3a0d57]">3º lugar</h3>
          <div>
            {thirdPlace.map((game) => <MatchCard key={game.id} game={game} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TablePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("groups");
  const [selectedGroup, setSelectedGroup] = useState<string>("A");

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-gray-900">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Tabela classificativa</h1>
          <p className="text-sm text-gray-500 sm:text-base">
            Consulta a fase de grupos ou acompanha o bracket dos playoffs.
          </p>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              onClick={() => setViewMode("groups")}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                viewMode === "groups"
                  ? "bg-[#4a145f] text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Fase de grupos
            </button>

            <button
              onClick={() => setViewMode("playoffs")}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                viewMode === "playoffs"
                  ? "bg-[#4a145f] text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Playoffs
            </button>

            {viewMode === "groups" && (
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium outline-none focus:border-blue-500"
              >
                {allGroups.map((group) => (
                  <option key={group} value={group}>
                    Grupo {group}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {viewMode === "groups" ? <GroupTable selectedGroup={selectedGroup} /> : <PlayoffBracket />}
      </div>
    </main>
  );
}