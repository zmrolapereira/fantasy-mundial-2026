"use client";

import { useMemo, useState } from "react";
import { teams } from "@/data/teams";
import { games, type Game } from "@/data/games";
import SiteHeader from "@/components/SiteHeader";

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

const allGroups = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "THIRD_PLACES",
];

function sortStandings(rows: StandingRow[]) {
  return rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName, "pt", { sensitivity: "base" });
  });
}

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

  return sortStandings(standings);
}

function getThirdPlaceStandings(): StandingRow[] {
  const thirdPlacedTeams = allGroups
    .filter((group) => group !== "THIRD_PLACES")
    .map((group) => getGroupStandings(group)[2])
    .filter(Boolean);

  return sortStandings(thirdPlacedTeams);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });
}

function getTeamFlag(teamName: string) {
  const team = teams.find((item) => item.name === teamName);
  return team?.flag || "";
}

function TeamLine({
  teamName,
  score,
  align = "left",
}: {
  teamName: string;
  score: number | null;
  align?: "left" | "right";
}) {
  const flag = getTeamFlag(teamName);

  return (
    <div className="flex min-h-[50px] items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm">
      <div
        className={`flex min-w-0 flex-1 items-center gap-3 ${
          align === "right" ? "order-2 flex-row-reverse text-right" : ""
        }`}
      >
        {flag ? (
          <img
            src={flag}
            alt={teamName}
            className="h-7 w-10 shrink-0 rounded-md object-cover shadow-sm"
          />
        ) : (
          <div className="h-7 w-10 shrink-0 rounded-md bg-gray-200" />
        )}

        <span className="truncate text-sm font-black text-[#5b1324]">
          {teamName}
        </span>
      </div>

      <span
        className={`inline-flex h-9 min-w-10 shrink-0 items-center justify-center rounded-xl bg-[#f7f1f3] px-2 text-base font-black text-[#5b1324] ${
          align === "right" ? "order-1" : ""
        }`}
      >
        {score ?? "-"}
      </span>
    </div>
  );
}

function BracketMatch({
  game,
  align = "left",
}: {
  game?: Game;
  align?: "left" | "right";
}) {
  return (
    <div className="h-[158px] w-[280px] rounded-2xl border border-white/15 bg-[#743040] p-3 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-2 px-1 text-[11px] font-black uppercase tracking-wide text-white/75">
        <span className="truncate">
          {game ? `${formatDate(game.date)} • ${game.time ?? "--:--"}` : "--/--"}
        </span>

        <span className="shrink-0">{game?.status ?? "Por jogar"}</span>
      </div>

      <TeamLine
        teamName={game?.homeTeam ?? "A definir"}
        score={game?.homeScore ?? null}
        align={align}
      />

      <div className="mt-2">
        <TeamLine
          teamName={game?.awayTeam ?? "A definir"}
          score={game?.awayScore ?? null}
          align={align}
        />
      </div>

      {game?.penaltyWinner && (
        <p className="mt-2 truncate text-center text-[10px] font-bold uppercase tracking-wide text-white/75">
          *{game.penaltyWinner} vence nos penáltis
        </p>
      )}
    </div>
  );
}

