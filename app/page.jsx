import Link from 'next/link';

import ContactForm from '@/components/site/ContactForm';
import SiteFooter from '@/components/site/SiteFooter';
import SiteHeader from '@/components/site/SiteHeader';
import WaButton from '@/components/site/WaButton';
import WaFloat from '@/components/site/WaFloat';
import {
  ChatIcon,
  ClockIcon,
  HandoffIcon,
  MediaIcon
} from '@/components/site/Icons';

const CAPABILITIES = [
  {
    Icon: ChatIcon,
    title: 'Responde clientes automaticamente',
    body: 'Dúvidas sobre horário, preço, endereço, disponibilidade e serviços são respondidas sozinhas, sem ninguém precisar parar o que está fazendo.'
  },
  {
    Icon: MediaIcon,
    title: 'Entende texto, fotos e áudios',
    body: 'O cliente pode mandar uma foto do produto ou gravar um áudio explicando o que quer. A IA transcreve, interpreta e responde do mesmo jeito.'
  },
  {
    Icon: ClockIcon,
    title: 'Responde em segundos, a qualquer hora',
    body: 'Mensagem que chega de madrugada, no domingo ou no meio do corrido do dia recebe resposta na hora, e não quando alguém consegue olhar o celular.'
  },
  {
    Icon: HandoffIcon,
    title: 'Passa para um humano quando precisa',
    body: 'Quando a conversa foge do combinado, envolve negociação ou o cliente pede, o atendimento vai para uma pessoa da equipe com todo o histórico junto.'
  }
];

const STEPS = [
  {
    title: 'Conversamos sobre o seu negócio',
    body: 'Entendemos o que seus clientes mais perguntam, como você atende hoje e o que faz sentido automatizar primeiro.'
  },
  {
    title: 'Conectamos o seu número',
    body: 'Você mantém o mesmo número que seus clientes já conhecem. Ele passa a funcionar na Plataforma oficial do WhatsApp Business, com todo o processo feito pela Meta e pelo nosso provedor oficial.'
  },
  {
    title: 'Configuramos o assistente',
    body: 'Ensinamos a IA com as informações do seu negócio — serviços, horários, preços, endereço e o jeito de falar da sua marca — e definimos quando a conversa deve ir para uma pessoa.'
  },
  {
    title: 'Ele começa a atender',
    body: 'A partir daí seus clientes são respondidos automaticamente. Acompanhamos as conversas reais no início e ajustamos o que for preciso.'
  }
];

