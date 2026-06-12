"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import SiteHeader from "@/components/SiteHeader";
import { games } from "@/data/games";
import { listenToAuth } from "@/lib/auth";
import {
  getAllGameResults,
  saveGameResult,
  type GameResultDoc,
  type GameResultStatus,
} from "@/lib/game-results";
import { recalculateAllFantasyPoints } from "@/lib/recalculate-points";

const ADMIN_EMAIL = "zmrolapereira@gmail.com";

function getGameId(game: any) {
  return String(game.id);
}

function getGameLabel(game: any) {
  const id = getGameId(game);
  const home = game.homeTeam || "Casa";
  const away = game.awayTeam || "Fora";
  const phase = game.phase || game.round || "";

  return `#${id} · ${home} vs ${away}${phase ? ` · ${phase}` : ""}`;
}

function getGameDateText(game: any) {
  const date = game.date || game.gameDate || game.matchDate || "";
  const time = game.time || game.hour || game.kickoffTime || "";

  if (!date && !time) return "Sem data";
  return `${date}${time ? ` · ${time}` : ""}`;
}

function formatResultText(result?: GameResultDoc | null) {
  if (!result) return "Sem resultado guardado";

  if (result.status !== "FT") {
    return result.status;
  }

  return `${result.homeScore ?? "-"}-${result.awayScore ?? "-"}`;
}

