import Link from 'next/link';

import WaButton from '@/components/site/WaButton';
import { LogoMark } from '@/components/site/Icons';

export const metadata = {
  title: 'WhatsApp conectado — ConversIA',
  description: 'Seu número foi conectado à Plataforma oficial do WhatsApp Business.',
  robots: { index: false, follow: false }
};

const NEXT_STEPS = [
  {
    title: 'Preparamos o seu assistente',
    body: 'Vamos configurar o atendimento com as informações do seu negócio: serviços, horários, endereço, formas de pagamento e o jeito de falar da sua marca. Se ainda não passou esses dados, vamos pedir pelo WhatsApp.'
  },
  {
    title: 'Fazemos um teste com você',
    body: 'Antes de liberar para os seus clientes, mandamos mensagens de teste e você confere se as respostas estão do jeito que você quer.'
  },
  {
    title: 'O atendimento entra no ar',
    body: 'A partir daí seus clientes passam a ser respondidos automaticamente. Acompanhamos as primeiras conversas de perto e ajustamos o que for preciso.'
  }
];

export default function SucessoPage() {
  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo principal</a>

      <header className="site-header" id="topo">
        <div className="container header-inner">
          <Link className="logo" href="/" aria-label="ConversIA, página inicial">
            <LogoMark />
            <span className="logo-text">
              Convers<span className="logo-accent">IA</span>
            </span>
          </Link>
          <Link className="btn btn-secondary btn-sm" href="/">Voltar ao site</Link>
        </div>
      </header>

      <main id="conteudo" className="page">
        <div className="container container-narrow">
          <div className="success-head">
            <span className="success-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
            </span>
            <h1>Pronto! Seu WhatsApp foi conectado</h1>
            <p className="lede">
              Recebemos a confirmação da conexão. A partir de agora somos nós que cuidamos
              da parte técnica — você não precisa fazer mais nada neste momento.
            </p>
          </div>

          <section className="next-steps" aria-labelledby="proximos-titulo">
            <h2 id="proximos-titulo">O que acontece agora</h2>
            <ol className="steps steps-stacked">
              {NEXT_STEPS.map((step, index) => (
                <li className="step" key={step.title}>
                  <span className="step-num" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <div className="notice">
            <strong>Vale lembrar</strong>
            <ul>
              <li>Seus clientes continuam mandando mensagem para o mesmo número de sempre.</li>
              <li>
                Como o número agora está na Plataforma oficial, ele não é mais usado dentro
                do aplicativo WhatsApp Business no celular. A sua equipe responde pela
                caixa de entrada compartilhada que vamos configurar junto com você.
              </li>
              <li>
                Mensagens iniciadas pela empresa exigem opt-in do cliente. Se você tem uma
                lista de contatos para avisar, fale com a gente antes de disparar qualquer
                coisa.
              </li>
            </ul>
          </div>

          <div className="start-box">
            <h2>Alguma dúvida?</h2>
            <p>Fale com a gente — respondemos pelo mesmo WhatsApp.</p>
            <WaButton
              className="btn btn-primary btn-lg btn-block"
              message="Olá! Acabei de concluir a conexão do meu WhatsApp e tenho uma dúvida."
              fallbackHref="/#contato"
            />
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container footer-bottom footer-bottom-simple">
          <p>© {new Date().getFullYear()} ConversIA</p>
          <p><Link href="/">Voltar ao site</Link></p>
        </div>
      </footer>
    </>
  );
}