function GroupTable({ selectedGroup }: { selectedGroup: string }) {
  const isThirdPlaces = selectedGroup === "THIRD_PLACES";

  const standings = useMemo(() => {
    if (isThirdPlaces) return getThirdPlaceStandings();
    return getGroupStandings(selectedGroup);
  }, [selectedGroup, isThirdPlaces]);

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#7b3aed]">
              Fase de grupos
            </p>

            <h2 className="text-2xl font-extrabold text-[#3a0d57]">
              {isThirdPlaces
                ? "Melhores 3ºs lugares"
                : `Grupo ${selectedGroup}`}
            </h2>
          </div>

          <div className="rounded-full bg-[#f3ecf8] px-4 py-2 text-sm font-semibold text-[#4a145f]">
            {standings.length} seleções
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-[#faf7fc]">
            <tr className="border-b border-gray-100 text-left text-sm uppercase tracking-wide text-gray-500">
              <th className="px-4 py-4 font-semibold sm:px-6">#</th>
              <th className="px-4 py-4 font-semibold sm:px-6">Seleção</th>
              <th className="px-3 py-4 text-center font-semibold">Grupo</th>
              <th className="px-3 py-4 text-center font-semibold">J</th>
              <th className="px-3 py-4 text-center font-semibold">V</th>
              <th className="px-3 py-4 text-center font-semibold">E</th>
              <th className="px-3 py-4 text-center font-semibold">D</th>
              <th className="px-3 py-4 text-center font-semibold">GM</th>
              <th className="px-3 py-4 text-center font-semibold">GS</th>
              <th className="px-3 py-4 text-center font-semibold">DG</th>
              <th className="px-4 py-4 text-center font-semibold sm:px-6">
                Pts
              </th>
            </tr>
          </thead>

          <tbody>
            {standings.map((team, index) => {
              const isQualified = isThirdPlaces ? index < 8 : index < 2;

              return (
                <tr
                  key={team.teamId}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-10 w-1 rounded-full ${
                          isQualified ? "bg-green-500" : "bg-transparent"
                        }`}
                      />
                      <span className="text-base font-bold text-[#3a0d57]">
                        {index + 1}
                      </span>
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
                        <p className="text-base font-bold text-[#2f2140]">
                          {team.teamName}
                        </p>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          {team.teamCode}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-700">
                    {team.group}
                  </td>
                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-700">
                    {team.played}
                  </td>
                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-700">
                    {team.wins}
                  </td>
                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-700">
                    {team.draws}
                  </td>
                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-700">
                    {team.losses}
                  </td>
                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-700">
                    {team.goalsFor}
                  </td>
                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-700">
                    {team.goalsAgainst}
                  </td>
                  <td
                    className={`px-3 py-4 text-center text-sm font-bold ${
                      team.goalDifference > 0
                        ? "text-green-600"
                        : team.goalDifference < 0
                        ? "text-red-500"
                        : "text-gray-600"
                    }`}
                  >
                    {team.goalDifference > 0
                      ? `+${team.goalDifference}`
                      : team.goalDifference}
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
            <span>
              {isThirdPlaces ? "Top 8 destacados" : "Top 2 destacados"}
            </span>
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
  const thirdPlace = games.find((game) => game.phase === "3º lugar");
  const finalGame = games.find((game) => game.phase === "Final");

  const leftR32 = roundOf32.slice(0, 8);
  const rightR32 = roundOf32.slice(8, 16);

  const leftR16 = roundOf16.slice(0, 4);
  const rightR16 = roundOf16.slice(4, 8);

  const leftQF = quarterFinals.slice(0, 2);
  const rightQF = quarterFinals.slice(2, 4);

  const leftSF = semiFinals[0];
  const rightSF = semiFinals[1];

  const cardW = 280;
  const cardH = 158;

  const x = {
    left32: 40,
    left16: 360,
    leftQF: 680,
    leftSF: 1000,
    final: 1320,
    rightSF: 1640,
    rightQF: 1960,
    right16: 2280,
    right32: 2600,
  };

  const y32 = [70, 250, 430, 610, 790, 970, 1150, 1330];
  const y16 = y32
  .map((y, i) => (i % 2 === 0 ? (y + y32[i + 1]) / 2 : null))
  .filter((v) => v !== null) as number[];
  const yQF = y16
  .map((y, i) => (i % 2 === 0 ? (y + y16[i + 1]) / 2 : null))
  .filter((v) => v !== null) as number[];
  const ySF = (yQF[0] + yQF[1]) / 2;
  const yFinal = ySF;
  const yThird = ySF + 220;

  const centerY = (top: number) => top + cardH / 2;

  const path = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) => {
    const midX = (fromX + toX) / 2;
    return `M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}`;
  };

  const connectors: string[] = [];

  for (let i = 0; i < 8; i++) {
    connectors.push(
      path(
        x.left32 + cardW,
        centerY(y32[i]),
        x.left16,
        centerY(y16[Math.floor(i / 2)])
      )
    );

    connectors.push(
      path(
        x.right32,
        centerY(y32[i]),
        x.right16 + cardW,
        centerY(y16[Math.floor(i / 2)])
      )
    );
  }

  for (let i = 0; i < 4; i++) {
    connectors.push(
      path(
        x.left16 + cardW,
        centerY(y16[i]),
        x.leftQF,
        centerY(yQF[Math.floor(i / 2)])
      )
    );

    connectors.push(
      path(
        x.right16,
        centerY(y16[i]),
        x.rightQF + cardW,
        centerY(yQF[Math.floor(i / 2)])
      )
    );
  }

  for (let i = 0; i < 2; i++) {
    connectors.push(
      path(x.leftQF + cardW, centerY(yQF[i]), x.leftSF, centerY(ySF))
    );

    connectors.push(
      path(x.rightQF, centerY(yQF[i]), x.rightSF + cardW, centerY(ySF))
    );
  }

  connectors.push(
    path(x.leftSF + cardW, centerY(ySF), x.final, centerY(yFinal))
  );

  connectors.push(
    path(x.rightSF, centerY(ySF), x.final + cardW, centerY(yFinal))
  );

  const renderMatch = (
    game: Game | undefined,
    left: number,
    top: number,
    align: "left" | "right" = "left"
  ) => (
    <div
      key={`${left}-${top}-${game?.id ?? "empty"}`}
      className="absolute z-10"
      style={{ left, top }}
    >
      <BracketMatch game={game} align={align} />
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-3xl bg-[#4b1020] p-4 shadow-sm sm:p-6">
      <div className="relative isolate h-[1550px] w-[3100px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#681828] via-[#4b1020] to-[#7a1b32] p-8">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-[-160px] right-40 h-[600px] w-[600px] rounded-full bg-black/20 blur-3xl" />
        </div>

        <svg
          className="pointer-events-none absolute inset-0 z-0"
          width="3100"
          height="1550"
        >
          {connectors.map((d, index) => (
            <path
              key={index}
              d={d}
              fill="none"
              stroke="rgba(255,255,255,0.32)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        {[
          ["16 avos", x.left32],
          ["Oitavos", x.left16],
          ["Quartos", x.leftQF],
          ["Meias", x.leftSF],
          ["Final", x.final],
          ["Meias", x.rightSF],
          ["Quartos", x.rightQF],
          ["Oitavos", x.right16],
          ["16 avos", x.right32],
        ].map(([label, left]) => (
          <div
            key={`${label}-${left}`}
            className="absolute top-8 text-center text-sm font-black uppercase tracking-wide text-white/80"
            style={{ left: Number(left), width: cardW }}
          >
            {label}
          </div>
        ))}

        {y32.map((top, i) => renderMatch(leftR32[i], x.left32, top))}
        {y16.map((top, i) => renderMatch(leftR16[i], x.left16, top))}
        {yQF.map((top, i) => renderMatch(leftQF[i], x.leftQF, top))}
        {renderMatch(leftSF, x.leftSF, ySF)}

        {renderMatch(finalGame, x.final, yFinal)}

        <div
          className="absolute z-0 text-center text-6xl font-black uppercase tracking-widest text-white/10"
          style={{ left: x.final - 20, top: 555, width: cardW + 40 }}
        >
          FINAL
        </div>

        <div
          className="absolute z-10 text-center text-xs font-black uppercase tracking-wide text-white/70"
          style={{ left: x.final, top: yThird - 28, width: cardW }}
        >
          3º lugar
        </div>

        {renderMatch(thirdPlace, x.final, yThird)}

        {renderMatch(rightSF, x.rightSF, ySF, "right")}
        {yQF.map((top, i) => renderMatch(rightQF[i], x.rightQF, top, "right"))}
        {y16.map((top, i) =>
          renderMatch(rightR16[i], x.right16, top, "right")
        )}
        {y32.map((top, i) =>
          renderMatch(rightR32[i], x.right32, top, "right")
        )}
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
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            Tabela classificativa
          </h1>
          <p className="text-sm text-gray-500 sm:text-base">
            Consulta a fase de grupos, os melhores terceiros ou acompanha o
            bracket dos playoffs.
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
                    {group === "THIRD_PLACES"
                      ? "Melhores 3ºs"
                      : `Grupo ${group}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {viewMode === "groups" ? (
          <GroupTable selectedGroup={selectedGroup} />
        ) : (
          <PlayoffBracket />
        )}
      </div>
    </main>
  );
}