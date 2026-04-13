"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { listenToAuth } from "@/lib/auth";
import Link from "next/link";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = listenToAuth(setUser);
    return () => unsubscribe();
  }, []);

  const featuredPicks = [
    {
      title: "Melhor Marcador",
      subtitle:
        "Escolhe o jogador que acreditas que vai terminar o torneio com mais golos.",
      value: "1 escolha",
    },
    {
      title: "Melhor Assistente",
      subtitle:
        "Seleciona o jogador que prevês que fará mais assistências no Mundial.",
      value: "1 escolha",
    },
    {
      title: "Seleção Vencedora",
      subtitle:
        "Indica a seleção que consideras favorita para conquistar o Mundial 2026.",
      value: "1 escolha",
    },
    {
      title: "Predictions",
      subtitle:
        "Prevê os resultados dos jogos e soma pontos ao longo de toda a competição.",
      value: "104 jogos",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      <header className="w-full border-b bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Fantasy Mundial 2026
            </h1>
            <p className="text-sm text-gray-500">
              Previsões oficiais do torneio
            </p>
          </div>

          <nav className="hidden gap-6 text-sm font-medium md:flex">
            <Link href="/" className="font-semibold text-blue-600">
              Home
            </Link>

            <Link href="/login" className="hover:text-blue-600">
              Login
            </Link>

            <Link href="/team" className="hover:text-blue-600">
              As Minhas Escolhas
            </Link>

            <Link href="/stats" className="hover:text-blue-600">
              Estatísticas
            </Link>

            <Link href="/games" className="hover:text-blue-600">
              Jogos
            </Link>

            <Link href="/table" className="hover:text-blue-600">
              Tabela
            </Link>

            <Link href="/rules" className="hover:text-blue-600">
              Info
            </Link>

            <Link href="/ranking" className="hover:text-blue-600">
              Ranking
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 shadow-xl">
          <div className="grid items-center gap-8 px-8 py-12 md:grid-cols-2 md:px-12">
            <div className="text-white">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/80">
                Fantasy Oficial
              </p>

              <h2 className="mb-4 text-4xl font-extrabold leading-tight md:text-5xl">
                Faz as tuas previsões para o Mundial 2026
              </h2>

              <p className="mb-6 max-w-xl text-base text-white/90 md:text-lg">
                Escolhe o melhor marcador, o melhor assistente, a seleção
                vencedora e prevê os resultados dos jogos para acumulares a maior
                pontuação possível ao longo do torneio.
              </p>

              <div className="flex flex-wrap gap-4">
                {user ? (
                  <Link
                    href="/team"
                    className="rounded-full bg-white px-6 py-3 font-semibold text-gray-900 shadow transition hover:scale-[1.02]"
                  >
                    Ver as minhas escolhas
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="rounded-full bg-white px-6 py-3 font-semibold text-gray-900 shadow transition hover:scale-[1.02]"
                    >
                      Criar conta
                    </Link>

                    <Link
                      href="/login"
                      className="rounded-full border border-white/70 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                    >
                      Entrar
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-6">
                {user ? (
                  <p className="inline-block rounded-full bg-white/20 px-4 py-2 text-sm font-medium">
                    Sessão iniciada: {user.email}
                  </p>
                ) : (
                  <p className="inline-block rounded-full bg-white/20 px-4 py-2 text-sm font-medium">
                    Inicia sessão para registar as tuas previsões
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <div className="grid w-full max-w-md grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
                  <p className="text-sm text-white/80">Melhor marcador</p>
                  <p className="mt-2 text-3xl font-bold text-white">1</p>
                </div>

                <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
                  <p className="text-sm text-white/80">Melhor assistente</p>
                  <p className="mt-2 text-3xl font-bold text-white">1</p>
                </div>

                <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
                  <p className="text-sm text-white/80">Seleção vencedora</p>
                  <p className="mt-2 text-3xl font-bold text-white">1</p>
                </div>

                <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
                  <p className="text-sm text-white/80">Jogos para prever</p>
                  <p className="mt-2 text-3xl font-bold text-white">104</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-4">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-xl font-bold">Escolhas do torneio</h3>
            <p className="text-gray-600">
              Define as tuas três escolhas principais antes da competição:
              melhor marcador, melhor assistente e seleção vencedora.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-xl font-bold">Predictions jogo a jogo</h3>
            <p className="text-gray-600">
              Prevê os resultados de cada partida e soma pontos sempre que
              acertas no sentido do jogo ou no resultado exato.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-xl font-bold">Ranking global</h3>
            <p className="text-gray-600">
              Acompanha a tua prestação ao longo do torneio e compara a tua
              pontuação com a dos restantes participantes.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Formato
            </p>
            <h2 className="text-3xl font-extrabold">
              O que conta para a tua pontuação
            </h2>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featuredPicks.map((item) => (
            <div key={item.title} className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-xl font-bold text-white">
                {item.title.charAt(0)}
              </div>

              <h3 className="text-xl font-bold">{item.title}</h3>
              <p className="mt-1 text-gray-600">{item.subtitle}</p>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">
                  Fantasy
                </span>
                <span className="font-bold text-blue-600">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            Como participar
          </p>
          <h2 className="mb-6 text-3xl font-extrabold">Participa em 3 passos</h2>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="mb-3 text-2xl font-extrabold text-blue-600">1</div>
              <h3 className="mb-2 text-lg font-bold">Criar conta</h3>
              <p className="text-gray-600">
                Faz o teu registo na plataforma para criares a tua entrada na
                fantasy e ficares com acesso à área das tuas escolhas.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="mb-3 text-2xl font-extrabold text-blue-600">2</div>
              <h3 className="mb-2 text-lg font-bold">Pagamento e ativação</h3>
              <p className="text-gray-600">
                Após o registo, deves submeter o pagamento de 10€ para ativar a
                tua participação. Só depois da confirmação do pagamento é que a
                entrada fica validada.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="mb-3 text-2xl font-extrabold text-blue-600">3</div>
              <h3 className="mb-2 text-lg font-bold">Submeter previsões</h3>
              <p className="text-gray-600">
                Depois de ativares a tua entrada, escolhe o melhor marcador, o
                melhor assistente, a seleção vencedora e preenche os resultados
                previstos para os jogos.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>Fantasy Mundial 2026</p>
          <p>Escolhas, predictions e ranking oficial do torneio</p>
        </div>
      </footer>
    </main>
  );
}