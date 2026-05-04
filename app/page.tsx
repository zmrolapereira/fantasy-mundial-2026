"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { listenToAuth } from "@/lib/auth";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";

const heroStats = [
  {
    label: "Inscrição",
    value: "10€",
  },
  {
    label: "Jogos",
    value: "104",
  },
  {
    label: "Picks principais",
    value: "3",
  },
  {
    label: "Fases premiadas",
    value: "8",
  },
];

const scoringBlocks = [
  {
    title: "Melhor marcador",
    subtitle: "Escolhe um jogador. Recebes 1 ponto por cada golo marcado.",
    value: "1 pt / golo",
  },
  {
    title: "Melhor assistente",
    subtitle: "Escolhe um jogador. Recebes 1 ponto por cada assistência.",
    value: "1 pt / assistência",
  },
  {
    title: "Seleção escolhida",
    subtitle: "Soma pontos por resultados e progressão no Mundial.",
    value: "Jogos + fases",
  },
  {
    title: "Predictions",
    subtitle: "Prevê resultados dos jogos e compete no ranking geral.",
    value: "0-2 pts / jogo",
  },
];

const quickSteps = [
  {
    number: "01",
    title: "Criar conta",
    text: "Regista-te com o teu email para criares a tua entrada na fantasy.",
  },
  {
    number: "02",
    title: "Validar pagamento",
    text: "Submete o pagamento de 10€. A entrada fica ativa após aprovação.",
  },
  {
    number: "03",
    title: "Fazer escolhas",
    text: "Escolhe os teus picks e preenche as predictions antes dos deadlines.",
  },
];

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = listenToAuth(setUser);
    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 shadow-xl">
          <div className="absolute inset-0 bg-black/10" />

          <div className="relative grid items-center gap-8 px-5 py-9 sm:px-8 sm:py-11 md:grid-cols-[1.15fr_0.85fr] md:px-12 md:py-14">
            <div className="text-white">
              <div className="inline-flex rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                Fantasy Mundial 2026
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight sm:text-5xl md:text-6xl">
                Faz as tuas previsões para o Mundial 2026
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-white/90 sm:text-lg">
                Cria a tua entrada, escolhe os teus jogadores, aposta nos
                resultados dos jogos e compete pelo ranking geral e pelos prémios
                por fase.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {user ? (
                  <Link
                    href="/team"
                    className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-gray-900 shadow transition hover:scale-[1.02]"
                  >
                    Ver as minhas escolhas
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-gray-900 shadow transition hover:scale-[1.02]"
                    >
                      Criar conta
                    </Link>

                    <Link
                      href="/login"
                      className="rounded-full border border-white/70 bg-white/10 px-6 py-3 text-center text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
                    >
                      Entrar
                    </Link>
                  </>
                )}

                <Link
                  href="/rules"
                  className="rounded-full border border-white/70 px-6 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
                >
                  Ver info
                </Link>
              </div>

              <div className="mt-6">
                {user ? (
                  <p className="inline-block max-w-full rounded-full bg-white/20 px-4 py-2 text-sm font-semibold break-words text-white">
                    Sessão iniciada: {user.email}
                  </p>
                ) : (
                  <p className="inline-block rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white">
                    Entra para guardar picks e predictions
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {heroStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-white/20 bg-white/15 p-5 text-white backdrop-blur"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/70">
                    {item.label}
                  </p>
                  <p className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3 md:gap-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Entrada
            </p>
            <h3 className="mt-2 text-xl font-black text-gray-900">
              Participação de 10€
            </h3>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              A entrada fica válida depois da aprovação do pagamento pela
              organização.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Competição
            </p>
            <h3 className="mt-2 text-xl font-black text-gray-900">
              Ranking geral e por fase
            </h3>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              Compete pela classificação final e pelos prémios das jornadas e
              fases do torneio.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Prémios
            </p>
            <h3 className="mt-2 text-xl font-black text-gray-900">
              Prize pool distribuído
            </h3>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              65% para o top 3 final e 20% para os vencedores das 8 fases
              premiadas.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
              Pontuação
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              O que conta para o ranking
            </h2>
          </div>

          <Link
            href="/rules"
            className="text-sm font-black text-blue-600 transition hover:text-blue-700"
          >
            Ver regulamento completo →
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {scoringBlocks.map((item) => (
            <div
              key={item.title}
              className="overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="h-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600" />

              <div className="p-6">
                <h3 className="text-lg font-black text-gray-900">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {item.subtitle}
                </p>

                <div className="mt-5 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-blue-600">
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 sm:pb-12">
        <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-purple-600">
              Como participar
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              Participa em 3 passos
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {quickSteps.map((step) => (
              <div key={step.number} className="rounded-3xl bg-gray-50 p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-black text-white">
                  {step.number}
                </div>

                <h3 className="text-lg font-black text-gray-900">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-gray-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p className="font-semibold text-gray-700">Fantasy Mundial 2026</p>
          <p>Predictions, picks, rankings e prémios oficiais da competição</p>
        </div>
      </footer>

      <WhatsAppFloatingButton />
    </main>
  );
}