"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import SiteHeader from "@/components/SiteHeader";
import { db } from "@/lib/firebase";
import {
  subscribeToFantasyEntries,
  type FantasyEntry,
} from "@/lib/fantasy-entry";

type SnapshotEntry = {
  userId: string;
  teamName?: string;
  managerName?: string;
  totalPointsAtThatMoment?: number;
  realTotalPointsAtThatMoment?: number;
  totalPoints?: number;
  points?: number;
  rank?: number;
};

type SnapshotDoc = {
  id: string;
  stageId?: string;
  label?: string;
  entries?: SnapshotEntry[];
  createdAt?: unknown;
};

type RankedSnapshotEntry = {
  userId: string;
  teamName: string;
  managerName: string;
  totalPoints: number;
  rank: number;
};

type ProcessedSnapshot = {
  id: string;
  stageId: string;
  label: string;
  shortLabel: string;
  order: number;
  entries: RankedSnapshotEntry[];
};

type TeamHistoryRow = {
  userId: string;
  teamName: string;
  managerName: string;
  phaseRanks: Record<string, number>;
  phasePoints: Record<string, number>;
  currentRank: number;
  currentPoints: number;
  bestRank: number;
  worstRank: number;
  totalChange: number | null;
  lastChange: number | null;
};

type MoversRow = TeamHistoryRow & {
  move: number;
};

type FilterMode = "top10" | "top20" | "movers" | "all";

const STAGE_ORDER = [
  "jornada 1",
  "jornada 2",
  "jornada 3",
  "16 avos",
  "oitavos",
  "quartos",
  "meias-finais",
  "meias finais",
  "final e 3º lugar",
  "final e 3o lugar",
  "final",
];

function normalize(value?: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getStageOrderIndex(stageId?: string, label?: string) {
  const value = normalize(stageId || label);
  const exactIndex = STAGE_ORDER.findIndex((item) => normalize(item) === value);

  if (exactIndex >= 0) return exactIndex;

  const jornadaMatch = value.match(/jornada\s*(\d+)/);
  if (jornadaMatch) return Number(jornadaMatch[1]) - 1;

  return 999;
}

function getShortLabel(stageId?: string, label?: string) {
  const value = normalize(label || stageId);

  if (value === "jornada 1") return "J1";
  if (value === "jornada 2") return "J2";
  if (value === "jornada 3") return "J3";
  if (value === "16 avos") return "16A";
  if (value === "oitavos") return "OIT";
  if (value === "quartos") return "QF";
  if (value === "meias-finais" || value === "meias finais") return "MF";
  if (value === "final e 3º lugar" || value === "final e 3o lugar") return "F/3º";
  if (value === "final") return "FIN";

  return String(label || stageId || "Etapa").slice(0, 8);
}

function getFullLabel(stageId?: string, label?: string) {
  if (label && label.trim()) return label;

  const value = normalize(stageId);

  if (value === "jornada 1") return "Jornada 1";
  if (value === "jornada 2") return "Jornada 2";
  if (value === "jornada 3") return "Jornada 3";
  if (value === "16 avos") return "16 avos";
  if (value === "oitavos") return "Oitavos";
  if (value === "quartos") return "Quartos";
  if (value === "meias-finais" || value === "meias finais") return "Meias-finais";
  if (value === "final e 3º lugar" || value === "final e 3o lugar") return "Final e 3º lugar";
  if (value === "final") return "Final";

  return stageId || "Etapa";
}

function getTimestampMs(value: unknown) {
  if (!value) return 0;

  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return new Date(value).getTime();

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    return Number((value as { seconds: number }).seconds) * 1000;
  }

  return 0;
}

function getEntryPoints(entry: SnapshotEntry) {
  return Number(
    entry.realTotalPointsAtThatMoment ??
      entry.totalPointsAtThatMoment ??
      entry.totalPoints ??
      entry.points ??
      0
  );
}

function getLiveTotal(entry: FantasyEntry) {
  const categoryTotal =
    Number(entry.predictionPoints ?? 0) +
    Number(entry.topScorerPoints ?? 0) +
    Number(entry.topAssistPoints ?? 0) +
    Number(entry.selectedTeamPoints ?? 0);

  return Math.max(Number(entry.totalPoints ?? 0), categoryTotal);
}

