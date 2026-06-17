"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import SiteHeader from "@/components/SiteHeader";
import { listenToAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { players } from "@/data/players";

const ADMIN_EMAIL = "zmrolapereira@gmail.com";

type PickVoter = {
  userId?: string;
  teamName: string;
  managerName?: string;
  selectedTeamPoints?: number;
};

type CountItem = {
  name: string;
  team?: string;
  count: number;
  pct: number;
  goals?: number;
  assists?: number;
  points?: number;
  voters?: PickVoter[];
};

type DashboardDoc = {
  totalTeams: number;
  topScorers: CountItem[];
  topAssisters: CountItem[];
  champions: CountItem[];
};

type FoundValue = {
  key: string;
  value: unknown;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function findPlayerById(value: unknown) {
  const id = String(value ?? "").trim();

  if (!id) return null;

  return players.find((player: any) => String(player.id) === id) ?? null;
}

function findPlayerByName(value: unknown) {
  const name = normalizeText(value).toLowerCase();

  if (!name) return null;

  return (
    players.find((player: any) => {
      return String(player.name ?? "").toLowerCase() === name;
    }) ?? null
  );
}

function getValueByPath(object: any, path: string) {
  const parts = path.split(".");
  let current = object;

  for (const part of parts) {
    if (current === undefined || current === null) return null;
    current = current[part];
  }

  if (current === undefined || current === null || current === "") {
    return null;
  }

  return current;
}

function getFirstExistingPath(entry: any, paths: string[]): FoundValue | null {
  for (const path of paths) {
    const value = getValueByPath(entry, path);

    if (value !== null) {
      return {
        key: path,
        value,
      };
    }
  }

  return null;
}

function findDeepValue(
  object: any,
  matcher: (key: string, value: unknown) => boolean,
  path = "",
  depth = 0,
): FoundValue | null {
  if (!object || typeof object !== "object") return null;
  if (depth > 5) return null;

  for (const [key, value] of Object.entries(object)) {
    const fullPath = path ? `${path}.${key}` : key;

    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      matcher(key, value)
    ) {
      return {
        key: fullPath,
        value,
      };
    }

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !String(key).toLowerCase().includes("created") &&
      !String(key).toLowerCase().includes("updated")
    ) {
      const found = findDeepValue(value, matcher, fullPath, depth + 1);

      if (found) return found;
    }
  }

  return null;
}

function getPlayerLabel(value: unknown) {
  if (!value) return null;

  if (typeof value === "object") {
    const objectValue = value as any;

    const id =
      objectValue.id ||
      objectValue.playerId ||
      objectValue.value ||
      objectValue.playerID;

    const playerFromId = findPlayerById(id);

    if (playerFromId) {
      return {
        playerId: String((playerFromId as any).id ?? id),
        name: normalizeText((playerFromId as any).name),
        team: normalizeText((playerFromId as any).team),
      };
    }

    const name =
      objectValue.name ||
      objectValue.playerName ||
      objectValue.label ||
      objectValue.fullName;

    if (name) {
      return {
        name: normalizeText(name),
        team: normalizeText(objectValue.team || objectValue.country || ""),
      };
    }
  }

  const playerFromId = findPlayerById(value);

  if (playerFromId) {
    return {
      playerId: String((playerFromId as any).id ?? value),
      name: normalizeText((playerFromId as any).name),
      team: normalizeText((playerFromId as any).team),
    };
  }

  const playerFromName = findPlayerByName(value);

  if (playerFromName) {
    return {
      playerId: String((playerFromName as any).id ?? ""),
      name: normalizeText((playerFromName as any).name),
      team: normalizeText((playerFromName as any).team),
    };
  }

  const text = normalizeText(value);

  if (!text) return null;

  return {
    name: text,
    team: "",
  };
}

function getChampionLabel(value: unknown) {
  if (!value) return null;

  if (typeof value === "object") {
    const objectValue = value as any;

    const teamName =
      objectValue.name ||
      objectValue.team ||
      objectValue.teamName ||
      objectValue.country ||
      objectValue.label ||
      objectValue.value;

    if (teamName) {
      return {
        name: normalizeText(teamName),
        team: "",
      };
    }
  }

  const text = normalizeText(value);

  if (!text) return null;

  return {
    name: text,
    team: "",
  };
}

