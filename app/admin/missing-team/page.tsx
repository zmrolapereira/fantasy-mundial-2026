"use client";

import { useEffect, useMemo, useState } from "react";
import { User } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import SiteHeader from "@/components/SiteHeader";
import { listenToAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { games, type Game } from "@/data/games";

type PaidUser = {
  id: string;
  uid?: string;
  displayName?: string;
  email?: string;
  hasPaidAccess?: boolean;
  paymentStatus?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type FantasyEntry = {
  id: string;
  userId?: string;
  teamName?: string;
  managerName?: string;
};

type Prediction = {
  id: string;
  userId?: string;
  gameId?: string | number;
  predictedHomeScore?: string | number;
  predictedAwayScore?: string | number;
};

type MissingPredictionUser = PaidUser & {
  teamName: string;
  managerName: string;
  missingGames: Game[];
  missingCount: number;
  totalGames: number;
};

const ADMIN_EMAIL = "zmrolapereira@gmail.com";

const roundOrder = [
  "Jornada 1",
  "Jornada 2",
  "Jornada 3",
  "16 avos",
  "Oitavos",
  "Quartos",
  "Meias-finais",
  "Final e 3º Lugar",
];

function getRoundLabel(game: Game) {
  return game.phase === "16 avos"
    ? "16 avos"
    : game.phase === "Oitavos"
      ? "Oitavos"
      : game.phase === "Quartos"
        ? "Quartos"
        : game.phase === "Meias-finais"
          ? "Meias-finais"
          : game.phase === "3º lugar" || game.phase === "Final"
            ? "Final e 3º Lugar"
            : game.round;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

function hasValidPrediction(prediction: Prediction) {
  return (
    prediction.userId &&
    prediction.gameId !== undefined &&
    prediction.predictedHomeScore !== undefined &&
    prediction.predictedHomeScore !== "" &&
    prediction.predictedAwayScore !== undefined &&
    prediction.predictedAwayScore !== ""
  );
}

export default function MissingTeamPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingBaseData, setLoadingBaseData] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  const [paidUsers, setPaidUsers] = useState<PaidUser[]>([]);
  const [entries, setEntries] = useState<FantasyEntry[]>([]);
  const [roundPredictions, setRoundPredictions] = useState<Prediction[]>([]);

  const [selectedRoundLabel, setSelectedRoundLabel] = useState("Jornada 1");
  const [loadedRoundLabel, setLoadedRoundLabel] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = listenToAuth((authUser) => {
      setUser(authUser);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const gamesByRound = useMemo<[string, Game[]][]>(() => {
    const grouped: Record<string, Game[]> = {};

    games.forEach((game) => {
      const label = getRoundLabel(game);

      if (!grouped[label]) {
        grouped[label] = [];
      }

      grouped[label].push(game);
    });

    return (Object.entries(grouped) as [string, Game[]][]).sort(([a], [b]) => {
      const ia = roundOrder.indexOf(a);
      const ib = roundOrder.indexOf(b);

      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, []);

  const selectedRoundGames = useMemo(() => {
    return (
      gamesByRound.find(([label]) => label === selectedRoundLabel)?.[1] || []
    );
  }, [gamesByRound, selectedRoundLabel]);

  useEffect(() => {
    if (!gamesByRound.some(([label]) => label === selectedRoundLabel)) {
      setSelectedRoundLabel(gamesByRound[0]?.[0] || "");
    }
  }, [gamesByRound, selectedRoundLabel]);

  useEffect(() => {
    const loadBaseData = async () => {
      if (!user || !isAdmin) return;

      try {
        setLoadingBaseData(true);
        setError("");

        const paidUsersQuery = query(
          collection(db, "users"),
          where("hasPaidAccess", "==", true),
        );

        const [usersSnap, entriesSnap] = await Promise.all([
          getDocs(paidUsersQuery),
          getDocs(collection(db, "fantasyEntries")),
        ]);

        const usersData = usersSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as PaidUser[];

        const entriesData = entriesSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as FantasyEntry[];

        setPaidUsers(usersData);
        setEntries(entriesData);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Erro ao carregar dados.");
      } finally {
        setLoadingBaseData(false);
      }
    };

    loadBaseData();
  }, [user, isAdmin]);

  const loadPredictionsForSelectedRound = async () => {
    if (!selectedRoundLabel || selectedRoundGames.length === 0) {
      setRoundPredictions([]);
      setLoadedRoundLabel(selectedRoundLabel);
      return;
    }

    try {
      setLoadingPredictions(true);
      setError("");

      const numericGameIds = selectedRoundGames.map((game) => Number(game.id));
      const stringGameIds = selectedRoundGames.map((game) => String(game.id));

      const predictionDocs = new Map<string, Prediction>();

      const numericChunks = chunkArray(numericGameIds, 30);
      const stringChunks = chunkArray(stringGameIds, 30);

      for (const gameIdChunk of numericChunks) {
        const predictionsQuery = query(
          collection(db, "predictions"),
          where("gameId", "in", gameIdChunk),
        );

        const predictionsSnap = await getDocs(predictionsQuery);

        predictionsSnap.docs.forEach((docSnap) => {
          predictionDocs.set(docSnap.id, {
            id: docSnap.id,
            ...docSnap.data(),
          } as Prediction);
        });
      }

      for (const gameIdChunk of stringChunks) {
        const predictionsQuery = query(
          collection(db, "predictions"),
          where("gameId", "in", gameIdChunk),
        );

        const predictionsSnap = await getDocs(predictionsQuery);

        predictionsSnap.docs.forEach((docSnap) => {
          predictionDocs.set(docSnap.id, {
            id: docSnap.id,
            ...docSnap.data(),
          } as Prediction);
        });
      }

      setRoundPredictions(Array.from(predictionDocs.values()));
      setLoadedRoundLabel(selectedRoundLabel);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "Erro ao carregar predictions desta jornada/fase.",
      );
    } finally {
      setLoadingPredictions(false);
    }
  };

  const entryIds = useMemo(() => {
    return new Set(entries.map((entry) => entry.id));
  }, [entries]);

  const entriesMap = useMemo(() => {
    const map = new Map<string, FantasyEntry>();

    entries.forEach((entry) => {
      map.set(entry.id, entry);
      if (entry.userId) map.set(entry.userId, entry);
    });

    return map;
  }, [entries]);

  const paidUsersWithoutTeam = useMemo(() => {
    return paidUsers
      .filter((paidUser) => !entryIds.has(paidUser.id))
      .sort((a, b) =>
        (a.displayName || a.email || "").localeCompare(
          b.displayName || b.email || "",
        ),
      );
  }, [paidUsers, entryIds]);

  const paidUsersWithTeam = useMemo(() => {
    return paidUsers
      .filter((paidUser) => entryIds.has(paidUser.id))
      .sort((a, b) =>
        (a.displayName || a.email || "").localeCompare(
          b.displayName || b.email || "",
        ),
      );
  }, [paidUsers, entryIds]);

  const predictionKeys = useMemo(() => {
    const set = new Set<string>();

    roundPredictions.forEach((prediction) => {
      if (!hasValidPrediction(prediction)) return;
      set.add(`${prediction.userId}_${prediction.gameId}`);
      set.add(`${prediction.userId}_${Number(prediction.gameId)}`);
      set.add(`${prediction.userId}_${String(prediction.gameId)}`);
    });

    return set;
  }, [roundPredictions]);

  const selectedRoundMissingUsers = useMemo<MissingPredictionUser[]>(() => {
    if (loadedRoundLabel !== selectedRoundLabel) return [];

    return paidUsersWithTeam
      .map((paidUser) => {
        const missingGames = selectedRoundGames.filter(
          (game) => !predictionKeys.has(`${paidUser.id}_${game.id}`),
        );

        const entry = entriesMap.get(paidUser.id);

        return {
          ...paidUser,
          teamName: entry?.teamName || "",
          managerName: entry?.managerName || paidUser.displayName || "",
          missingGames,
          missingCount: missingGames.length,
          totalGames: selectedRoundGames.length,
        };
      })
      .filter((item) => item.missingCount > 0)
      .sort((a, b) =>
        (a.displayName || a.email || "").localeCompare(
          b.displayName || b.email || "",
        ),
      );
  }, [
    paidUsersWithTeam,
    selectedRoundGames,
    predictionKeys,
    entriesMap,
    loadedRoundLabel,
    selectedRoundLabel,
  ]);

  const exportMissingTeamsCsv = () => {
    const rows = [
      ["Nome", "Email", "UID", "Estado"],
      ...paidUsersWithoutTeam.map((paidUser) => [
        paidUser.displayName || "",
        paidUser.email || "",
        paidUser.id,
        paidUser.paymentStatus || "",
      ]),
    ];

    downloadCsv(rows, "paid-users-without-team.csv");
  };

  const exportMissingPredictionsCsv = () => {
    const rows = [
      [
        "Jornada/Fase",
        "Nome",
        "Email",
        "Equipa",
        "Jogos em falta",
        "Total jogos",
      ],
      ...selectedRoundMissingUsers.map((paidUser) => [
        selectedRoundLabel,
        paidUser.displayName || paidUser.managerName || "",
        paidUser.email || "",
        paidUser.teamName || "",
        String(paidUser.missingCount),
        String(paidUser.totalGames),
      ]),
    ];

    downloadCsv(rows, `missing-predictions-${selectedRoundLabel}.csv`);
  };

  const downloadCsv = (rows: string[][], filename: string) => {
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  };

  const hasLoadedSelectedRound = loadedRoundLabel === selectedRoundLabel;

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 text-gray-900">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            A carregar...
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-100 text-gray-900">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            Tens de iniciar sessão para ver esta página.
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gray-100 text-gray-900">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-6 rounded-[34px] bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">
            Admin
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
            Controlo de equipas e predictions
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85 sm:text-base">
            Esta página carrega primeiro só users pagos e equipas. As
            predictions só são lidas quando escolhes uma jornada/fase e carregas
            no botão.
          </p>
        </section>

        {error && (
          <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
            {error}
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Users com acesso pago
            </p>
            <p className="mt-2 text-4xl font-black text-blue-600">
              {paidUsers.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Já fizeram equipa
            </p>
            <p className="mt-2 text-4xl font-black text-green-600">
              {paidUsersWithTeam.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Falta fazer equipa
            </p>
            <p className="mt-2 text-4xl font-black text-red-600">
              {paidUsersWithoutTeam.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Faltam predictions
            </p>
            <p className="mt-2 text-4xl font-black text-orange-500">
              {hasLoadedSelectedRound ? selectedRoundMissingUsers.length : "—"}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                Pagaram mas ainda não fizeram equipa
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Pessoas com pagamento aprovado, mas sem documento em
                fantasyEntries.
              </p>
            </div>

            <button
              type="button"
              onClick={exportMissingTeamsCsv}
              disabled={paidUsersWithoutTeam.length === 0}
              className="rounded-2xl bg-violet-900 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Exportar CSV
            </button>
          </div>

          {loadingBaseData ? (
            <p className="text-gray-500">A carregar users e equipas...</p>
          ) : paidUsersWithoutTeam.length === 0 ? (
            <div className="rounded-3xl bg-green-50 p-5 text-green-800">
              Todos os users com acesso pago já têm equipa criada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-4">#</th>
                    <th className="px-4">Nome</th>
                    <th className="px-4">Email</th>
                    <th className="px-4">Estado</th>
                    <th className="px-4">UID</th>
                  </tr>
                </thead>

                <tbody>
                  {paidUsersWithoutTeam.map((paidUser, index) => (
                    <tr key={paidUser.id} className="bg-gray-50">
                      <td className="rounded-l-2xl px-4 py-4 font-bold">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 font-bold text-gray-900">
                        {paidUser.displayName || "Sem nome"}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {paidUser.email || "Sem email"}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          {paidUser.paymentStatus || "approved"}
                        </span>
                      </td>
                      <td className="rounded-r-2xl px-4 py-4 font-mono text-xs text-gray-500">
                        {paidUser.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                Predictions em falta por jornada/fase
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Escolhe uma etapa e só depois carrega as predictions dessa
                etapa. Assim a página não lê o torneio todo.
              </p>
            </div>

            <button
              type="button"
              onClick={exportMissingPredictionsCsv}
              disabled={
                !hasLoadedSelectedRound ||
                selectedRoundMissingUsers.length === 0
              }
              className="rounded-2xl bg-violet-900 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Exportar CSV
            </button>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            <div>
              <label className="block text-sm font-bold text-gray-700">
                Jornada / fase
              </label>
              <select
                value={selectedRoundLabel}
                onChange={(event) => {
                  setSelectedRoundLabel(event.target.value);
                  setRoundPredictions([]);
                  setLoadedRoundLabel("");
                }}
                className="mt-1.5 h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-900 outline-none focus:border-violet-500"
              >
                {gamesByRound.map(([roundLabel, roundGames]) => (
                  <option key={roundLabel} value={roundLabel}>
                    {roundLabel} • {roundGames.length} jogos
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={loadPredictionsForSelectedRound}
              disabled={
                loadingPredictions ||
                loadingBaseData ||
                selectedRoundGames.length === 0
              }
              className="h-12 rounded-2xl bg-violet-900 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingPredictions ? "A carregar..." : "Ver quem falta"}
            </button>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-600">
              {selectedRoundGames.length} jogos nesta etapa
            </div>
          </div>

          {!hasLoadedSelectedRound && !loadingPredictions ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm font-semibold text-gray-500">
              Escolhe uma jornada/fase e clica em “Ver quem falta”. Ainda não
              foram lidas predictions.
            </div>
          ) : loadingPredictions ? (
            <p className="text-gray-500">
              A carregar predictions desta etapa...
            </p>
          ) : selectedRoundMissingUsers.length === 0 ? (
            <div className="rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-800">
              Todos os users pagos com equipa já preencheram{" "}
              {selectedRoundLabel}.
            </div>
          ) : (
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900">
                    {selectedRoundLabel}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedRoundGames.length} jogos nesta etapa
                  </p>
                </div>

                <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">
                  {selectedRoundMissingUsers.length} em falta
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-sm text-gray-500">
                      <th className="px-4">#</th>
                      <th className="px-4">Nome</th>
                      <th className="px-4">Email</th>
                      <th className="px-4">Equipa</th>
                      <th className="px-4">Jogos em falta</th>
                      <th className="px-4">UID</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedRoundMissingUsers.map((paidUser, index) => (
                      <tr key={paidUser.id} className="bg-white">
                        <td className="rounded-l-2xl px-4 py-4 font-bold">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 font-bold text-gray-900">
                          {paidUser.displayName ||
                            paidUser.managerName ||
                            "Sem nome"}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {paidUser.email || "Sem email"}
                        </td>
                        <td className="px-4 py-4 font-semibold text-gray-700">
                          {paidUser.teamName || "Sem equipa"}
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                            {paidUser.missingCount}/{paidUser.totalGames}
                          </span>
                        </td>
                        <td className="rounded-r-2xl px-4 py-4 font-mono text-xs text-gray-500">
                          {paidUser.id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