function buildCompetitionRanking<T extends { totalPoints: number; teamName: string }>(
  rows: T[]
) {
  const sorted = [...rows].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.teamName.localeCompare(b.teamName, "pt");
  });

  let currentRank = 1;

  return sorted.map((row, index) => {
    if (index > 0) {
      const previous = sorted[index - 1];
      if (row.totalPoints !== previous.totalPoints) {
        currentRank = index + 1;
      }
    }

    return {
      ...row,
      rank: currentRank,
    };
  });
}

function getDelta(previous?: number, current?: number) {
  if (!previous || !current) return null;
  return previous - current;
}

function formatMovement(value: number | null) {
  if (value === null) return "—";
  if (value > 0) return `↑ ${value}`;
  if (value < 0) return `↓ ${Math.abs(value)}`;
  return "—";
}

function getMovementClass(value: number | null) {
  if (value === null || value === 0) {
    return "bg-gray-100 text-gray-600 ring-gray-200";
  }

  if (value > 0) {
    return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }

  return "bg-rose-100 text-rose-700 ring-rose-200";
}

function getCurrentRankMap(entries: FantasyEntry[]) {
  const normalized = entries.map((entry) => ({
    userId: entry.userId,
    teamName: entry.teamName ?? "Sem nome",
    managerName: entry.managerName ?? "",
    totalPoints: getLiveTotal(entry),
  }));

  const ranked = buildCompetitionRanking(normalized);

  return new Map(
    ranked.map((entry) => [
      entry.userId,
      {
        rank: entry.rank,
        points: entry.totalPoints,
        teamName: entry.teamName,
        managerName: entry.managerName,
      },
    ])
  );
}

function RankPill({ value }: { value: number | null }) {
  return (
    <span
      className={`inline-flex min-w-[54px] items-center justify-center rounded-full px-3 py-1 text-xs font-black ring-1 ${getMovementClass(
        value
      )}`}
    >
      {formatMovement(value)}
    </span>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/15 px-5 py-4 text-white backdrop-blur">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black leading-none tracking-tight">
        {value}
      </p>
      {helper && (
        <p className="mt-2 text-xs font-semibold leading-5 text-white/75">
          {helper}
        </p>
      )}
    </div>
  );
}