type CounterItem = {
  playerId?: string;
  name: string;
  team?: string;
  count: number;
  voters: PickVoter[];
  points?: number;
};

type PlayerStatsItem = {
  goals: number;
  assists: number;
};

function getSelectedTeamPoints(entry: any) {
  const value =
    entry.selectedTeamPoints ??
    entry.championPoints ??
    entry.selectedTeamChampionPoints ??
    entry.teamPickPoints ??
    entry.picks?.selectedTeamPoints ??
    entry.specialPicks?.selectedTeamPoints ??
    0;

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getEntryVoter(entry: any): PickVoter {
  return {
    userId: String(entry.userId || entry.id || ""),
    teamName: normalizeText(
      entry.teamName ||
        entry.fantasyTeamName ||
        entry.name ||
        "Equipa sem nome",
    ),
    managerName: normalizeText(
      entry.managerName || entry.manager || entry.userName || "",
    ),
    selectedTeamPoints: getSelectedTeamPoints(entry),
  };
}

function addToCounter(
  map: Map<string, CounterItem>,
  item: { playerId?: string; name: string; team?: string; points?: number } | null,
  voter: PickVoter,
) {
  if (!item?.name) return;

  const key = `${item.name}|${item.team || ""}`;
  const existing = map.get(key);

  if (existing) {
    existing.count += 1;
    existing.voters.push(voter);

    if (typeof item.points === "number") {
      existing.points = Math.max(Number(existing.points ?? 0), item.points);
    }
  } else {
    map.set(key, {
      playerId: item.playerId || "",
      name: item.name,
      team: item.team || "",
      count: 1,
      voters: [voter],
      points: typeof item.points === "number" ? item.points : undefined,
    });
  }
}

function getStatsForCounterItem(
  item: CounterItem,
  statsByPlayerId: Map<string, PlayerStatsItem>,
  statsByPlayerName: Map<string, PlayerStatsItem>,
) {
  if (item.playerId && statsByPlayerId.has(item.playerId)) {
    return statsByPlayerId.get(item.playerId) ?? { goals: 0, assists: 0 };
  }

  return (
    statsByPlayerName.get(normalizeKey(item.name)) ?? { goals: 0, assists: 0 }
  );
}

function mapToSortedArray(
  map: Map<string, CounterItem>,
  totalTeams: number,
  statsByPlayerId = new Map<string, PlayerStatsItem>(),
  statsByPlayerName = new Map<string, PlayerStatsItem>(),
): CountItem[] {
  return Array.from(map.values())
    .map((item) => {
      const stats = getStatsForCounterItem(
        item,
        statsByPlayerId,
        statsByPlayerName,
      );

      return {
        name: item.name,
        team: item.team || "",
        count: item.count,
        voters: item.voters.sort((a, b) =>
          a.teamName.localeCompare(b.teamName, "pt-PT"),
        ),
        goals: stats.goals,
        assists: stats.assists,
        points: Number(item.points ?? 0),
        pct: totalTeams > 0 ? Math.round((item.count / totalTeams) * 100) : 0,
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
}

function getTopScorer(entry: any) {
  const direct = getFirstExistingPath(entry, [
    "topScorer",
    "topScorerId",
    "topScorerPlayer",
    "topScorerPlayerId",
    "selectedTopScorer",
    "selectedTopScorerId",
    "selectedScorer",
    "selectedScorerId",
    "scorer",
    "scorerId",
    "bestScorer",
    "bestScorerId",
    "goldenBoot",
    "goldenBootId",
    "marcador",
    "marcadorId",
    "melhorMarcador",
    "melhorMarcadorId",
    "apostaMarcador",
    "apostaMarcadorId",
    "specialPicks.topScorer",
    "specialPicks.topScorerId",
    "specialPicks.scorer",
    "specialPicks.scorerId",
    "specialPicks.marcador",
    "specialPicks.marcadorId",
    "bets.topScorer",
    "bets.topScorerId",
    "bets.scorer",
    "bets.scorerId",
    "bets.marcador",
    "bets.marcadorId",
    "picks.topScorer",
    "picks.topScorerId",
    "picks.scorer",
    "picks.scorerId",
    "picks.marcador",
    "picks.marcadorId",
  ]);

  if (direct) return getPlayerLabel(direct.value);

  const deep = findDeepValue(entry, (key) => {
    const k = normalizeKey(key);

    return (
      (k.includes("marcador") ||
        k.includes("scorer") ||
        k.includes("goalscorer") ||
        k.includes("goldenboot")) &&
      !k.includes("assist") &&
      !k.includes("prediction") &&
      !k.includes("points")
    );
  });

  return getPlayerLabel(deep?.value);
}

function getTopAssister(entry: any) {
  const direct = getFirstExistingPath(entry, [
    "topAssister",
    "topAssisterId",
    "topAssist",
    "topAssistId",
    "topAssistant",
    "topAssistantId",
    "topAssistantPlayer",
    "topAssistantPlayerId",
    "selectedTopAssister",
    "selectedTopAssisterId",
    "selectedTopAssistant",
    "selectedTopAssistantId",
    "selectedAssistant",
    "selectedAssistantId",
    "assistant",
    "assistantId",
    "assist",
    "assistId",
    "bestAssistant",
    "bestAssistantId",
    "assistente",
    "assistenteId",
    "melhorAssistente",
    "melhorAssistenteId",
    "apostaAssistente",
    "apostaAssistenteId",
    "specialPicks.topAssister",
    "specialPicks.topAssisterId",
    "specialPicks.assister",
    "specialPicks.assisterId",
    "specialPicks.assistant",
    "specialPicks.assistantId",
    "specialPicks.assistente",
    "specialPicks.assistenteId",
    "bets.topAssister",
    "bets.topAssisterId",
    "bets.assister",
    "bets.assisterId",
    "bets.assistant",
    "bets.assistantId",
    "bets.assistente",
    "bets.assistenteId",
    "picks.topAssister",
    "picks.topAssisterId",
    "picks.assister",
    "picks.assisterId",
    "picks.assistant",
    "picks.assistantId",
    "picks.assistente",
    "picks.assistenteId",
  ]);

  if (direct) return getPlayerLabel(direct.value);

  const deep = findDeepValue(entry, (key) => {
    const k = normalizeKey(key);

    return (
      (k.includes("assistente") ||
        k.includes("assister") ||
        k.includes("assistant") ||
        k.includes("assist")) &&
      !k.includes("prediction") &&
      !k.includes("points")
    );
  });

  return getPlayerLabel(deep?.value);
}

function getChampion(entry: any) {
  const direct = getFirstExistingPath(entry, [
    "champion",
    "championTeam",
    "selectedChampion",
    "selectedChampionTeam",
    "selectedWinner",
    "winner",
    "winnerTeam",
    "worldChampion",
    "worldChampionTeam",
    "selectedTeamChampion",
    "selectedTeam",
    "campeao",
    "campeão",
    "campeaoTeam",
    "campeãoTeam",
    "seleçãoCampeã",
    "selecaoCampea",
    "apostaCampeao",
    "apostaCampeão",
    "specialPicks.champion",
    "specialPicks.championTeam",
    "specialPicks.winner",
    "specialPicks.winnerTeam",
    "specialPicks.campeao",
    "specialPicks.campeão",
    "bets.champion",
    "bets.championTeam",
    "bets.winner",
    "bets.winnerTeam",
    "bets.campeao",
    "bets.campeão",
    "picks.champion",
    "picks.championTeam",
    "picks.winner",
    "picks.winnerTeam",
    "picks.campeao",
    "picks.campeão",
  ]);

  if (direct) return getChampionLabel(direct.value);

  const deep = findDeepValue(entry, (key) => {
    const k = normalizeKey(key);

    return (
      (k.includes("champion") ||
        k.includes("winner") ||
        k.includes("campeao") ||
        k.includes("campea")) &&
      !k.includes("points") &&
      !k.includes("prediction")
    );
  });

  return getChampionLabel(deep?.value);
}

function getDebugKeys(entry: any) {
  return Object.keys(entry || {}).sort();
}

async function generatePickDashboard(): Promise<DashboardDoc> {
  const snapshot = await getDocs(collection(db, "fantasyEntries"));

  const entries = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  const totalTeams = entries.length;

  const playerStatsSnapshot = await getDocs(
    collection(db, "playerTournamentStats"),
  );

  const statsByPlayerId = new Map<string, PlayerStatsItem>();
  const statsByPlayerName = new Map<string, PlayerStatsItem>();

  playerStatsSnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data() as any;
    const playerId = String(data.playerId || data.id || docSnap.id || "");
    const playerName = normalizeText(data.playerName || data.name || "");
    const stats = {
      goals: Number(data.goals || 0),
      assists: Number(data.assists || 0),
    };

    if (playerId) statsByPlayerId.set(playerId, stats);
    if (playerName) statsByPlayerName.set(normalizeKey(playerName), stats);
  });

  const scorersMap = new Map<string, CounterItem>();

  const assistersMap = new Map<string, CounterItem>();

  const championsMap = new Map<string, CounterItem>();

  let missingScorer = 0;
  let missingAssister = 0;
  let missingChampion = 0;

  entries.forEach((entry: any) => {
    const scorer = getTopScorer(entry);
    const assister = getTopAssister(entry);
    const champion = getChampion(entry);
    const voter = getEntryVoter(entry);

    if (!scorer) missingScorer++;
    if (!assister) missingAssister++;
    if (!champion) missingChampion++;

    addToCounter(scorersMap, scorer, voter);
    addToCounter(assistersMap, assister, voter);
    addToCounter(
      championsMap,
      champion
        ? {
            ...champion,
            points: getSelectedTeamPoints(entry),
          }
        : null,
      voter,
    );
  });

  const dashboard: DashboardDoc = {
    totalTeams,
    topScorers: mapToSortedArray(
      scorersMap,
      totalTeams,
      statsByPlayerId,
      statsByPlayerName,
    ),
    topAssisters: mapToSortedArray(
      assistersMap,
      totalTeams,
      statsByPlayerId,
      statsByPlayerName,
    ),
    champions: mapToSortedArray(championsMap, totalTeams),
  };

  await setDoc(doc(db, "publicPickDashboard", "main"), {
    ...dashboard,
    debug: {
      missingScorer,
      missingAssister,
      missingChampion,
      firstEntryKeys: entries[0] ? getDebugKeys(entries[0]) : [],
    },
    updatedAt: serverTimestamp(),
  });

  return dashboard;
}

export default function GeneratePickDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [dashboard, setDashboard] = useState<DashboardDoc | null>(null);

  useEffect(() => {
    const unsubscribe = listenToAuth((authUser) => {
      setUser(authUser);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setMessage("");

      const result = await generatePickDashboard();

      setDashboard(result);
      setMessage("Dashboard dos picks gerado com sucesso.");
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Erro ao gerar dashboard dos picks.");
    } finally {
      setGenerating(false);
    }
  };

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 text-gray-900">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            A carregar...
          </div>
        </div>
      </main>
    );
  }

  if (!user || !isAdmin) {
    return (
      <main className="min-h-screen bg-gray-100 text-gray-900">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            Esta página é apenas para admin.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            Admin
          </p>

          <h1 className="mt-2 text-3xl font-black text-gray-900">
            Gerar dashboard dos picks
          </h1>

          <p className="mt-3 text-sm leading-7 text-gray-600">
            Este botão lê as fantasyEntries uma vez, conta os marcadores,
            assistentes e seleções campeãs escolhidas, e guarda o resumo em
            publicPickDashboard/main. A página pública de tendências lê só esse
            documento.
          </p>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-violet-900 px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? "A gerar..." : "Gerar / atualizar dashboard"}
          </button>

          {message && (
            <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm font-bold text-gray-700">
              {message}
            </div>
          )}

          {dashboard && (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <PreviewCard title="Equipas" value={dashboard.totalTeams} />
              <PreviewCard
                title="Marcadores"
                value={dashboard.topScorers.length}
              />
              <PreviewCard
                title="Assistentes"
                value={dashboard.topAssisters.length}
              />
              <PreviewCard
                title="Campeões"
                value={dashboard.champions.length}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PreviewCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
        {title}
      </p>
      <p className="mt-2 text-3xl font-black text-gray-900">{value}</p>
    </div>
  );
}
