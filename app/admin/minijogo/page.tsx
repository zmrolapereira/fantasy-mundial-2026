"use client";

import { useEffect, useMemo, useState } from "react";
import { User } from "firebase/auth";
import Link from "next/link";
import { listenToAuth } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";
import {
  DEFAULT_MINI_GAME_CONFIG,
  MINI_GAME_ADMIN_EMAIL,
  MINI_GAME_PRICE,
  MINI_GAME_STAGE_META,
  MINI_GAME_STAGE_ORDER,
  MiniGameAccessRequest,
  MiniGameConfig,
  MiniGameEntry,
  recalculateMiniGameEntries,
  saveMiniGameConfig,
  subscribeMiniGameAccessRequests,
  subscribeMiniGameConfig,
  subscribeMiniGameEntries,
  updateMiniGameAccessRequest,
} from "@/lib/mini-game";

function parseLines(value: string) {
  return Array.from(
    new Set(
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
  );
}

function stringifyLines(value?: string[]) {
  return (value ?? []).join("\n");
}

export default function AdminMiniGamePage() {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<MiniGameConfig>(
    DEFAULT_MINI_GAME_CONFIG
  );
  const [requests, setRequests] = useState<MiniGameAccessRequest[]>([]);
  const [entries, setEntries] = useState<(MiniGameEntry & { rank?: number })[]>(
    []
  );

  const [qualifiedTeamsText, setQualifiedTeamsText] = useState("");
  const [actualTexts, setActualTexts] = useState({
    actualOitavos: "",
    actualQuartos: "",
    actualMeias: "",
    actualFinal: "",
    actualCampeao: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isAdmin = user?.email === MINI_GAME_ADMIN_EMAIL;

  useEffect(() => {
    const unsubscribe = listenToAuth(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribeConfig = subscribeMiniGameConfig((data) => {
      setConfig(data);
      setQualifiedTeamsText(stringifyLines(data.qualifiedTeams));
      setActualTexts({
        actualOitavos: stringifyLines(data.actualOitavos),
        actualQuartos: stringifyLines(data.actualQuartos),
        actualMeias: stringifyLines(data.actualMeias),
        actualFinal: stringifyLines(data.actualFinal),
        actualCampeao: stringifyLines(data.actualCampeao),
      });
    });

    const unsubscribeRequests = subscribeMiniGameAccessRequests(setRequests);
    const unsubscribeEntries = subscribeMiniGameEntries((data) =>
      setEntries(data as (MiniGameEntry & { rank?: number })[])
    );

    return () => {
      unsubscribeConfig();
      unsubscribeRequests();
      unsubscribeEntries();
    };
  }, [isAdmin]);

  const stats = useMemo(() => {
    const approved = requests.filter((request) => request.status === "approved");
    const paid = requests.filter((request) => request.paid);

    return {
      requests: requests.length,
      pending: requests.filter((request) => request.status === "pending").length,
      approved: approved.length,
      paid: paid.length,
      pot: paid.length * MINI_GAME_PRICE,
      entries: entries.length,
    };
  }, [requests, entries]);

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setMessage("");

      await saveMiniGameConfig({
        ...config,
        qualifiedTeams: parseLines(qualifiedTeamsText),
        actualOitavos: parseLines(actualTexts.actualOitavos),
        actualQuartos: parseLines(actualTexts.actualQuartos),
        actualMeias: parseLines(actualTexts.actualMeias),
        actualFinal: parseLines(actualTexts.actualFinal),
        actualCampeao: parseLines(actualTexts.actualCampeao),
      });

      setMessage("Configuração guardada.");
    } catch (error) {
      console.error(error);
      setMessage("Erro ao guardar configuração.");
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setSaving(true);
      setMessage("");

      await handleSaveConfig();
      await recalculateMiniGameEntries();

      setMessage("Resultados guardados e leaderboard recalculada.");
    } catch (error) {
      console.error(error);
      setMessage("Erro ao recalcular mini jogo.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-[#f4f6fb] text-gray-950">
        <SiteHeader />
        <div className="mx-auto max-w-4xl px-4 py-10 text-center">
          <h1 className="text-3xl font-black">Inicia sessão</h1>
          <p className="mt-2 text-sm font-semibold text-gray-500">
            Tens de iniciar sessão para entrar no admin do mini jogo.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-full bg-violet-600 px-6 py-3 text-sm font-black text-white"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#f4f6fb] text-gray-950">
        <SiteHeader />
        <div className="mx-auto max-w-4xl px-4 py-10 text-center">
          <h1 className="text-3xl font-black">Sem acesso</h1>
          <p className="mt-2 text-sm font-semibold text-gray-500">
            Esta página é apenas para o admin.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6fb] text-gray-950">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div
          className="rounded-[34px] p-6 text-white shadow-lg sm:p-8"
          style={{
            background:
              "linear-gradient(90deg, #101828 0%, #4f46e5 52%, #7c3aed 100%)",
          }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/75">
            Admin • Mini jogo
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Gestão da bracket final
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/85">
            Aprova acessos, confirma pagamentos, abre/fecha o jogo, define a bracket dos 16 avos e atualiza quem passou em cada ronda.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
              Pedidos
            </p>
            <p className="mt-2 text-3xl font-black">{stats.requests}</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
              Pendentes
            </p>
            <p className="mt-2 text-3xl font-black text-amber-600">
              {stats.pending}
            </p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
              Aprovados
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-600">
              {stats.approved}
            </p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
              Pagos
            </p>
            <p className="mt-2 text-3xl font-black">{stats.paid}</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
              Pote
            </p>
            <p className="mt-2 text-3xl font-black">{stats.pot}€</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
              Entradas
            </p>
            <p className="mt-2 text-3xl font-black">{stats.entries}</p>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">
            {message}
          </div>
        )}

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
                  Configuração
                </p>
                <h2 className="mt-1 text-2xl font-black">Estado do mini jogo</h2>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveConfig}
                className="rounded-full bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-60"
              >
                Guardar
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="text-sm font-black">Abrir submissões</span>
                <input
                  type="checkbox"
                  checked={config.isOpen}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      isOpen: event.target.checked,
                    }))
                  }
                  className="h-5 w-5"
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="text-sm font-black">Fechar picks</span>
                <input
                  type="checkbox"
                  checked={config.isLocked}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      isLocked: event.target.checked,
                    }))
                  }
                  className="h-5 w-5"
                />
              </label>
            </div>

            <div className="mt-5">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                Bracket dos 16 avos
              </label>
              <textarea
                value={qualifiedTeamsText}
                onChange={(event) => setQualifiedTeamsText(event.target.value)}
                rows={12}
                placeholder={"Portugal\nBrasil\nArgentina\n..."}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold outline-none focus:border-violet-500"
              />
              <p className="mt-2 text-xs font-semibold text-gray-500">
                A ordem é importante: cada 2 linhas formam um jogo dos 16 avos. Exemplo: linha 1 vs linha 2, linha 3 vs linha 4. Estas equipas aparecem na bracket dos users.
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
                  Resultados
                </p>
                <h2 className="mt-1 text-2xl font-black">Seleções que passaram</h2>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleRecalculate}
                className="rounded-full bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:opacity-60"
              >
                Guardar e recalcular
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {[
                ["actualOitavos", "oitavos"],
                ["actualQuartos", "quartos"],
                ["actualMeias", "meias"],
                ["actualFinal", "final"],
                ["actualCampeao", "campeao"],
              ].map(([field, stage]) => (
                <div key={field}>
                  <label className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                    {MINI_GAME_STAGE_META[stage as keyof typeof MINI_GAME_STAGE_META].label}
                  </label>
                  <textarea
                    value={actualTexts[field as keyof typeof actualTexts]}
                    onChange={(event) =>
                      setActualTexts((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    rows={stage === "campeao" ? 3 : 6}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm font-semibold outline-none focus:border-violet-500"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
              Acessos
            </p>
            <h2 className="mt-1 text-2xl font-black">Pedidos de entrada</h2>
            <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
              Os users recebem indicação para pagar 5€ por Revolut ou MB WAY para 918 888 416.
              Depois de confirmares, marca como pago e aprova o acesso.
            </p>

            <div className="mt-5 space-y-2">
              {requests.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm font-semibold text-gray-500">
                  Ainda não há pedidos.
                </p>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.userId}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-black text-gray-950">
                          {request.teamName || "Sem equipa"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          {request.managerName} • {request.email}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-gray-600">
                            {request.status}
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-gray-600">
                            {request.paid ? "Pago" : "Não pago"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            updateMiniGameAccessRequest(request.userId, {
                              paid: !request.paid,
                            })
                          }
                          className="rounded-full bg-white px-4 py-2 text-xs font-black text-gray-700 ring-1 ring-gray-200"
                        >
                          {request.paid ? "Marcar não pago" : "Marcar pago"}
                        </button>
                        <button
                          onClick={() =>
                            updateMiniGameAccessRequest(request.userId, {
                              status: "approved",
                            })
                          }
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() =>
                            updateMiniGameAccessRequest(request.userId, {
                              status: "rejected",
                            })
                          }
                          className="rounded-full bg-rose-600 px-4 py-2 text-xs font-black text-white"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
              Leaderboard
            </p>
            <h2 className="mt-1 text-2xl font-black">Classificação do mini jogo</h2>

            <div className="mt-5 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200">
              {entries.length === 0 ? (
                <p className="bg-gray-50 p-5 text-sm font-semibold text-gray-500">
                  Ainda não há submissões.
                </p>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.userId}
                    className="grid grid-cols-[48px_1fr_70px] items-center gap-3 bg-white px-4 py-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-black">
                      {entry.rank ?? "—"}
                    </div>
                    <div>
                      <p className="font-black text-gray-950">
                        {entry.teamName || "Sem equipa"}
                      </p>
                      <p className="text-xs font-semibold text-gray-500">
                        {entry.managerName}
                      </p>
                    </div>
                    <p className="text-right text-xl font-black text-violet-700">
                      {entry.totalPoints}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
