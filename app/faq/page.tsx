"use client";

import { useMemo, useState, type ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";

type FAQQuestion = {
  q: string;
  a: string;
};

type FAQCategory = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  questions: FAQQuestion[];
};

const faqCategories: FAQCategory[] = [
  {
    id: "visao-geral",
    title: "Visão geral da competição",
    shortTitle: "Visão geral",
    description:
      "Informação essencial sobre o formato e funcionamento da Fantasy Mundial 2026.",
    questions: [
      {
        q: "O que é a Fantasy Mundial 2026?",
        a: "A Fantasy Mundial 2026 é uma competição privada onde cada entrada soma pontos através de predictions dos jogos, escolha do melhor marcador, escolha do melhor assistente e escolha de uma seleção para acompanhar durante o torneio.",
      },
      {
        q: "Quem organiza a competição?",
        a: "A Fantasy Mundial 2026 é organizada e gerida por José Maria Rola Pereira, responsável pela validação de pagamentos, atualização da competição, comunicação oficial, rankings e resolução de situações não previstas.",
      },
      {
        q: "Posso ter mais do que uma entrada?",
        a: "Sim. É possível ter mais do que uma entrada, desde que cada participação esteja associada a um email diferente e tenha o respetivo pagamento validado pela organização.",
      },
      {
        q: "Como é calculada a pontuação geral?",
        a: "A pontuação geral resulta da soma dos pontos obtidos em quatro componentes: predictions, melhor marcador, melhor assistente e seleção escolhida.",
      },
    ],
  },
  {
    id: "conta-pagamento",
    title: "Conta, pagamento e ativação",
    shortTitle: "Pagamento",
    description:
      "Tudo sobre criação de conta, inscrição, pagamento e aprovação da entrada.",
    questions: [
      {
        q: "Quanto custa participar?",
        a: "A inscrição tem um custo único de 10€ por entrada.",
      },
      {
        q: "Quando é que a minha entrada fica ativa?",
        a: "A entrada fica ativa apenas depois de o pagamento ser validado pela organização. Até esse momento, o pedido pode aparecer como pendente.",
      },
      {
        q: "Posso participar com mais do que um email?",
        a: "Sim. Podes participar com mais do que um email, desde que cada conta corresponda a uma entrada diferente e cada entrada tenha o pagamento de 10€ aprovado.",
      },
      {
        q: "Já paguei, mas continuo sem acesso. O que devo fazer?",
        a: "Confirma se submeteste corretamente o pedido de pagamento na plataforma. Se o estado continuar pendente durante demasiado tempo, contacta a organização através do email oficial.",
      },
      {
        q: "O pagamento é automático?",
        a: "Não. A validação é feita manualmente pela organização para garantir que cada entrada corresponde a um pagamento válido.",
      },
    ],
  },
  {
    id: "picks-deadlines",
    title: "Picks, predictions e deadlines",
    shortTitle: "Picks",
    description:
      "Regras sobre escolhas principais, predictions por etapa e bloqueios.",
    questions: [
      {
        q: "Que escolhas tenho de fazer?",
        a: "Cada entrada deve escolher um melhor marcador, um melhor assistente, uma seleção escolhida e preencher as predictions dos jogos disponíveis em cada jornada ou fase.",
      },
      {
        q: "Quando bloqueiam os picks principais?",
        a: "O melhor marcador, o melhor assistente e a seleção escolhida ficam bloqueados antes do início oficial do Mundial. Depois desse momento, já não podem ser alterados.",
      },
      {
        q: "Quando fecham as predictions?",
        a: "As predictions de cada jornada ou fase fecham antes do início da respetiva etapa. Depois do bloqueio, deixam de poder ser editadas.",
      },
      {
        q: "Tenho de preencher todos os jogos da etapa?",
        a: "Sim. Para guardar uma jornada ou fase com sucesso, deves preencher todos os jogos disponíveis dessa etapa e carregar no respetivo botão para guardar.",
      },
      {
        q: "Posso editar uma prediction depois de a guardar?",
        a: "Sim, desde que o deadline dessa jornada ou fase ainda não tenha terminado. Depois do bloqueio, a prediction fica fechada.",
      },
      {
        q: "Como funcionam as predictions nas fases a eliminar?",
        a: "A partir dos 16 avos, a prediction é sempre feita para o resultado do jogo antes dos penalties. Se o jogo ficar decidido nos 90 minutos, conta o resultado aos 90 minutos. Se houver empate aos 90 minutos e o jogo for a prolongamento, conta o resultado no final dos 120 minutos.",
      },
      {
        q: "E se o jogo continuar empatado aos 120 minutos?",
        a: "Se o jogo continuar empatado no final dos 120 minutos, esse empate é o resultado contabilizado para a prediction. Os penalties não alteram o resultado usado para pontuar o palpite.",
      },
      {
        q: "Os penalties contam para alguma coisa?",
        a: "Sim, mas apenas para os pontos extra de progressão da seleção escolhida. Ou seja, se a tua seleção vencer nos penalties e passar à fase seguinte, essa passagem conta para os pontos extra de progressão. No entanto, os penalties não contam para o resultado da prediction.",
      },
    ],
  },
  {
    id: "pontuacao",
    title: "Sistema de pontuação",
    shortTitle: "Pontuação",
    description:
      "Explicação detalhada dos pontos de predictions, jogadores e seleção escolhida.",
    questions: [
      {
        q: "Como pontuam as predictions?",
        a: "Cada jogo pode dar 0, 1 ou 2 pontos. Acertar no sentido do jogo vale 1 ponto. Acertar no resultado exato vale 2 pontos no total. Um palpite errado vale 0 pontos.",
      },
      {
        q: "O resultado exato acumula com o ponto do sentido?",
        a: "Não. O resultado exato vale 2 pontos no total. Ou seja, não soma 1 ponto pelo sentido mais 2 pontos pelo resultado exato.",
      },
      {
        q: "Como pontua o melhor marcador?",
        a: "O jogador escolhido como melhor marcador soma 1 ponto por cada golo oficialmente marcado durante o Mundial.",
      },
      {
        q: "Como pontua o melhor assistente?",
        a: "O jogador escolhido como melhor assistente soma 1 ponto por cada assistência oficialmente registada durante o torneio.",
      },
      {
        q: "Como pontua a seleção escolhida?",
        a: "A seleção escolhida soma 1 ponto por vitória, 0.5 pontos por empate e pontos extra por progressão nas fases eliminatórias.",
      },
      {
        q: "Quais são os pontos extra da seleção escolhida?",
        a: "A passagem dos 16 avos para os oitavos vale +1 ponto, dos oitavos para os quartos vale +1 ponto, dos quartos para as meias-finais vale +1 ponto, das meias-finais para a final vale +1 ponto, e ganhar o Mundial vale +2 pontos.",
      },
      {
        q: "Quando são atualizados os pontos?",
        a: "Os pontos são atualizados depois de os resultados e estatísticas serem validados pela organização. Caso exista uma correção oficial, a pontuação pode ser ajustada.",
      },
    ],
  },
  {
    id: "ranking-snapshots",
    title: "Ranking, snapshots e prémios",
    shortTitle: "Ranking",
    description:
      "Como funcionam a classificação geral, os rankings por fase e a distribuição de prémios.",
    questions: [
      {
        q: "Existe ranking geral?",
        a: "Sim. O ranking geral ordena todos os participantes pela pontuação total acumulada ao longo da competição.",
      },
      {
        q: "O que são snapshots?",
        a: "Após cada jornada ou fase, são guardados os pontos feitos por cada participante nessa etapa. Estes snapshots permitem consultar o histórico da competição e apurar o vencedor de cada fase premiada.",
      },
      {
        q: "Existem prémios por fase?",
        a: "Sim. Existem 8 fases premiadas: Jornada 1, Jornada 2, Jornada 3, 16 avos, Oitavos, Quartos, Meias-finais, e Final + 3º lugar.",
      },
      {
        q: "Como é distribuído o prize pool?",
        a: "Do total das inscrições, 15% corresponde à comissão da plataforma, 65% é reservado ao ranking geral final e 20% é reservado aos prémios por fase.",
      },
      {
        q: "Como são distribuídos os 65% do ranking final?",
        a: "Os 65% reservados ao ranking final são distribuídos pelo top 3: 60% desse bolo para o 1º lugar, 30% para o 2º lugar e 10% para o 3º lugar.",
      },
      {
        q: "Como são distribuídos os 20% das fases?",
        a: "Os 20% reservados aos prémios por fase são divididos pelas 8 fases premiadas. Cada fase recebe 1/8 desse valor, ou seja, 2.5% do total das inscrições.",
      },
      {
        q: "O que acontece em caso de empate?",
        a: "Em caso de empate, a organização aplicará os critérios internos definidos para a competição. Se necessário, a decisão final cabe à organização para garantir justiça e transparência.",
      },
    ],
  },
  {
    id: "suporte-regulamento",
    title: "Suporte e regulamento",
    shortTitle: "Suporte",
    description:
      "Contactos oficiais, validação de informação e regras de integridade da competição.",
    questions: [
      {
        q: "Qual é o email oficial de suporte?",
        a: "O email oficial da Fantasy Mundial 2026 é fantasymundial2026@gmail.com.",
      },
      {
        q: "Quando devo contactar a organização?",
        a: "Deves contactar a organização em caso de problemas de acesso, dúvidas sobre pagamento, erros na pontuação, dúvidas sobre regras ou qualquer situação que não esteja esclarecida na FAQ ou no regulamento.",
      },
      {
        q: "Quem valida os resultados e estatísticas?",
        a: "A organização valida os resultados, golos, assistências e restantes dados relevantes para a pontuação da fantasy.",
      },
      {
        q: "A pontuação pode ser corrigida?",
        a: "Sim. Caso exista erro de atualização, correção oficial ou inconsistência nos dados, a organização pode rever e corrigir a pontuação.",
      },
      {
        q: "O que acontece se alguém tentar abusar da plataforma?",
        a: "Qualquer tentativa de manipulação, uso indevido, criação de contas falsas ou abuso técnico pode levar à exclusão da competição.",
      },
    ],
  },
];