export default function AdminResultadosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [results, setResults] = useState<GameResultDoc[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);

  const [selectedGameId, setSelectedGameId] = useState(String(games[0]?.id ?? ""));
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [status, setStatus] = useState<GameResultStatus>("SCHEDULED");
  const [penaltyWinner, setPenaltyWinner] = useState("");
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = listenToAuth((authUser) => {
      setUser(authUser);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const sortedGames = useMemo(() => {
    return [...games].sort((a: any, b: any) => Number(a.id) - Number(b.id));
  }, []);

  const resultsByGameId = useMemo(() => {
    const map = new Map<string, GameResultDoc>();

    results.forEach((result) => {
      map.set(String(result.gameId), result);
    });

    return map;
  }, [results]);

  const selectedGame = useMemo(() => {
    return sortedGames.find((game: any) => String(game.id) === selectedGameId);
  }, [sortedGames, selectedGameId]);

  const selectedResult = useMemo(() => {
    return resultsByGameId.get(selectedGameId) ?? null;
  }, [resultsByGameId, selectedGameId]);

  const loadResults = async () => {
    try {
      setLoadingResults(true);
      const data = await getAllGameResults();
      setResults(data);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar resultados.");
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadResults();
    }
  }, [isAdmin]);

  useEffect(() => {
    const result = resultsByGameId.get(selectedGameId);

    if (result) {
      setStatus(result.status || "SCHEDULED");
      setHomeScore(
        typeof result.homeScore === "number" ? String(result.homeScore) : ""
      );
      setAwayScore(
        typeof result.awayScore === "number" ? String(result.awayScore) : ""
      );
      setPenaltyWinner(result.penaltyWinner || "");
      setNote(result.note || "");
      return;
    }

    const game: any = selectedGame;

    setStatus(game?.status === "FT" ? "FT" : "SCHEDULED");
    setHomeScore(typeof game?.homeScore === "number" ? String(game.homeScore) : "");
    setAwayScore(typeof game?.awayScore === "number" ? String(game.awayScore) : "");
    setPenaltyWinner(game?.penaltyWinner || "");
    setNote("");
  }, [selectedGameId, selectedGame, resultsByGameId]);

  const handleSave = async (shouldRecalculate: boolean) => {
    if (!selectedGame) {
      alert("Escolhe um jogo.");
      return;
    }

    const home = homeScore === "" ? null : Number(homeScore);
    const away = awayScore === "" ? null : Number(awayScore);

    if (status === "FT") {
      if (!Number.isFinite(home) || !Number.isFinite(away)) {
        alert("Para marcar FT, tens de colocar golos da casa e de fora.");
        return;
      }
    }

    try {
      setSaving(true);
      setMessage("");

      await saveGameResult({
        gameId: selectedGameId,
        homeScore: home,
        awayScore: away,
        status,
        penaltyWinner,
        note,
      });

      await loadResults();

      if (shouldRecalculate) {
        setRecalculating(true);
        await recalculateAllFantasyPoints();
        setMessage("Resultado guardado e pontos recalculados com sucesso.");
      } else {
        setMessage("Resultado guardado com sucesso.");
      }
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Erro ao guardar resultado.");
    } finally {
      setSaving(false);
      setRecalculating(false);
    }
  };

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 text-gray-900">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-3xl bg-white p-6 shadow-sm">A carregar...</div>
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

      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            Admin
          </p>

          <h1 className="mt-2 text-3xl font-black text-gray-900">
            Atualizar resultados
          </h1>

          <p className="mt-3 text-sm leading-7 text-gray-600">
            Atualiza os resultados dos jogos diretamente pela Firebase. Depois
            podes recalcular os pontos sem mexer no VS Code.
          </p>

          {loadingResults ? (
            <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm font-bold text-gray-600">
              A carregar resultados...
            </div>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <label className="block text-sm font-black text-gray-700">
                  Jogo
                </label>

                <select
                  value={selectedGameId}
                  onChange={(event) => setSelectedGameId(event.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-900 outline-none"
                >
                  {sortedGames.map((game: any) => {
                    const result = resultsByGameId.get(String(game.id));

                    return (
                      <option key={game.id} value={String(game.id)}>
                        {getGameLabel(game)} · {formatResultText(result)}
                      </option>
                    );
                  })}
                </select>

                {selectedGame && (
                  <div className="mt-4 rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">
                      Jogo selecionado
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-gray-900">
                      {(selectedGame as any).homeTeam} vs{" "}
                      {(selectedGame as any).awayTeam}
                    </h2>

                    <p className="mt-2 text-sm font-bold text-gray-500">
                      {getGameDateText(selectedGame)}
                    </p>

                    <p className="mt-1 text-sm font-bold text-gray-500">
                      {(selectedGame as any).phase || ""}{" "}
                      {(selectedGame as any).round
                        ? `· ${(selectedGame as any).round}`
                        : ""}
                    </p>
                  </div>
                )}

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-black text-gray-700">
                      Estado
                    </label>

                    <select
                      value={status}
                      onChange={(event) =>
                        setStatus(event.target.value as GameResultStatus)
                      }
                      className="mt-2 h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-900 outline-none"
                    >
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="LIVE">LIVE</option>
                      <option value="FT">FT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-gray-700">
                      Golos casa
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={homeScore}
                      onChange={(event) => setHomeScore(event.target.value)}
                      disabled={status === "SCHEDULED"}
                      className="mt-2 h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-900 outline-none disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-black text-gray-700">
                      Golos fora
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={awayScore}
                      onChange={(event) => setAwayScore(event.target.value)}
                      disabled={status === "SCHEDULED"}
                      className="mt-2 h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-900 outline-none disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-black text-gray-700">
                    Vencedor nos penáltis/prolongamento
                  </label>

                  <select
                    value={penaltyWinner}
                    onChange={(event) => setPenaltyWinner(event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-900 outline-none"
                  >
                    <option value="">Sem vencedor extra</option>
                    {selectedGame && (
                      <>
                        <option value={(selectedGame as any).homeTeam}>
                          {(selectedGame as any).homeTeam}
                        </option>
                        <option value={(selectedGame as any).awayTeam}>
                          {(selectedGame as any).awayTeam}
                        </option>
                      </>
                    )}
                  </select>

                  <p className="mt-2 text-xs font-semibold text-gray-500">
                    Usa isto apenas em mata-mata quando o resultado aos 90 minutos
                    é empate, mas uma equipa passa.
                  </p>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-black text-gray-700">
                    Nota interna
                  </label>

                  <input
                    type="text"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ex.: Portugal ganhou nos penáltis"
                    className="mt-2 h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-900 outline-none"
                  />
                </div>

                {message && (
                  <div className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm font-black text-violet-800">
                    {message}
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={saving || recalculating}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-gray-900 px-5 text-sm font-black text-white disabled:opacity-60"
                  >
                    {saving && !recalculating
                      ? "A guardar..."
                      : "Guardar resultado"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={saving || recalculating}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-violet-700 px-5 text-sm font-black text-white disabled:opacity-60"
                  >
                    {recalculating
                      ? "A recalcular..."
                      : "Guardar e recalcular pontos"}
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-500">
                  Últimos resultados guardados
                </p>

                <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
                  {results.length === 0 ? (
                    <p className="text-sm font-semibold text-gray-500">
                      Ainda não há resultados guardados.
                    </p>
                  ) : (
                    [...results]
                      .sort((a, b) => Number(a.gameId) - Number(b.gameId))
                      .map((result) => {
                        const game: any = games.find(
                          (item: any) => String(item.id) === String(result.gameId)
                        );

                        return (
                          <div
                            key={result.gameId}
                            className="rounded-2xl bg-gray-50 p-4"
                          >
                            <p className="text-xs font-black text-violet-600">
                              Jogo #{result.gameId}
                            </p>

                            <p className="mt-1 text-sm font-black text-gray-900">
                              {game
                                ? `${game.homeTeam} vs ${game.awayTeam}`
                                : "Jogo não encontrado"}
                            </p>

                            <p className="mt-1 text-sm font-bold text-gray-600">
                              {result.status} · {result.homeScore ?? "-"}-
                              {result.awayScore ?? "-"}
                            </p>

                            {result.penaltyWinner && (
                              <p className="mt-1 text-xs font-bold text-gray-500">
                                Passou: {result.penaltyWinner}
                              </p>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}