const SEGMENTS = [
  { icon: '✂️', title: 'Salões e barbearias', body: 'Agendamento, horários livres, serviços e valores.' },
  { icon: '🩺', title: 'Clínicas e consultórios', body: 'Marcação de consultas, convênios aceitos, preparo e endereço.' },
  { icon: '🛍️', title: 'Lojas e comércio local', body: 'Disponibilidade, tamanhos, formas de pagamento e entrega.' },
  { icon: '🍽️', title: 'Restaurantes e delivery', body: 'Cardápio, tempo de entrega, reservas e pedidos.' },
  { icon: '🏋️', title: 'Academias e estúdios', body: 'Planos, horários de aula, experimentais e matrícula.' },
  { icon: '🔧', title: 'Prestadores de serviço', body: 'Orçamentos, área de atendimento e agenda da semana.' }
];

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo principal</a>
      <SiteHeader />

      <main id="conteudo">
        {/* ============ HERO ============ */}
        <section className="hero" id="inicio">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="pulse-dot" aria-hidden="true" />
                Plataforma oficial do WhatsApp Business
              </p>
              <h1>Atendimento no WhatsApp automatizado com IA para o seu negócio</h1>
              <p className="lede">
                A ConversIA conecta o WhatsApp da sua empresa a um assistente de
                inteligência artificial que lê e responde seus clientes — em texto, foto
                e áudio — 24 horas por dia, e passa a conversa para uma pessoa sempre que
                for necessário.
              </p>
              <div className="hero-actions">
                <WaButton className="btn btn-primary btn-lg" />
                <Link className="btn btn-secondary btn-lg" href="#contato">
                  Solicitar demonstração
                </Link>
              </div>
              <p className="hero-note">
                Sem taxa para conversar. Explicamos como funciona e o que é preciso para começar.
              </p>
            </div>

            {/* Decorative illustration of the product; the copy above carries the meaning. */}
            <div className="hero-visual" aria-hidden="true">
              <div className="chat-card">
                <div className="chat-head">
                  <span className="chat-avatar">IA</span>
                  <span className="chat-meta">
                    <strong>Assistente ConversIA</strong>
                    <em>respondendo agora</em>
                  </span>
                </div>
                <div className="chat-body">
                  <p className="bubble in">Bom dia! Vocês atendem no sábado?</p>
                  <p className="bubble out">
                    Bom dia! Sim, atendemos das 9h às 16h no sábado. Quer que eu veja os
                    horários livres?
                  </p>
                  <p className="bubble in bubble-media">
                    <span className="media-tag">🎤 Áudio · 0:08</span>
                    <span className="media-transcript">
                      &quot;Quero marcar corte e barba pra sábado de manhã&quot;
                    </span>
                  </p>
                  <p className="bubble out">
                    Anotado! Tenho 9h30 e 11h livres no sábado. Qual fica melhor?
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ O QUE FAZ ============ */}
        <section className="section" id="o-que-faz">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">O que faz</p>
              <h2>Um atendente que nunca sai do WhatsApp</h2>
              <p className="section-sub">
                O assistente entende o que o cliente escreveu, mandou por foto ou falou
                por áudio, e responde na hora — no mesmo número que seus clientes já usam.
              </p>
            </div>

            <div className="cards-grid">
              {CAPABILITIES.map(({ Icon, title, body }) => (
                <article className="card" key={title}>
                  <span className="card-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ COMO FUNCIONA ============ */}
        <section className="section section-alt" id="como-funciona">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Como funciona</p>
              <h2>Do primeiro contato ao assistente atendendo</h2>
            </div>

            <ol className="steps">
              {STEPS.map((step, index) => (
                <li className="step" key={step.title}>
                  <span className="step-num" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="callout">
              <h3>Duas coisas importantes, ditas de forma direta</h3>
              <ul className="callout-list">
                <li>
                  <strong>Plataforma oficial.</strong> Trabalhamos com a Plataforma
                  oficial do WhatsApp Business (WhatsApp Business Platform), através de um
                  provedor oficial homologado pela Meta. Nada de aplicativos não oficiais
                  que colocam o número em risco de bloqueio.
                </li>
                <li>
                  <strong>Consentimento e LGPD.</strong> O envio de mensagens iniciadas
                  pela empresa exige opt-in — ou seja, o cliente precisa ter autorizado o
                  contato. Ajudamos você a coletar e registrar esse consentimento, e a
                  tratar os dados das conversas de acordo com a Lei Geral de Proteção de
                  Dados.
                </li>
              </ul>
              <p className="callout-note">
                Uma observação honesta: quando um número entra na Plataforma oficial, ele
                deixa de ser usado dentro do aplicativo WhatsApp Business no celular. Seus
                clientes continuam mandando mensagem para o mesmo número de sempre, e a sua
                equipe passa a responder pela caixa de entrada compartilhada que
                configuramos. Explicamos tudo isso antes de mexer em qualquer coisa.
              </p>
            </div>
          </div>
        </section>

        {/* ============ PARA QUEM ============ */}
        <section className="section" id="para-quem">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Para quem</p>
              <h2>Feito para pequenos negócios locais</h2>
              <p className="section-sub">
                Se o seu negócio recebe pedido, dúvida ou agendamento pelo WhatsApp e o
                celular não para, é para você. Alguns exemplos de quem atendemos:
              </p>
            </div>

            <ul className="segments">
              {SEGMENTS.map(({ icon, title, body }) => (
                <li className="segment" key={title}>
                  <span className="segment-icon" aria-hidden="true">{icon}</span>
                  <strong>{title}</strong>
                  <span>{body}</span>
                </li>
              ))}
            </ul>

            <p className="section-note">
              Não achou o seu segmento? Fale com a gente — se o atendimento acontece pelo
              WhatsApp, provavelmente dá para ajudar.
            </p>
          </div>
        </section>

        {/* ============ CONTATO ============ */}
        <section className="cta-final" id="contato">
          <div className="container cta-grid">
            <div className="cta-copy">
              <h2>Vamos conversar sobre o seu atendimento</h2>
              <p>
                O jeito mais rápido é falar com a gente pelo WhatsApp. Se preferir, deixe
                seus dados no formulário e nós entramos em contato.
              </p>

              <WaButton className="btn btn-primary btn-lg" fallbackHref="#form-demo" />

              <ul className="cta-list">
                <li>Explicamos como funciona, sem compromisso</li>
                <li>Dizemos com clareza o que é preciso da sua parte</li>
                <li>Você fala direto com quem configura</li>
              </ul>

              <p className="cta-secondary">
                Já conversamos e você quer iniciar a conexão do seu número?{' '}
                <Link href="/comecar">Vá para a página de início</Link>.
              </p>
            </div>

            <div className="form-wrap">
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <WaFloat />
    </>
  );
}
