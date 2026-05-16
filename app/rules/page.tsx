"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";

const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/BvpEfhFjAJi3FiXozlMDRx";

const keyMetrics = [
  {
    label: "Inscrição",
    value: "10€",
    detail: "Por participante",
  },
  {
    label: "Entradas",
    value: "1",
    detail: "Por utilizador",
  },
  {
    label: "Prize pool",
    value: "85%",
    detail: "Do total das inscrições",
  },
  {
    label: "Fases premiadas",
    value: "8",
    detail: "Jornadas e eliminatórias",
  },
];

const participationFlow = [
  {
    step: "01",
    title: "Registo",
    text: "Cria a tua conta e prepara a tua entrada para a Fantasy Mundial 2026.",
  },
  {
    step: "02",
    title: "Pagamento",
    text: "Submete o pagamento de 10€. A entrada fica ativa apenas após aprovação da organização.",
  },
  {
    step: "03",
    title: "Escolhas",
    text: "Define os teus picks principais e preenche as predictions antes dos respetivos deadlines.",
  },
  {
    step: "04",
    title: "Competição",
    text: "Acompanha a classificação geral, os rankings por fase e a evolução dos restantes participantes.",
  },
];

const scoringOverview = [
  {
    title: "Predictions",
    value: "0-2 pts",
    text: "Pontuação atribuída consoante o acerto no resultado previsto para cada jogo.",
    accent: "from-cyan-400 to-blue-500",
  },
  {
    title: "Melhor marcador",
    value: "1 pt / golo",
    text: "O jogador escolhido soma 1 ponto por cada golo marcado no Mundial.",
    accent: "from-blue-400 to-blue-600",
  },
  {
    title: "Melhor assistente",
    value: "1 pt / assistência",
    text: "O jogador escolhido soma 1 ponto por cada assistência registada.",
    accent: "from-blue-500 to-purple-500",
  },
  {
    title: "Seleção escolhida",
    value: "Jogos + fases",
    text: "A seleção escolhida pontua por resultados e por progressão na competição.",
    accent: "from-purple-500 to-purple-700",
  },
];

const predictionRules = [
  {
    label: "Resultado exato",
    points: "2 pontos",
    example: "Previsão: 2-1 | Resultado final: 2-1.",
  },
  {
    label: "Sentido correto",
    points: "1 ponto",
    example: "Acertas vitória, empate ou derrota, mas não o resultado exato.",
  },
  {
    label: "Palpite errado",
    points: "0 pontos",
    example: "O desfecho previsto não corresponde ao resultado final.",
  },
];

const teamScoring = [
  { label: "Vitória da seleção escolhida", value: "1 ponto" },
  { label: "Empate da seleção escolhida", value: "0.5 pontos" },
  { label: "Passagem dos 16 avos para os oitavos", value: "+1 ponto" },
  { label: "Passagem dos oitavos para os quartos", value: "+1 ponto" },
  { label: "Passagem dos quartos para as meias-finais", value: "+1 ponto" },
  { label: "Passagem das meias-finais para a final", value: "+1 ponto" },
  { label: "Vitória no Mundial", value: "+2 pontos" },
];

const prizeDistribution = [
  {
    title: "Comissão da plataforma",
    value: "15%",
    text: "Percentagem retida para operação, manutenção, gestão e organização da competição.",
  },
  {
    title: "Ranking geral final",
    value: "65%",
    text: "Percentagem destinada aos três primeiros classificados da geral final.",
  },
  {
    title: "Prémios por fase",
    value: "20%",
    text: "Percentagem destinada aos vencedores das jornadas e fases premiadas.",
  },
];

const finalPrizeSplit = [
  {
    position: "1º lugar",
    share: "60%",
    description: "Recebe 60% do valor reservado ao ranking final.",
  },
  {
    position: "2º lugar",
    share: "30%",
    description: "Recebe 30% do valor reservado ao ranking final.",
  },
  {
    position: "3º lugar",
    share: "10%",
    description: "Recebe 10% do valor reservado ao ranking final.",
  },
];

const stagePrizes = [
  "Jornada 1",
  "Jornada 2",
  "Jornada 3",
  "16 avos",
  "Oitavos",
  "Quartos",
  "Meias-finais",
  "Final e 3º lugar",
];