const featuredQuestions = [
  {
    title: "Predictions nas eliminatórias",
    text: "A partir dos 16 avos, contam os 90 minutos; se houver empate e prolongamento, contam os 120 minutos.",
  },
  {
    title: "Como funcionam os prémios?",
    text: "65% para o top 3 final e 20% dividido pelas 8 fases premiadas.",
  },
  {
    title: "O que são snapshots?",
    text: "Registos dos pontos feitos por cada pessoa em cada jornada ou fase.",
  },
];

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

function FAQAccordionItem({
  id,
  question,
  answer,
  isOpen,
  onToggle,
}: {
  id: string;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
      >
        <span className="text-sm font-black leading-6 text-gray-900 sm:text-base">
          {question}
        </span>

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-black transition ${
            isOpen
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div id={id} className="border-t border-gray-100 px-5 py-5 sm:px-6">
          <p className="text-sm leading-7 text-gray-600 sm:text-base">
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return faqCategories;

    return faqCategories
      .map((category) => {
        const filteredQuestions = category.questions.filter(
          (item) =>
            item.q.toLowerCase().includes(query) ||
            item.a.toLowerCase().includes(query) ||
            category.title.toLowerCase().includes(query) ||
            category.shortTitle.toLowerCase().includes(query)
        );

        return {
          ...category,
          questions: filteredQuestions,
        };
      })
      .filter((category) => category.questions.length > 0);
  }, [search]);

  const scrollToCategory = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const yOffset = -96;
    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;

    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const totalResults = filteredCategories.reduce(
    (sum, category) => sum + category.questions.length,
    0
  );

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="relative overflow-hidden rounded-[38px] bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 shadow-xl">
          <div className="absolute inset-0 bg-black/10" />

          <div className="relative grid gap-8 px-5 py-10 sm:px-8 md:px-10 md:py-14 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
            <div>
              <div className="inline-flex rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                Centro de ajuda oficial
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white md:text-6xl">
                FAQ da Fantasy Mundial 2026
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/90 md:text-lg">
                Respostas claras sobre participação, pagamentos, pontuação,
                rankings, snapshots, prémios e regras da competição.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/info"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-gray-900 shadow transition hover:scale-[1.02]"
                >
                  Ver regulamento
                </a>

                <a
                  href="mailto:fantasymundial2026@gmail.com"
                  className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/10 px-6 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
                >
                  Contactar organização
                </a>
              </div>
            </div>

            <div className="grid gap-3">
              {featuredQuestions.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[28px] border border-white/20 bg-white/15 p-5 text-white shadow-sm backdrop-blur-md"
                >
                  <p className="text-sm font-black text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="h-fit xl:sticky xl:top-24">
            <PremiumCard className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                Navegação
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
                Categorias
              </h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                Acede diretamente ao tema que procuras.
              </p>

              <div className="mt-5 space-y-2">
                {faqCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => scrollToCategory(category.id)}
                    className="w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <p className="text-sm font-black text-gray-900">
                      {category.shortTitle}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-600">
                      {category.description}
                    </p>
                  </button>
                ))}
              </div>
            </PremiumCard>

            <div className="mt-5 rounded-[30px] border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                Organização
              </p>
              <h3 className="mt-2 text-lg font-black text-gray-900">
                José Maria Rola Pereira
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Responsável pela gestão da competição, validação de pagamentos,
                rankings e comunicação oficial.
              </p>
              <a
                href="mailto:fantasymundial2026@gmail.com"
                className="mt-4 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:scale-[1.02]"
              >
                Enviar email
              </a>
            </div>
          </aside>

          <div className="space-y-8">
            <PremiumCard className="p-5 sm:p-6">
              <div className="mb-5 border-b border-gray-200 pb-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                  Pesquisa
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
                  Procurar na FAQ
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  Pesquisa por termos como “pagamento”, “predictions”,
                  “prolongamento”, “snapshots”, “prémios”, “seleção” ou
                  “pontuação”.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar pergunta ou tema..."
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <div className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gray-100 px-4 text-sm font-black text-gray-700">
                  {search.trim()
                    ? `${totalResults} resultado(s)`
                    : "Todas as perguntas"}
                </div>
              </div>
            </PremiumCard>

            {filteredCategories.length === 0 ? (
              <PremiumCard className="p-8 text-center">
                <h3 className="text-xl font-black text-gray-900">
                  Não foram encontrados resultados
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  Tenta pesquisar com outras palavras ou contacta a organização
                  através do email oficial.
                </p>
              </PremiumCard>
            ) : (
              filteredCategories.map((category) => (
                <section
                  key={category.id}
                  id={category.id}
                  className="scroll-mt-28"
                >
                  <PremiumCard className="p-5 sm:p-6">
                    <div className="mb-5 border-b border-gray-200 pb-5">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                        FAQ
                      </p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
                        {category.title}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-gray-600">
                        {category.description}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {category.questions.map((item, index) => {
                        const itemKey = `${category.id}-${index}`;

                        return (
                          <FAQAccordionItem
                            key={itemKey}
                            id={itemKey}
                            question={item.q}
                            answer={item.a}
                            isOpen={openItem === itemKey}
                            onToggle={() =>
                              setOpenItem(openItem === itemKey ? null : itemKey)
                            }
                          />
                        );
                      })}
                    </div>
                  </PremiumCard>
                </section>
              ))
            )}

            <section className="overflow-hidden rounded-[34px] bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 p-6 text-white shadow-xl sm:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/75">
                    Apoio oficial
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight">
                    Ainda precisas de ajuda?
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">
                    Contacta a organização para esclarecer dúvidas sobre
                    pagamentos, regras, pontuação, deadlines, snapshots ou
                    prémios.
                  </p>
                  <p className="mt-3 text-sm font-bold text-white/95">
                    Organização: José Maria Rola Pereira
                  </p>
                </div>

                <a
                  href="mailto:fantasymundial2026@gmail.com"
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-gray-900 shadow-lg transition hover:scale-[1.02]"
                >
                  fantasymundial2026@gmail.com
                </a>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}