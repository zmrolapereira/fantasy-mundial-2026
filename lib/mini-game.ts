import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const MINI_GAME_PRICE = 5;
export const MINI_GAME_ADMIN_EMAIL = "zmrolapereira@gmail.com";

export type MiniGameAccessStatus = "pending" | "approved" | "rejected";

export type MiniGameAccessRequest = {
  userId: string;
  email: string;
  displayName?: string;
  teamName: string;
  managerName: string;
  status: MiniGameAccessStatus;
  paid?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type MiniGameStageKey =
  | "oitavos"
  | "quartos"
  | "meias"
  | "final"
  | "campeao";

export type MiniGamePicks = Record<MiniGameStageKey, string[]>;

export type MiniGameStagePoints = Record<MiniGameStageKey, number>;

export type MiniGameConfig = {
  isOpen: boolean;
  isLocked: boolean;
  qualifiedTeams: string[];

  actualOitavos: string[];
  actualQuartos: string[];
  actualMeias: string[];
  actualFinal: string[];
  actualCampeao: string[];

  updatedAt?: unknown;
};

export type MiniGameEntry = {
  userId: string;
  email: string;
  teamName: string;
  managerName: string;
  picks: MiniGamePicks;
  totalPoints: number;
  stagePoints: MiniGameStagePoints;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const MINI_GAME_STAGE_META: Record<
  MiniGameStageKey,
  { label: string; description: string; max: number }
> = {
  oitavos: {
    label: "Passam aos oitavos",
    description: "Escolhe as 16 seleções que achas que passam dos 16 avos.",
    max: 16,
  },
  quartos: {
    label: "Passam aos quartos",
    description: "Escolhe as 8 seleções que achas que chegam aos quartos.",
    max: 8,
  },
  meias: {
    label: "Passam às meias",
    description: "Escolhe as 4 seleções que achas que chegam às meias-finais.",
    max: 4,
  },
  final: {
    label: "Chegam à final",
    description: "Escolhe as 2 seleções que achas que chegam à final.",
    max: 2,
  },
  campeao: {
    label: "Campeão",
    description: "Escolhe a seleção que achas que ganha o torneio.",
    max: 1,
  },
};

export const MINI_GAME_STAGE_ORDER: MiniGameStageKey[] = [
  "oitavos",
  "quartos",
  "meias",
  "final",
  "campeao",
];

export const EMPTY_MINI_GAME_PICKS: MiniGamePicks = {
  oitavos: [],
  quartos: [],
  meias: [],
  final: [],
  campeao: [],
};

export const EMPTY_MINI_GAME_STAGE_POINTS: MiniGameStagePoints = {
  oitavos: 0,
  quartos: 0,
  meias: 0,
  final: 0,
  campeao: 0,
};

export const DEFAULT_MINI_GAME_CONFIG: MiniGameConfig = {
  isOpen: false,
  isLocked: false,
  qualifiedTeams: [],
  actualOitavos: [],
  actualQuartos: [],
  actualMeias: [],
  actualFinal: [],
  actualCampeao: [],
};

function normalize(value?: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function cleanTeams(teams: string[]) {
  return Array.from(
    new Set(
      teams
        .map((team) => String(team || "").trim())
        .filter(Boolean)
    )
  );
}

function normalizeConfig(data?: Partial<MiniGameConfig> | null): MiniGameConfig {
  return {
    isOpen: Boolean(data?.isOpen ?? false),
    isLocked: Boolean(data?.isLocked ?? false),
    qualifiedTeams: cleanTeams(data?.qualifiedTeams ?? []),
    actualOitavos: cleanTeams(data?.actualOitavos ?? []),
    actualQuartos: cleanTeams(data?.actualQuartos ?? []),
    actualMeias: cleanTeams(data?.actualMeias ?? []),
    actualFinal: cleanTeams(data?.actualFinal ?? []),
    actualCampeao: cleanTeams(data?.actualCampeao ?? []),
    updatedAt: data?.updatedAt,
  };
}

function normalizePicks(data?: Partial<MiniGamePicks> | null): MiniGamePicks {
  return {
    oitavos: cleanTeams(data?.oitavos ?? []),
    quartos: cleanTeams(data?.quartos ?? []),
    meias: cleanTeams(data?.meias ?? []),
    final: cleanTeams(data?.final ?? []),
    campeao: cleanTeams(data?.campeao ?? []),
  };
}

export function countCorrectTeams(picks: string[], actual: string[]) {
  const actualSet = new Set(actual.map(normalize));
  return picks.filter((team) => actualSet.has(normalize(team))).length;
}

export function calculateMiniGamePoints(
  picks: MiniGamePicks,
  config: MiniGameConfig
) {
  const stagePoints: MiniGameStagePoints = {
    oitavos: countCorrectTeams(picks.oitavos, config.actualOitavos),
    quartos: countCorrectTeams(picks.quartos, config.actualQuartos),
    meias: countCorrectTeams(picks.meias, config.actualMeias),
    final: countCorrectTeams(picks.final, config.actualFinal),
    campeao: countCorrectTeams(picks.campeao, config.actualCampeao),
  };

  const totalPoints = MINI_GAME_STAGE_ORDER.reduce(
    (sum, stage) => sum + stagePoints[stage],
    0
  );

  return { totalPoints, stagePoints };
}

export function validateMiniGamePicks(picks: MiniGamePicks) {
  for (const stage of MINI_GAME_STAGE_ORDER) {
    const selected = picks[stage] ?? [];
    const max = MINI_GAME_STAGE_META[stage].max;

    if (selected.length !== max) {
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

export function subscribeMiniGameConfig(
  callback: (config: MiniGameConfig) => void
) {
  const ref = doc(db, "miniGame", "config");

  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(DEFAULT_MINI_GAME_CONFIG);
      return;
    }

    callback(normalizeConfig(snap.data() as MiniGameConfig));
  });
}

export async function getMiniGameConfig() {
  const ref = doc(db, "miniGame", "config");
  const snap = await getDoc(ref);

  if (!snap.exists()) return DEFAULT_MINI_GAME_CONFIG;

  return normalizeConfig(snap.data() as MiniGameConfig);
}

export async function saveMiniGameConfig(config: MiniGameConfig) {
  const ref = doc(db, "miniGame", "config");

  await setDoc(
    ref,
    {
      ...normalizeConfig(config),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeMiniGameAccessRequest(
  userId: string,
  callback: (request: MiniGameAccessRequest | null) => void
) {
  const ref = doc(db, "miniGameAccessRequests", userId);

  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }

    callback(snap.data() as MiniGameAccessRequest);
  });
}

export async function requestMiniGameAccess(params: {
  userId: string;
  email: string;
  displayName?: string | null;
  teamName: string;
  managerName: string;
}) {
  const ref = doc(db, "miniGameAccessRequests", params.userId);
  const existing = await getDoc(ref);

  await setDoc(
    ref,
    {
      userId: params.userId,
      email: params.email,
      displayName: params.displayName ?? "",
      teamName: params.teamName.trim(),
      managerName: params.managerName.trim(),
      status: existing.exists()
        ? (existing.data().status ?? "pending")
        : "pending",
      paid: existing.exists() ? Boolean(existing.data().paid ?? false) : false,
      createdAt: existing.exists()
        ? existing.data().createdAt
        : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeMiniGameAccessRequests(
  callback: (requests: MiniGameAccessRequest[]) => void
) {
  return onSnapshot(collection(db, "miniGameAccessRequests"), (snapshot) => {
    const requests = snapshot.docs.map(
      (docSnap) => docSnap.data() as MiniGameAccessRequest
    );

    callback(
      requests.sort((a, b) => {
        if (a.status !== b.status) {
          if (a.status === "pending") return -1;
          if (b.status === "pending") return 1;
        }

        return (a.teamName || "").localeCompare(b.teamName || "");
      })
    );
  });
}

export async function updateMiniGameAccessRequest(
  userId: string,
  data: Partial<Pick<MiniGameAccessRequest, "status" | "paid">>
) {
  const ref = doc(db, "miniGameAccessRequests", userId);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeMiniGameEntry(
  userId: string,
  callback: (entry: MiniGameEntry | null) => void
) {
  const ref = doc(db, "miniGameEntries", userId);

  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }

    const data = snap.data() as MiniGameEntry;

    callback({
      ...data,
      picks: normalizePicks(data.picks),
      totalPoints: Number(data.totalPoints ?? 0),
      stagePoints: {
        ...EMPTY_MINI_GAME_STAGE_POINTS,
        ...(data.stagePoints ?? {}),
      },
    });
  });
}

export function subscribeMiniGameEntries(
  callback: (entries: MiniGameEntry[]) => void
) {
  return onSnapshot(collection(db, "miniGameEntries"), (snapshot) => {
    const entries = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as MiniGameEntry;

      return {
        ...data,
        picks: normalizePicks(data.picks),
        totalPoints: Number(data.totalPoints ?? 0),
        stagePoints: {
          ...EMPTY_MINI_GAME_STAGE_POINTS,
          ...(data.stagePoints ?? {}),
        },
      };
    });

    let currentRank = 1;
    const sorted = entries.sort((a, b) => {
      const pointsDiff = Number(b.totalPoints ?? 0) - Number(a.totalPoints ?? 0);
      if (pointsDiff !== 0) return pointsDiff;
      return (a.teamName || "").localeCompare(b.teamName || "");
    });

    callback(
      sorted.map((entry, index) => {
        if (
          index > 0 &&
          Number(entry.totalPoints ?? 0) !== Number(sorted[index - 1].totalPoints ?? 0)
        ) {
          currentRank = index + 1;
        }

        return {
          ...entry,
          rank: currentRank,
        } as MiniGameEntry & { rank: number };
      })
    );
  });
}

export async function saveMiniGameEntry(params: {
  userId: string;
  email: string;
  teamName: string;
  managerName: string;
  picks: MiniGamePicks;
  config: MiniGameConfig;
}) {
  const validation = validateMiniGamePicks(params.picks);

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const { totalPoints, stagePoints } = calculateMiniGamePoints(
    params.picks,
    params.config
  );

  const ref = doc(db, "miniGameEntries", params.userId);
  const existing = await getDoc(ref);

  await setDoc(
    ref,
    {
      userId: params.userId,
      email: params.email,
      teamName: params.teamName,
      managerName: params.managerName,
      picks: normalizePicks(params.picks),
      totalPoints,
      stagePoints,
      createdAt: existing.exists()
        ? existing.data().createdAt
        : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function recalculateMiniGameEntries() {
  const config = await getMiniGameConfig();
  const snap = await getDocs(collection(db, "miniGameEntries"));

  await Promise.all(
    snap.docs.map(async (docSnap) => {
      const data = docSnap.data() as MiniGameEntry;
      const picks = normalizePicks(data.picks);
      const { totalPoints, stagePoints } = calculateMiniGamePoints(
        picks,
        config
      );

      await updateDoc(doc(db, "miniGameEntries", docSnap.id), {
        totalPoints,
        stagePoints,
        updatedAt: serverTimestamp(),
      });
    })
  );
}