const regulationGroups = [
  {
    title: "Participação",
    rules: [
      "Cada participante pode ter apenas uma entrada ativa na competição.",
      "A participação só é considerada válida após aprovação do pagamento pela organização.",
      "O nome da equipa deve respeitar os restantes participantes e a organização.",
      "Não são permitidos nomes ofensivos, tóxicos, discriminatórios, insultuosos, provocatórios ou desrespeitadores.",
      "A organização reserva-se o direito de alterar, remover ou invalidar nomes de equipa que não respeitem o regulamento.",
    ],
  },
  {
    title: "Deadlines e escolhas",
    rules: [
      "Os picks principais ficam bloqueados antes do início oficial do Mundial.",
      "As predictions de cada jornada ou fase fecham antes do início da respetiva etapa.",
      "Após o fecho de uma etapa, as escolhas submetidas deixam de poder ser alteradas.",
    ],
  },
  {
    title: "Pontuação e validação",
    rules: [
      "Apenas contam resultados, golos, assistências e estatísticas validados pela organização.",
      "A pontuação pode ser corrigida caso existam alterações oficiais ou erros de atualização.",
      "Os rankings por fase são calculados através dos pontos obtidos por cada participante nessa jornada ou fase.",
    ],
  },
  {
    title: "Integridade da competição",
    rules: [
      "Qualquer tentativa de manipulação, abuso técnico ou utilização indevida da plataforma pode levar à exclusão.",
      "Em situações não previstas no regulamento, a decisão final cabe à organização.",
      "A Fantasy Mundial 2026 é organizada e gerida por José Maria Rola Pereira.",
    ],
  },
];

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={`mb-8 ${
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-sm leading-7 text-gray-600 md:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/20 bg-white/15 p-5 text-white shadow-sm backdrop-blur-md">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-medium text-white/75">{detail}</p>
    </div>
  );
}

function PremiumCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[30px] border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export default function InfoPage() {
  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="relative overflow-hidden rounded-[38px] bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 shadow-xl">
          <div className="absolute inset-0 bg-black/10" />

          <div className="relative grid gap-8 px-5 py-10 sm:px-8 md:px-10 md:py-14 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <div className="inline-flex rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                Regulamento oficial
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white md:text-6xl">
                Fantasy Mundial 2026
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/90 md:text-lg">
                Compete durante todo o Mundial através de predictions, escolhas
                estratégicas, rankings por fase e classificação geral.
              </p>

              <div className="mt-7 rounded-[26px] border border-white/25 bg-white/15 p-5 text-white backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
                  Organização
                </p>
                <p className="mt-2 text-xl font-black">
                  José Maria Rola Pereira
                </p>
                <p className="mt-1 text-sm leading-6 text-white/75">
                  Responsável pela gestão da competição, validação de resultados,
                  pagamentos, rankings e comunicação oficial.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/team"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-gray-900 shadow transition hover:scale-[1.02]"
                >
                  Entrar na competição
                </a>

                <a
                  href="/ranking"
                  className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/10 px-6 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
                >
                  Ver ranking
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {keyMetrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  detail={metric.detail}
                />
              ))}
            </div>
          </div>
        </section>

         <section className="mt-8 overflow-hidden rounded-[30px] border border-green-200 bg-white shadow-sm">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-2xl text-white shadow-sm">
                💬
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700">
                  Grupo oficial WhatsApp
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
                  Junta-te ao grupo da Fantasy Mundial 2026
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">
                  Entra no grupo oficial para receberes avisos importantes,
                  atualizações de deadlines, informação sobre pagamentos,
                  esclarecimentos de regras e comunicações da organização durante
                  o torneio.
                </p>
              </div>
            </div>

            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-[#25D366] px-6 py-3 text-sm font-black text-white shadow transition hover:scale-[1.02] hover:bg-[#1ebe5d]"
            >
              Entrar no grupo
            </a>
          </div>
        </section>

        <section className="mt-10">
          <SectionHeader
            eyebrow="Como funciona"
            title="Uma competição simples, estratégica e transparente"
            subtitle="A Fantasy Mundial 2026 combina predictions jogo a jogo com escolhas feitas antes do torneio. O objetivo é somar pontos ao longo de todas as fases e terminar no topo do ranking."
            align="center"
          />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {participationFlow.map((item) => (
              <PremiumCard key={item.step} className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-black text-white">
                  {item.step}
                </div>
                <h3 className="mt-5 text-lg font-black text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {item.text}
                </p>
              </PremiumCard>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader
            eyebrow="Pontuação"
            title="As quatro fontes de pontos"
            subtitle="A classificação geral resulta da soma dos pontos obtidos em predictions, melhor marcador, melhor assistente e seleção escolhida."
          />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {scoringOverview.map((item) => (
              <PremiumCard key={item.title} className="overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${item.accent}`} />
                <div className="p-6">
                  <p className="text-sm font-black text-gray-500">
                    {item.title}
                  </p>
                  <h3 className="mt-3 text-2xl font-black tracking-tight text-gray-900">
                    {item.value}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    {item.text}
                  </p>
                </div>
              </PremiumCard>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <PremiumCard className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="Predictions"
              title="Pontuação dos jogos"
              subtitle="Cada prediction é avaliada apenas depois do jogo estar concluído e validado."
            />

            <div className="space-y-4">
              {predictionRules.map((rule) => (
                <div
                  key={rule.label}
                  className="rounded-3xl border border-gray-200 bg-gray-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-black text-gray-900">
                        {rule.label}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {rule.example}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
                      {rule.points}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-black text-blue-950">
                Resultado exato
              </p>
              <p className="mt-2 text-sm leading-7 text-blue-900">
                O resultado exato vale 2 pontos no total. Não acumula com o
                ponto do sentido correto.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="Seleção escolhida"
              title="Resultados e progressão"
              subtitle="A seleção escolhida contribui com pontos pelos resultados obtidos e pelos bónus de progressão nas eliminatórias."
            />

            <div className="grid gap-3 sm:grid-cols-2">
              {teamScoring.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-gray-200 bg-gray-50 p-5"
                >
                  <p className="text-sm font-bold leading-6 text-gray-800">
                    {item.label}
                  </p>
                  <p className="mt-3 inline-flex rounded-full bg-purple-600 px-3 py-1 text-xs font-black text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-purple-200 bg-purple-50 p-5">
              <p className="text-sm font-black text-purple-950">
                Nota de cálculo
              </p>
              <p className="mt-2 text-sm leading-7 text-purple-900">
                Os pontos por vitória ou empate são somados jogo a jogo. Os
                bónus de progressão são atribuídos apenas quando a seleção passa
                a fase correspondente.
              </p>
            </div>
          </PremiumCard>
        </section>

        <section className="mt-12 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <PremiumCard className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="Picks principais"
              title="Jogadores"
              subtitle="Antes do início da competição, cada participante escolhe dois jogadores para acompanhar durante todo o torneio."
            />

            <div className="space-y-4">
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-black text-gray-900">
                    Melhor marcador
                  </h3>
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
                    1 pt / golo
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  Soma pontos por todos os golos marcados pelo jogador escolhido.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-black text-gray-900">
                    Melhor assistente
                  </h3>
                  <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-black text-white">
                    1 pt / assistência
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  Soma pontos por todas as assistências registadas pelo jogador
                  escolhido.
                </p>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="Deadlines e histórico"
              title="Bloqueio de escolhas e rankings por fase"
              subtitle="Os deadlines garantem igualdade entre participantes e os snapshots permitem apurar os vencedores de cada etapa."
            />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                  Antes do Mundial
                </p>
                <h3 className="mt-3 font-black text-gray-900">
                  Picks principais
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  Marcador, assistente e seleção ficam bloqueados antes do
                  primeiro jogo.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                  Por etapa
                </p>
                <h3 className="mt-3 font-black text-gray-900">
                  Predictions
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  Cada jornada ou fase fecha antes do início dos jogos dessa
                  etapa.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                  Após cada etapa
                </p>
                <h3 className="mt-3 font-black text-gray-900">
                  Snapshots
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  São guardados os pontos feitos por cada participante nessa
                  jornada ou fase.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-black text-blue-950">
                Para que servem os snapshots?
              </p>
              <p className="mt-2 text-sm leading-7 text-blue-900">
                No final de cada jornada ou fase, a plataforma guarda uma
                classificação histórica com os pontos obtidos por cada
                participante nessa etapa. Esse registo é usado para apurar o
                vencedor do prémio de fase e manter o histórico da competição.
              </p>
            </div>
          </PremiumCard>
        </section>

        <section className="mt-12">
          <PremiumCard className="overflow-hidden">
            <div className="grid xl:grid-cols-[0.9fr_1.1fr]">
              <div className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 p-6 text-white sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/75">
                  Prize pool
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                  Distribuição dos prémios
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/80">
                  O total das inscrições é dividido entre comissão da plataforma,
                  prémios do ranking geral final e prémios por fase.
                </p>

                <div className="mt-7 grid gap-3">
                  {prizeDistribution.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-3xl border border-white/20 bg-white/15 p-5 backdrop-blur"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-white">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-white/70">
                            {item.text}
                          </p>
                        </div>
                        <p className="text-2xl font-black text-white">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                      Ranking final
                    </p>
                    <h3 className="mt-3 text-2xl font-black text-gray-900">
                      Distribuição dos 65%
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-gray-600">
                      O valor reservado ao ranking geral final corresponde a 65%
                      do total das inscrições. Esse montante é distribuído pelo
                      top 3 da seguinte forma:
                    </p>

                    <div className="mt-5 space-y-3">
                      {finalPrizeSplit.map((item) => (
                        <div
                          key={item.position}
                          className="rounded-3xl border border-gray-200 bg-gray-50 px-5 py-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-black text-gray-900">
                              {item.position}
                            </p>
                            <p className="font-black text-blue-600">
                              {item.share}
                            </p>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-600">
                      Prémios por fase
                    </p>
                    <h3 className="mt-3 text-2xl font-black text-gray-900">
                      1/8 dos 20% por etapa
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-gray-600">
                      O valor reservado às fases corresponde a 20% do total das
                      inscrições. Cada uma das 8 fases premiadas recebe 1/8
                      desse montante.
                    </p>

                    <div className="mt-5 grid gap-3">
                      {stagePrizes.map((stage, index) => (
                        <div
                          key={stage}
                          className="flex items-center gap-3 rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-xs font-black text-white">
                            {index + 1}
                          </div>
                          <p className="text-sm font-bold text-gray-800">
                            {stage}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                      <p className="text-sm font-black text-blue-950">
                        Exemplo de leitura
                      </p>
                      <p className="mt-2 text-sm leading-7 text-blue-900">
                        Como existem 8 fases premiadas, cada vencedor de fase
                        recebe 1/8 do bolo de 20%, ou seja, 2.5% do total das
                        inscrições.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PremiumCard>
        </section>

        <section className="mt-12">
  <PremiumCard className="overflow-hidden">
    <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 p-6 text-white sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/75">
          Nome da equipa
        </p>

        <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
          Respeito entre participantes
        </h2>

        <p className="mt-4 text-sm leading-7 text-white/85">
          O nome da equipa faz parte da identidade de cada participante dentro da
          fantasy, mas deve respeitar sempre os restantes jogadores, a organização
          e o ambiente da competição.
        </p>
      </div>

      <div className="p-6 sm:p-8">
        <div className="grid gap-4">
          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-black text-gray-900">
              Nomes permitidos
            </p>
            <p className="mt-2 text-sm leading-7 text-gray-600">
              São permitidos nomes criativos, engraçados e competitivos, desde
              que não sejam ofensivos, abusivos ou desrespeitadores.
            </p>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-black text-red-950">
              Nomes não permitidos
            </p>
            <p className="mt-2 text-sm leading-7 text-red-900">
              Não são permitidos nomes tóxicos, discriminatórios, insultuosos,
              provocatórios, ofensivos, sexualmente explícitos ou que tenham como
              objetivo atacar outros participantes.
            </p>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-black text-blue-950">
              Decisão da organização
            </p>
            <p className="mt-2 text-sm leading-7 text-blue-900">
              A organização pode pedir a alteração do nome da equipa, alterar o
              nome manualmente ou invalidar uma participação caso o nome não
              respeite o regulamento da competição.
            </p>
          </div>
        </div>
      </div>
    </div>
  </PremiumCard>
</section>

        <section className="mt-12">
          <PremiumCard className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="Regulamento"
              title="Regras gerais e validação oficial"
              subtitle="A organização reserva-se o direito de validar resultados, corrigir pontuações e tomar decisões necessárias para preservar a transparência e integridade da competição."
            />

            <div className="grid gap-5 md:grid-cols-2">
              {regulationGroups.map((group) => (
                <div
                  key={group.title}
                  className="rounded-3xl border border-gray-200 bg-gray-50 p-5"
                >
                  <h3 className="text-lg font-black text-gray-900">
                    {group.title}
                  </h3>

                  <div className="mt-4 space-y-3">
                    {group.rules.map((rule, index) => (
                      <div key={rule} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-[10px] font-black text-white">
                          {index + 1}
                        </div>
                        <p className="text-sm leading-6 text-gray-700">
                          {rule}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PremiumCard>
        </section>

        <section className="mt-12 overflow-hidden rounded-[34px] bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/75">
                Apoio oficial
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">
                Dúvidas sobre regras ou pagamentos?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">
                Contacta a organização para esclarecer qualquer questão sobre
                participação, pontuação, deadlines, pagamentos ou prémios.
              </p>
              <p className="mt-3 text-sm font-bold text-white/95">
                Organização: José Maria Rola Pereira
              </p>
            </div>

            <a
              href="mailto:fantasymundial2026@gmail.com"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-gray-900 shadow-lg transition hover:scale-[1.02]"
            >
              Contactar organização
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}