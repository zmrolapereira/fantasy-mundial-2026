"use client";

import SiteHeader from "@/components/SiteHeader";

const overviewCards = [
  {
    label: "Entrada",
    value: "10€",
    text: "A participação só fica ativa depois da validação do pagamento.",
  },
  {
    label: "Predictions",
    value: "Até 2 pts",
    text: "1 ponto no sentido do jogo e 2 pontos no resultado exato.",
  },
  {
    label: "Escolhas",
    value: "4 decisões",
    text: "Melhor marcador, melhor assistente, campeão e predictions.",
  },
  {
    label: "Prémios",
    value: "Final + fases",
    text: "Prize pool repartido entre ranking final e 8 fases.",
  },
];

const steps = [
  {
    number: "01",
    title: "Ativar a entrada",
    text: "Cada utilizador pode participar com uma única entrada. O acesso fica válido após submissão e validação do pagamento de 10€.",
  },
  {
    number: "02",
    title: "Fazer as escolhas",
    text: "É obrigatório escolher o melhor marcador, o melhor assistente, a seleção vencedora e preencher as predictions dos jogos disponíveis.",
  },
  {
    number: "03",
    title: "Acompanhar a classificação",
    text: "Os pontos são atualizados automaticamente com base nos resultados oficiais dos jogos e nas estatísticas validadas.",
  },
];

const scoringCards = [
  {
    title: "Melhor marcador",
    value: "1 ponto por golo",
    text: "A escolha soma 1 ponto por cada golo marcado durante o Mundial.",
  },
  {
    title: "Melhor assistente",
    value: "1 ponto por assistência",
    text: "A escolha soma 1 ponto por cada assistência registada durante o torneio.",
  },
  {
    title: "Seleção escolhida",
    value: "Resultados + fases",
    text: "A seleção soma por vitórias, empates e progressão na competição.",
  },
  {
    title: "Predictions",
    value: "1 ou 2 pontos",
    text: "Ganham-se pontos por acertar no sentido do jogo ou no resultado exato.",
  },
];

const selectedTeamRules = [
  { title: "Vitória", points: "1 ponto" },
  { title: "Empate", points: "0.5 pontos" },
  { title: "Passagem aos oitavos", points: "+2 pontos" },
  { title: "Passagem aos quartos", points: "+2 pontos" },
  { title: "Chegada à final", points: "+2 pontos" },
  { title: "Vitória no Mundial", points: "+4 pontos" },
];

const prizePool = [
  {
    title: "Comissão da plataforma",
    value: "15%",
    text: "Parte do total das inscrições é retida para a operação da fantasy.",
  },
  {
    title: "Top 3 final",
    value: "65%",
    text: "Distribuído pelos 3 primeiros classificados do ranking final.",
  },
  {
    title: "Prémios por fase",
    value: "20%",
    text: "Reservado para premiar desempenho ao longo das 8 fases da competição.",
  },
];

const rules = [
  "Cada utilizador é responsável pelas escolhas e previsões feitas na sua conta.",
  "A entrada só é considerada válida após confirmação do pagamento.",
  "Só contam resultados e estatísticas oficiais validados pela plataforma.",
  "A pontuação pode ser revista em caso de correções oficiais.",
  "Participações com utilização abusiva do sistema poderão ser invalidadas.",
];

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 border-b border-gray-200 pb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-extrabold text-gray-900">{title}</h2>
      {subtitle ? (
        <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">{subtitle}</p>
      ) : null}
    </div>
  );
}

export default function InfoPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-gray-900">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="relative overflow-hidden rounded-[32px] shadow-lg bg-gradient-to-r from-sky-300 via-blue-500 to-violet-600">
          <div className="absolute inset-0 bg-black/15" />
          <div className="relative px-5 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/95">
              Fantasy Mundial 2026
            </p>

            <h1 className="mt-4 max-w-5xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
              Regras, pontuação e prize pool
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/95 md:text-base">
              Tudo o que precisas de saber para participar, pontuar e competir ao
              longo de todo o Mundial 2026.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                "1 entrada por utilizador",
                "10€ de inscrição",
                "Prize pool final + fases",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-white/30 bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <SectionTitle eyebrow="Visão geral" title="Resumo rápido da competição" />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                    {item.value}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <SectionTitle
            eyebrow="Como participar"
            title="Três passos para entrar na fantasy"
          />

          <div className="grid gap-5 lg:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-extrabold text-white">
                  {step.number}
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <SectionTitle
            eyebrow="Pontuação"
            title="Como os pontos são distribuídos"
            subtitle="A classificação final resulta da soma de quatro componentes principais."
          />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {scoringCards.map((block) => (
              <div
                key={block.title}
                className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                  {block.title}
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-gray-900">{block.value}</h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">{block.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
            <SectionTitle eyebrow="Predictions" title="Regras dos jogos" />

            <div className="grid gap-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold text-gray-900">
                  Acertar no sentido do jogo
                </h3>
                <p className="mt-2 text-sm leading-7 text-gray-600">
                  Vale <span className="font-bold text-gray-900">1 ponto</span> quando
                  prevês corretamente vitória da equipa da casa, empate ou vitória da
                  equipa visitante.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold text-gray-900">
                  Acertar no resultado exato
                </h3>
                <p className="mt-2 text-sm leading-7 text-gray-600">
                  Vale <span className="font-bold text-gray-900">2 pontos no total</span>.
                  O resultado exato não acumula 1+2.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold text-gray-900">Quando contam os pontos</h3>
                <p className="mt-2 text-sm leading-7 text-gray-600">
                  Só contam jogos oficialmente concluídos. Se a prediction estiver errada,
                  esse jogo vale 0 pontos.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
            <SectionTitle eyebrow="Seleção escolhida" title="Resultados e progressão" />

            <div className="grid gap-3 sm:grid-cols-2">
              {selectedTeamRules.map((rule) => (
                <div
                  key={rule.title}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">{rule.title}</p>
                    <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white">
                      {rule.points}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
            <SectionTitle eyebrow="Prize Pool" title="Distribuição dos prémios" />

            <div className="grid gap-4 sm:grid-cols-3">
              {prizePool.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                    {item.title}
                  </p>
                  <h3 className="mt-2 text-xl font-extrabold text-gray-900">{item.value}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{item.text}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm sm:p-8">
            <div className="mb-6 border-b border-blue-200 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Regras gerais
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-gray-900">
                Informação oficial
              </h2>
            </div>

            <div className="grid gap-3">
              {rules.map((rule, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-white px-4 py-4"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-gray-700">{rule}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}