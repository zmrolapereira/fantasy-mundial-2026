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
  gameId?: number;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
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

export default function MissingTeamPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [paidUsers, setPaidUsers] = useState<PaidUser[]>([]);
  const [entries, setEntries] = useState<FantasyEntry[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = listenToAuth((authUser) => {
      setUser(authUser);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const loadData = async () => {
      if (!user || !isAdmin) return;

      try {
        setLoadingData(true);
        setError("");

        const paidUsersQuery = query(
          collection(db, "users"),
          where("hasPaidAccess", "==", true)
        );

        const [usersSnap, entriesSnap, predictionsSnap] = await Promise.all([
          getDocs(paidUsersQuery),
          getDocs(collection(db, "fantasyEntries")),
          getDocs(collection(db, "predictions")),
        ]);

        const usersData = usersSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as PaidUser[];

        const entriesData = entriesSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as FantasyEntry[];

        const predictionsData = predictionsSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Prediction[];

        setPaidUsers(usersData);
        setEntries(entriesData);
        setPredictions(predictionsData);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Erro ao carregar dados.");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user, isAdmin]);

  const entryIds = useMemo(() => {
    return new Set(entries.map((entry) => entry.id));
  }, [entries]);

  const entriesMap = useMemo(() => {
    const map = new Map<string, FantasyEntry>();

    entries.forEach((entry) => {
      map.set(entry.id, entry);
    });

    return map;
  }, [entries]);

  const paidUsersWithoutTeam = useMemo(() => {
    return paidUsers
      .filter((paidUser) => !entryIds.has(paidUser.id))
      .sort((a, b) =>
        (a.displayName || a.email || "").localeCompare(
          b.displayName || b.email || ""
        )
      );
  }, [paidUsers, entryIds]);

  const paidUsersWithTeam = useMemo(() => {
    return paidUsers
      .filter((paidUser) => entryIds.has(paidUser.id))
      .sort((a, b) =>
        (a.displayName || a.email || "").localeCompare(
          b.displayName || b.email || ""
        )
      );
  }, [paidUsers, entryIds]);

  const gamesByRound = useMemo<[string, Game[]][]>(() => {
    const grouped: Record<string, Game[]> = {};

    games.forEach((game) => {
      const label =
        game.phase === "16 avos"
          ? "16 avos"
          : game.phase === "Meias-finais"
          ? "Meias-finais"
          : game.phase === "3º lugar" || game.phase === "Final"
          ? "Final e 3º Lugar"
          : game.round;

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

  const predictionKeys = useMemo(() => {
    const set = new Set<string>();

    predictions.forEach((prediction) => {
      if (!prediction.userId || prediction.gameId === undefined) return;
      set.add(`${prediction.userId}_${prediction.gameId}`);
    });

    return set;
  }, [predictions]);

  const missingPredictionsByRound = useMemo(() => {
    return gamesByRound.map(([roundLabel, roundGames]) => {
      const usersMissing = paidUsersWithTeam
        .map((paidUser) => {
          const missingGames = roundGames.filter(
            (game) => !predictionKeys.has(`${paidUser.id}_${game.id}`)
          );

          const entry = entriesMap.get(paidUser.id);

          return {
            ...paidUser,
            teamName: entry?.teamName || "",
            managerName: entry?.managerName || paidUser.displayName || "",
            missingGames,
            missingCount: missingGames.length,
            totalGames: roundGames.length,
          };
        })
        .filter((item) => item.missingCount > 0)
        .sort((a, b) =>
          (a.displayName || a.email || "").localeCompare(
            b.displayName || b.email || ""
          )
        );

      return {
        roundLabel,
        totalGames: roundGames.length,
        usersMissing,
      };
    });
  }, [gamesByRound, paidUsersWithTeam, predictionKeys, entriesMap]);

  const totalUsersMissingAnyPrediction = useMemo(() => {
    const ids = new Set<string>();

    missingPredictionsByRound.forEach((round) => {
      round.usersMissing.forEach((userItem) => {
        ids.add(userItem.id);
      });
    });

    return ids.size;
  }, [missingPredictionsByRound]);

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
      ["Jornada/Fase", "Nome", "Email", "Equipa", "Jogos em falta", "Total jogos"],
      ...missingPredictionsByRound.flatMap((round) =>
        round.usersMissing.map((paidUser) => [
          round.roundLabel,
          paidUser.displayName || paidUser.managerName || "",
          paidUser.email || "",
          paidUser.teamName || "",
          String(paidUser.missingCount),
          String(paidUser.totalGames),
        ])
      ),
    ];

    downloadCsv(rows, "paid-users-missing-predictions.csv");
  };

  const downloadCsv = (rows: string[][], filename: string) => {
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
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
            Esta página compara automaticamente utilizadores pagos, equipas
            criadas e predictions submetidas por jornada ou fase.
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
              {totalUsersMissingAnyPrediction}
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

          {loadingData ? (
            <p className="text-gray-500">A carregar dados...</p>
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
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                Predictions em falta por jornada/fase
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Mostra users pagos que já fizeram equipa, mas que ainda não
                preencheram todos os jogos de cada jornada ou fase.
              </p>
            </div>

            <button
              type="button"
              onClick={exportMissingPredictionsCsv}
              disabled={totalUsersMissingAnyPrediction === 0}
              className="rounded-2xl bg-violet-900 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Exportar CSV
            </button>
          </div>

          {loadingData ? (
            <p className="text-gray-500">A carregar dados...</p>
          ) : (
            <div className="space-y-5">
              {missingPredictionsByRound.map((round) => (
                <div
                  key={round.roundLabel}
                  className="rounded-3xl border border-gray-200 bg-gray-50 p-5"
                >
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-gray-900">
                        {round.roundLabel}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {round.totalGames} jogos nesta etapa
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        round.usersMissing.length === 0
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {round.usersMissing.length === 0
                        ? "Tudo preenchido"
                        : `${round.usersMissing.length} em falta`}
                    </span>
                  </div>

                  {round.usersMissing.length === 0 ? (
                    <div className="rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-800">
                      Todos os users pagos com equipa já preencheram esta etapa.
                    </div>
                  ) : (
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
                          {round.usersMissing.map((paidUser, index) => (
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
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}