function MoversPanel({
  title,
  rows,
  type,
  onSelect,
}: {
  title: string;
  rows: MoversRow[];
  type: "up" | "down";
  onSelect: (userId: string) => void;
}) {
  return (
    <div className="rounded-[26px] border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-[10px] font-black uppercase tracking-[0.2em] ${
              type === "up" ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {type === "up" ? "Subidas" : "Descidas"}
          </p>
          <h3 className="mt-1 text-lg font-black text-gray-900">{title}</h3>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center text-sm font-semibold text-gray-500">
            Ainda não há variações suficientes.
          </div>
        ) : (
          rows.map((row, index) => (
            <button
              key={row.userId}
              type="button"
              onClick={() => onSelect(row.userId)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-gray-700 ring-1 ring-gray-200">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-gray-900">
                    {row.teamName}
                  </p>
                  <p className="truncate text-xs font-semibold text-gray-500">
                    {row.managerName}
                  </p>
                </div>
              </div>

              <RankPill value={row.move} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function EvolutionChart({
  snapshots,
  selectedTeamId,
  visibleTeamIds,
  historyMap,
}: {
  snapshots: ProcessedSnapshot[];
  selectedTeamId: string | null;
  visibleTeamIds: string[];
  historyMap: Map<string, TeamHistoryRow>;
}) {
  if (!snapshots.length || !selectedTeamId) return null;

  const selected = historyMap.get(selectedTeamId);
  if (!selected) return null;

  const totalTeams = Math.max(
    1,
    ...Array.from(historyMap.values()).map((team) => team.currentRank || 1)
  );

  const chartWidth = 1040;
  const chartHeight = 390;
  const leftPad = 58;
  const rightPad = 150;
  const topPad = 28;
  const bottomPad = 48;

  const plotWidth = chartWidth - leftPad - rightPad;
  const plotHeight = chartHeight - topPad - bottomPad;

  const stageGap =
    snapshots.length > 1 ? plotWidth / (snapshots.length - 1) : plotWidth / 2;

  const getX = (index: number) =>
    snapshots.length > 1 ? leftPad + index * stageGap : leftPad + plotWidth / 2;

  const getY = (rank: number) => {
    if (totalTeams <= 1) return topPad + plotHeight / 2;
    return topPad + ((rank - 1) / (totalTeams - 1)) * plotHeight;
  };

  const chartTeams = visibleTeamIds
    .map((id) => historyMap.get(id))
    .filter(Boolean) as TeamHistoryRow[];

  const selectedPoints = snapshots
    .map((snapshot, index) => {
      const rank = selected.phaseRanks[snapshot.stageId];
      if (!rank) return null;
      return {
        x: getX(index),
        y: getY(rank),
        rank,
        label: snapshot.shortLabel,
        points: selected.phasePoints[snapshot.stageId] ?? 0,
      };
    })
    .filter(Boolean) as {
    x: number;
    y: number;
    rank: number;
    label: string;
    points: number;
  }[];

  return (
    <div className="rounded-[30px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">
            Gráfico limpo
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-gray-900">
            Trajetória da equipa selecionada
          </h3>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-gray-500">
            Para não ficar confuso, a linha azul é a equipa selecionada. As outras linhas são apenas contexto.
          </p>
        </div>

        <div className="rounded-2xl bg-blue-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
            Selecionada
          </p>
          <p className="mt-1 max-w-[260px] truncate text-sm font-black text-gray-900">
            {selected.teamName}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="min-w-[980px]">
          <defs>
            <linearGradient id="selectedLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>

          {[1, Math.ceil(totalTeams / 4), Math.ceil(totalTeams / 2), Math.ceil(totalTeams * 0.75), totalTeams].map(
            (rankValue) => {
              const y = getY(rankValue);

              return (
                <g key={rankValue}>
                  <line
                    x1={leftPad}
                    y1={y}
                    x2={chartWidth - rightPad}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeDasharray="4 7"
                  />
                  <text
                    x={10}
                    y={y + 5}
                    fontSize="13"
                    fill="#6b7280"
                    fontWeight="800"
                  >
                    #{rankValue}
                  </text>
                </g>
              );
            }
          )}

          {snapshots.map((snapshot, index) => {
            const x = getX(index);

            return (
              <g key={snapshot.stageId}>
                <line
                  x1={x}
                  y1={topPad}
                  x2={x}
                  y2={chartHeight - bottomPad}
                  stroke="#f1f5f9"
                />
                <text
                  x={x}
                  y={chartHeight - 18}
                  textAnchor="middle"
                  fontSize="13"
                  fill="#64748b"
                  fontWeight="900"
                >
                  {snapshot.shortLabel}
                </text>
              </g>
            );
          })}

          {chartTeams
            .filter((team) => team.userId !== selectedTeamId)
            .map((team) => {
              const path = snapshots
                .map((snapshot, index) => {
                  const rank = team.phaseRanks[snapshot.stageId];
                  if (!rank) return null;
                  return `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(rank)}`;
                })
                .filter(Boolean)
                .join(" ");

              return (
                <path
                  key={team.userId}
                  d={path}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth={2}
                  strokeOpacity={0.65}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

          {selectedPoints.length > 0 && (
            <path
              d={selectedPoints
                .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
                .join(" ")}
              fill="none"
              stroke="url(#selectedLine)"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {chartTeams
            .filter((team) => team.userId !== selectedTeamId)
            .map((team) =>
              snapshots.map((snapshot, index) => {
                const rank = team.phaseRanks[snapshot.stageId];
                if (!rank) return null;

                return (
                  <circle
                    key={`${team.userId}-${snapshot.stageId}`}
                    cx={getX(index)}
                    cy={getY(rank)}
                    r={3.7}
                    fill="white"
                    stroke="#94a3b8"
                    strokeWidth={1.8}
                    opacity={0.85}
                  />
                );
              })
            )}

          {selectedPoints.map((point) => (
            <g key={`${point.label}-${point.rank}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r={7.5}
                fill="white"
                stroke="#2563eb"
                strokeWidth={4}
              />
              <text
                x={point.x}
                y={point.y - 14}
                textAnchor="middle"
                fontSize="12"
                fill="#1e3a8a"
                fontWeight="900"
              >
                #{point.rank}
              </text>
            </g>
          ))}

          {selectedPoints.length > 0 && (
            <g>
              <text
                x={chartWidth - rightPad + 18}
                y={selectedPoints[selectedPoints.length - 1].y + 5}
                fontSize="15"
                fill="#2563eb"
                fontWeight="900"
              >
                {selected.teamName}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

export default function EvolucaoPage() {
  const [snapshots, setSnapshots] = useState<ProcessedSnapshot[]>([]);
  const [entries, setEntries] = useState<FantasyEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("top10");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToFantasyEntries((items) => {
      setEntries(items);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadSnapshots() {
      try {
        setLoading(true);

        const snap = await getDocs(query(collection(db, "leaderboardSnapshots")));

        const docs: SnapshotDoc[] = snap.docs.map((docItem) => ({
          id: docItem.id,
          ...(docItem.data() as Omit<SnapshotDoc, "id">),
        }));

        const byStageId = new Map<string, SnapshotDoc>();

        docs.forEach((docItem) => {
          const stageId = normalize(docItem.stageId || docItem.id);
          const existing = byStageId.get(stageId);

          if (!existing) {
            byStageId.set(stageId, docItem);
            return;
          }

          const existingTime = getTimestampMs(existing.createdAt);
          const nextTime = getTimestampMs(docItem.createdAt);

          if (nextTime >= existingTime) {
            byStageId.set(stageId, docItem);
          }
        });

        const processed = Array.from(byStageId.values())
          .sort((a, b) => {
            const aIndex = getStageOrderIndex(a.stageId, a.label);
            const bIndex = getStageOrderIndex(b.stageId, b.label);

            if (aIndex !== bIndex) return aIndex - bIndex;

            return getTimestampMs(a.createdAt) - getTimestampMs(b.createdAt);
          })
          .map((snapshot) => {
            const rawEntries = Array.isArray(snapshot.entries)
              ? snapshot.entries
              : [];

            const normalizedEntries = rawEntries.map((entry) => ({
              userId: entry.userId,
              teamName: entry.teamName || "Sem nome",
              managerName: entry.managerName || "",
              totalPoints: getEntryPoints(entry),
            }));

            const ranked = buildCompetitionRanking(normalizedEntries);

            const stageId = snapshot.stageId || snapshot.id;
            const label = getFullLabel(snapshot.stageId || snapshot.id, snapshot.label);

            return {
              id: snapshot.id,
              stageId,
              label,
              shortLabel: getShortLabel(stageId, label),
              order: getStageOrderIndex(stageId, label),
              entries: ranked,
            };
          });

        setSnapshots(processed);
      } catch (error) {
        console.error(error);
        setSnapshots([]);
      } finally {
        setLoading(false);
      }
    }

    loadSnapshots();
  }, []);

  const currentRankMap = useMemo(() => getCurrentRankMap(entries), [entries]);

  const rows = useMemo(() => {
    const historyMap = new Map<string, TeamHistoryRow>();

    snapshots.forEach((snapshot) => {
      snapshot.entries.forEach((entry) => {
        const existing = historyMap.get(entry.userId);

        if (!existing) {
          historyMap.set(entry.userId, {
            userId: entry.userId,
            teamName: entry.teamName,
            managerName: entry.managerName,
            phaseRanks: {
              [snapshot.stageId]: entry.rank,
            },
            phasePoints: {
              [snapshot.stageId]: entry.totalPoints,
            },
            currentRank: currentRankMap.get(entry.userId)?.rank ?? 999,
            currentPoints: currentRankMap.get(entry.userId)?.points ?? entry.totalPoints,
            bestRank: entry.rank,
            worstRank: entry.rank,
            totalChange: null,
            lastChange: null,
          });
        } else {
          existing.phaseRanks[snapshot.stageId] = entry.rank;
          existing.phasePoints[snapshot.stageId] = entry.totalPoints;
        }
      });
    });

    for (const [userId, current] of currentRankMap.entries()) {
      const existing = historyMap.get(userId);

      if (existing) {
        existing.currentRank = current.rank;
        existing.currentPoints = current.points;
        existing.teamName = current.teamName || existing.teamName;
        existing.managerName = current.managerName || existing.managerName;
      } else {
        historyMap.set(userId, {
          userId,
          teamName: current.teamName || "Sem nome",
          managerName: current.managerName || "",
          phaseRanks: {},
          phasePoints: {},
          currentRank: current.rank,
          currentPoints: current.points,
          bestRank: current.rank,
          worstRank: current.rank,
          totalChange: null,
          lastChange: null,
        });
      }
    }

    const enriched = Array.from(historyMap.values()).map((row) => {
      const ranks = snapshots
        .map((snapshot) => row.phaseRanks[snapshot.stageId])
        .filter(Boolean) as number[];

      const firstRank = ranks[0];
      const lastSnapshotRank = ranks[ranks.length - 1];

      const previousSnapshot =
        snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;
      const lastSnapshot = snapshots.length >= 1 ? snapshots[snapshots.length - 1] : null;

      const previousRank = previousSnapshot
        ? row.phaseRanks[previousSnapshot.stageId]
        : undefined;
      const latestRank = lastSnapshot ? row.phaseRanks[lastSnapshot.stageId] : undefined;

      return {
        ...row,
        bestRank: ranks.length ? Math.min(...ranks, row.currentRank) : row.currentRank,
        worstRank: ranks.length ? Math.max(...ranks, row.currentRank) : row.currentRank,
        totalChange:
          firstRank && lastSnapshotRank ? getDelta(firstRank, lastSnapshotRank) : null,
        lastChange:
          previousRank && latestRank ? getDelta(previousRank, latestRank) : null,
      };
    });

    return enriched.sort((a, b) => {
      if (a.currentRank !== b.currentRank) return a.currentRank - b.currentRank;
      return a.teamName.localeCompare(b.teamName, "pt");
    });
  }, [snapshots, currentRankMap]);

  useEffect(() => {
    if (!selectedTeamId && rows.length > 0) {
      setSelectedTeamId(rows[0].userId);
    }
  }, [rows, selectedTeamId]);

  const selectedTeam = useMemo(
    () => rows.find((row) => row.userId === selectedTeamId) ?? null,
    [rows, selectedTeamId]
  );

  const searchFilteredRows = useMemo(() => {
    const queryText = normalize(search);

    return rows.filter((row) => {
      if (!queryText) return true;

      return (
        normalize(row.teamName).includes(queryText) ||
        normalize(row.managerName).includes(queryText)
      );
    });
  }, [rows, search]);

  const topMoversUp = useMemo(() => {
    return rows
      .map((row) => ({
        ...row,
        move: row.lastChange ?? 0,
      }))
      .filter((row) => row.move > 0)
      .sort((a, b) => b.move - a.move)
      .slice(0, 5);
  }, [rows]);

  const topMoversDown = useMemo(() => {
    return rows
      .map((row) => ({
        ...row,
        move: row.lastChange ?? 0,
      }))
      .filter((row) => row.move < 0)
      .sort((a, b) => a.move - b.move)
      .slice(0, 5);
  }, [rows]);

  const visibleRows = useMemo(() => {
    if (filterMode === "all") return searchFilteredRows;
    if (filterMode === "top10") {
      return searchFilteredRows.filter((row) => row.currentRank <= 10);
    }
    if (filterMode === "top20") {
      return searchFilteredRows.filter((row) => row.currentRank <= 20);
    }

    const moverIds = new Set([
      ...topMoversUp.map((row) => row.userId),
      ...topMoversDown.map((row) => row.userId),
    ]);

    return searchFilteredRows.filter((row) => moverIds.has(row.userId));
  }, [searchFilteredRows, filterMode, topMoversUp, topMoversDown]);

  const visibleChartTeamIds = useMemo(() => {
    const ids = new Set<string>();

    // No gráfico queremos apenas:
    // 1) equipa selecionada
    // 2) top 3 atual
    if (selectedTeamId) ids.add(selectedTeamId);

    rows.slice(0, 3).forEach((row) => {
      ids.add(row.userId);
    });

    return Array.from(ids);
  }, [rows, selectedTeamId]);

  const lastSnapshot = snapshots[snapshots.length - 1];
  const previousSnapshot = snapshots[snapshots.length - 2];

  const selectedLastRank =
    selectedTeam && lastSnapshot
      ? selectedTeam.phaseRanks[lastSnapshot.stageId]
      : undefined;

  const selectedPreviousRank =
    selectedTeam && previousSnapshot
      ? selectedTeam.phaseRanks[previousSnapshot.stageId]
      : undefined;

  const selectedLastMovement =
    selectedPreviousRank && selectedLastRank
      ? getDelta(selectedPreviousRank, selectedLastRank)
      : null;

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-gray-900">
      <SiteHeader />

      <div className="mx-auto max-w-[1530px] px-4 pb-12 pt-6 sm:px-6">
        <section className="mb-6 overflow-hidden rounded-[34px] bg-gradient-to-r from-sky-400 via-blue-600 to-violet-700 p-5 shadow-lg sm:p-7">
          <div className="grid gap-7 xl:grid-cols-[1.35fr_0.9fr] xl:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-white/75">
                Fantasy Mundial 2026
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                Evolução do Ranking
              </h1>

              <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/90 sm:text-base">
                Acompanha como cada equipa sobe ou desce ao longo das jornadas e fases.
                A vista foi desenhada para ser limpa: foca uma equipa, compara por fase
                e vê os maiores movimentos recentes.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Snapshots" value={snapshots.length} helper="Fases guardadas" />
              <StatCard label="Equipas" value={rows.length} helper="No ranking atual" />
              <StatCard
                label="Última fase"
                value={lastSnapshot?.shortLabel ?? "—"}
                helper={lastSnapshot?.label ?? "Sem snapshot"}
              />
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
          <MoversPanel
            title="Maiores subidas na última fase"
            rows={topMoversUp}
            type="up"
            onSelect={setSelectedTeamId}
          />

          <MoversPanel
            title="Maiores quedas na última fase"
            rows={topMoversDown}
            type="down"
            onSelect={setSelectedTeamId}
          />
        </section>

        <section className="mb-6 rounded-[30px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex-1">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">
                Pesquisar equipa ou manager
              </label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ex.: Volta Fernando, Guilherme..."
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "top10", label: "Top 10" },
                { id: "top20", label: "Top 20" },
                { id: "movers", label: "Movers" },
                { id: "all", label: "Todas" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilterMode(item.id as FilterMode)}
                  className={
                    filterMode === item.id
                      ? "rounded-full bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm"
                      : "rounded-full bg-gray-100 px-5 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-200"
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {selectedTeam && (
          <section className="mb-6 rounded-[30px] border border-blue-200 bg-blue-50/80 p-4 shadow-sm sm:p-6">
            <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr] xl:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">
                  Equipa selecionada
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
                  {selectedTeam.teamName}
                </h2>
                <p className="mt-1 text-sm font-bold text-gray-500">
                  {selectedTeam.managerName}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white px-4 py-4 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                    Atual
                  </p>
                  <p className="mt-2 text-3xl font-black text-gray-950">
                    {selectedTeam.currentRank}º
                  </p>
                </div>

                <div className="rounded-2xl bg-white px-4 py-4 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                    Pontos
                  </p>
                  <p className="mt-2 text-3xl font-black text-gray-950">
                    {selectedTeam.currentPoints}
                  </p>
                </div>

                <div className="rounded-2xl bg-white px-4 py-4 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                    Melhor
                  </p>
                  <p className="mt-2 text-3xl font-black text-emerald-700">
                    {selectedTeam.bestRank}º
                  </p>
                </div>

                <div className="rounded-2xl bg-white px-4 py-4 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                    Última variação
                  </p>
                  <p
                    className={`mt-2 text-3xl font-black ${
                      selectedLastMovement && selectedLastMovement > 0
                        ? "text-emerald-700"
                        : selectedLastMovement && selectedLastMovement < 0
                        ? "text-rose-700"
                        : "text-gray-950"
                    }`}
                  >
                    {formatMovement(selectedLastMovement)}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <section className="rounded-[30px] border border-gray-200 bg-white p-10 text-center text-sm font-bold text-gray-500 shadow-sm">
            A carregar evolução...
          </section>
        ) : snapshots.length === 0 ? (
          <section className="rounded-[30px] border border-gray-200 bg-white p-10 text-center text-sm font-bold text-gray-500 shadow-sm">
            Ainda não existem snapshots guardados.
          </section>
        ) : (
          <>
            <section className="mb-6">
              <EvolutionChart
                snapshots={snapshots}
                selectedTeamId={selectedTeamId}
                visibleTeamIds={visibleChartTeamIds}
                historyMap={new Map(rows.map((row) => [row.userId, row]))}
              />
            </section>

            <section className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-5 sm:px-6">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">
                      Tabela detalhada
                    </p>
                    <h3 className="mt-1 text-2xl font-black text-gray-950">
                      Ranking por fase
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-gray-500">
                      Cada célula mostra posição nessa fase e variação face à fase anterior.
                    </p>
                  </div>

                  <div className="rounded-full bg-gray-100 px-4 py-2 text-xs font-black text-gray-600">
                    {visibleRows.length} equipa(s)
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] uppercase tracking-[0.22em] text-gray-500">
                      <th className="px-4 py-4 sm:px-6">Rank atual</th>
                      <th className="px-4 py-4">Equipa</th>
                      <th className="px-4 py-4">Manager</th>
                      <th className="px-4 py-4 text-center">Pontos</th>
                      <th className="px-4 py-4 text-center">Melhor</th>
                      <th className="px-4 py-4 text-center">Última</th>
                      {snapshots.map((snapshot) => (
                        <th
                          key={snapshot.stageId}
                          className="px-4 py-4 text-center"
                          title={snapshot.label}
                        >
                          {snapshot.shortLabel}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {visibleRows.map((row) => (
                      <tr
                        key={row.userId}
                        onClick={() => setSelectedTeamId(row.userId)}
                        className={`cursor-pointer border-b border-gray-100 transition hover:bg-blue-50/60 ${
                          selectedTeamId === row.userId ? "bg-blue-50" : "bg-white"
                        }`}
                      >
                        <td className="px-4 py-4 sm:px-6">
                          <span className="text-xl font-black text-gray-950">
                            {row.currentRank}º
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-black text-gray-950">
                            {row.teamName}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-gray-500">
                            {row.managerName}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-black text-gray-800">
                            {row.currentPoints}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-black text-emerald-700">
                            {row.bestRank}º
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <RankPill value={row.lastChange} />
                        </td>

                        {snapshots.map((snapshot, index) => {
                          const currentRank = row.phaseRanks[snapshot.stageId];
                          const previousRank =
                            index > 0
                              ? row.phaseRanks[snapshots[index - 1].stageId]
                              : undefined;
                          const movement = getDelta(previousRank, currentRank);

                          return (
                            <td
                              key={`${row.userId}-${snapshot.stageId}`}
                              className="px-4 py-4 text-center"
                            >
                              {currentRank ? (
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className="text-sm font-black text-gray-950">
                                    #{currentRank}
                                  </span>
                                  {index > 0 ? (
                                    <RankPill value={movement} />
                                  ) : (
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-black text-gray-500 ring-1 ring-gray-200">
                                      base
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm font-bold text-gray-300">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {visibleRows.length === 0 && (
                <div className="px-6 py-12 text-center text-sm font-bold text-gray-500">
                  Nenhuma equipa encontrada.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
