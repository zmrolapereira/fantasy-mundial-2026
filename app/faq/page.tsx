"use client";

import { useMemo, useState } from "react";
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
    id: "conta",
    title: "Conta e acesso à plataforma",
    shortTitle: "Conta",
    description:
      "Informação sobre login, sessão, participação e utilização da tua conta na fantasy.",
    questions: [
      {
        q: "Como entro na Fantasy Mundial 2026?",
        a: "O acesso é feito através da página de login da plataforma. Depois de iniciares sessão, a tua conta fica associada às tuas escolhas, predictions, pontuação e posição no ranking.",
      },
      {
        q: "Preciso de criar conta para participar?",
        a: "Sim. É necessário iniciar sessão para guardar a tua entrada, aceder à página da tua equipa e garantir que toda a tua atividade fica corretamente ligada ao teu perfil.",
      },
      {
        q: "Posso participar com mais do que uma conta?",
        a: "Não. Cada utilizador deve participar com apenas uma entrada. A utilização de contas múltiplas ou práticas abusivas pode levar à invalidação da participação.",
      },
      {
        q: "Como sei se estou autenticado?",
        a: "Quando estiveres com sessão iniciada, conseguirás aceder às áreas privadas da plataforma, guardar picks e predictions e ver informação associada à tua conta.",
      },
    ],
  },
  {
    id: "pagamento",
    title: "Pagamento e ativação",
    shortTitle: "Pagamento",
    description:
      "Tudo o que precisas de saber sobre inscrição, validação do pagamento e desbloqueio do acesso.",
    questions: [
      {
        q: "Quanto custa participar?",
        a: "A inscrição na Fantasy Mundial 2026 tem um custo único de 10€ por utilizador.",
      },
      {
        q: "Como faço o pagamento?",
        a: "O pagamento é realizado pelos métodos indicados na plataforma, nomeadamente MB Way ou Revolut, para o contacto apresentado na área de participação. Depois de pagares, deves submeter o pedido de validação na app.",
      },
      {
        q: "Quando é que a minha participação fica ativa?",
        a: "A tua participação fica ativa após validação manual do pagamento pelo administrador. Até essa confirmação, poderás continuar a ver o estado como pendente.",
      },
      {
        q: "Como sei se o meu pagamento foi aprovado?",
        a: "Assim que o pagamento for validado, o acesso à fantasy fica desbloqueado automaticamente e o teu estado deixa de aparecer como pendente.",
      },
      {
        q: "Já paguei, mas ainda não tenho acesso. O que faço?",
        a: "Confirma primeiro se submeteste corretamente o pedido de pagamento dentro da plataforma. Se o estado se mantiver pendente durante demasiado tempo, entra em contacto através do email oficial de suporte.",
      },
    ],
  },
  {
    id: "picks",
    title: "Picks e predictions",
    shortTitle: "Picks",
    description:
      "Regras sobre escolhas principais, previsões por ronda e prazos de submissão.",
    questions: [
      {
        q: "Que escolhas tenho de fazer para participar?",
        a: "Cada utilizador deve escolher o melhor marcador, o melhor assistente, a seleção vencedora do Mundial e preencher as predictions dos jogos disponíveis em cada jornada ou fase.",
      },
      {
        q: "Até quando posso alterar os picks principais?",
        a: "Os picks principais podem ser alterados até ao momento de fecho definido antes do início do torneio. Depois desse prazo, essas escolhas ficam bloqueadas.",
      },
      {
        q: "Até quando posso preencher as predictions dos jogos?",
        a: "As predictions de cada ronda podem ser guardadas até 1 hora antes do primeiro jogo dessa ronda. Depois do fecho, deixam de poder ser alteradas.",
      },
      {
        q: "Tenho de preencher todos os jogos da ronda para guardar?",
        a: "Sim. Para submeter uma ronda com sucesso, tens de preencher todos os jogos dessa jornada ou fase.",
      },
      {
        q: "Posso voltar a editar predictions já guardadas?",
        a: "Sim, desde que o prazo dessa ronda ainda esteja aberto. Enquanto a ronda não fechar, podes atualizar as previsões e voltar a guardar.",
      },
    ],
  },
  {
    id: "pontuacao",
    title: "Pontuação",
    shortTitle: "Pontuação",
    description:
      "Explicação da lógica de pontos para predictions, picks individuais e seleção escolhida.",
    questions: [
      {
        q: "Como funcionam os pontos das predictions?",
        a: "Acertar no sentido do jogo — vitória da casa, empate ou vitória da equipa visitante — vale 1 ponto. Acertar no resultado exato vale 2 pontos no total.",
      },
      {
        q: "O resultado exato acumula com o ponto do sentido do jogo?",
        a: "Não. O resultado exato vale 2 pontos no total e não soma 1+2.",
      },
      {
        q: "Como pontua o melhor marcador escolhido?",
        a: "A tua escolha soma 1 ponto por cada golo oficialmente marcado por esse jogador durante o Mundial.",
      },
      {
        q: "Como pontua o melhor assistente escolhido?",
        a: "A tua escolha soma 1 ponto por cada assistência oficialmente registada durante o torneio.",
      },
      {
        q: "Como pontua a seleção escolhida?",
        a: "A seleção escolhida soma pontos de acordo com o regulamento da plataforma, incluindo desempenho em jogo e progressão nas várias fases da competição.",
      },
      {
        q: "Quando são atualizados os pontos?",
        a: "Os pontos são atualizados com base em resultados e estatísticas oficiais validados pela plataforma. Em caso de correção oficial, a pontuação pode ser revista.",
      },
    ],
  },
  {
    id: "ranking",
    title: "Ranking e prémios",
    shortTitle: "Ranking",
    description:
      "Informação sobre classificação geral, desempenho por fase e distribuição de prémios.",
    questions: [
      {
        q: "Existe ranking geral?",
        a: "Sim. Todos os participantes aparecem no ranking global da fantasy, ordenados pela sua pontuação total.",
      },
      {
        q: "Existem prémios por fase?",
        a: "Sim. Parte do prize pool pode ser atribuída ao desempenho em jornadas ou fases específicas, para além da classificação final.",
      },
      {
        q: "Como funciona o prize pool?",
        a: "O prize pool é distribuído segundo as regras apresentadas na página de informação da plataforma, incluindo comissão da organização, prémios finais e eventuais prémios por fase.",
      },
      {
        q: "O que acontece em caso de empate no ranking?",
        a: "Em caso de empate, a ordenação segue os critérios internos definidos pela plataforma, tendo em conta a pontuação global e outros critérios de desempate aplicáveis.",
      },
    ],
  },
  {
    id: "suporte",
    title: "Suporte e contacto",
    shortTitle: "Suporte",
    description:
      "Canais de contacto e situações em que deves pedir ajuda à organização.",
    questions: [
      {
        q: "Onde posso tirar dúvidas sobre a plataforma?",
        a: "Podes consultar esta FAQ, rever a página de regras ou entrar em contacto com o suporte oficial por email.",
      },
      {
        q: "Qual é o email oficial de suporte?",
        a: "O email oficial da Fantasy Mundial 2026 é fantasymundial2026@gmail.com.",
      },
      {
        q: "Quando devo contactar o suporte?",
        a: "Deves contactar o suporte em casos como problemas de acesso, dificuldades com pagamento, dúvidas sobre funcionamento da plataforma ou qualquer situação não esclarecida nas páginas oficiais.",
      },
    ],
  },
];

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
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
      >
        <span className="text-sm font-semibold text-gray-900 sm:text-base">
          {question}
        </span>

        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-bold transition ${
            isOpen
              ? "bg-violet-100 text-violet-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div id={id} className="border-t border-gray-100 px-5 py-4 sm:px-6">
          <p className="text-sm leading-7 text-gray-600 sm:text-base">{answer}</p>
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
            category.title.toLowerCase().includes(query)
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
    <main className="min-h-screen bg-[#f4f7fb] text-gray-900">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-r from-sky-300 via-blue-500 to-violet-600 shadow-lg">
          <div className="px-5 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/95">
              Centro de ajuda
            </p>

            <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
              FAQ da Fantasy Mundial 2026
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/95 md:text-base">
              Encontra respostas rápidas e claras sobre acesso, pagamento, picks,
              predictions, pontuação, ranking e suporte ao utilizador.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/rules"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow transition hover:scale-[1.02]"
              >
                Ver regras completas
              </a>

              <a
                href="mailto:fantasymundial2026@gmail.com"
                className="inline-flex items-center justify-center rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Contactar suporte
              </a>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="h-fit rounded-3xl border border-gray-200 bg-white p-5 shadow-sm xl:sticky xl:top-24">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              Navegação
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-gray-900">
              Categorias
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              Clica numa categoria para ires diretamente para a secção respetiva.
            </p>

            <div className="mt-5 space-y-2">
              {faqCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => scrollToCategory(category.id)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50"
                >
                  <p className="text-sm font-bold text-gray-900">
                    {category.shortTitle}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    {category.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                Precisas de ajuda adicional?
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Se a tua dúvida não estiver esclarecida aqui, entra em contacto com
                o suporte oficial da fantasy.
              </p>
              <a
                href="mailto:fantasymundial2026@gmail.com"
                className="mt-4 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Enviar email
              </a>
            </div>
          </aside>

          <div className="space-y-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 border-b border-gray-200 pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                  Pesquisa
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-gray-900">
                  Procurar na FAQ
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  Pesquisa por palavras como “pagamento”, “login”, “predictions”,
                  “ranking” ou “pontos”.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar pergunta ou tema..."
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-blue-500"
                />

                <div className="inline-flex h-12 items-center justify-center rounded-2xl bg-gray-100 px-4 text-sm font-semibold text-gray-700">
                  {search.trim() ? `${totalResults} resultado(s)` : "Todas as perguntas"}
                </div>
              </div>
            </section>

            {filteredCategories.length === 0 ? (
              <section className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <h3 className="text-xl font-bold text-gray-900">
                  Não foram encontrados resultados
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  Tenta pesquisar com outras palavras ou entra em contacto através
                  do email de suporte.
                </p>
              </section>
            ) : (
              filteredCategories.map((category) => (
                <section
                  key={category.id}
                  id={category.id}
                  className="scroll-mt-28 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="mb-5 border-b border-gray-200 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                      FAQ
                    </p>
                    <h2 className="mt-2 text-2xl font-extrabold text-gray-900">
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
                </section>
              ))
            )}

            <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Suporte oficial
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold text-gray-900">
                    Ainda precisas de ajuda?
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    Se a tua situação não estiver esclarecida na FAQ ou nas regras,
                    entra em contacto com a organização. O suporte oficial responde
                    através do email indicado abaixo.
                  </p>
                </div>

                <a
                  href="mailto:fantasymundial2026@gmail.com"
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:scale-[1.02]"
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