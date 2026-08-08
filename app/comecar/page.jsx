import Link from 'next/link';

import WaButton from '@/components/site/WaButton';
import { LogoMark } from '@/components/site/Icons';

/**
 * PLACEHOLDER: the 360dialog Integrated Onboarding / Embedded Signup URL.
 *
 * Get it from the Partner Hub once Tech Provider onboarding is approved, then
 * set NEXT_PUBLIC_ONBOARDING_URL in Vercel. While it is unset the button is
 * replaced by a WhatsApp fallback, so nobody hits a dead link.
 */
const ONBOARDING_URL = process.env.NEXT_PUBLIC_ONBOARDING_URL || '';
const hasOnboardingUrl = /^https?:\/\//i.test(ONBOARDING_URL);

export const metadata = {
  title: 'Começar — ConversIA',
  description:
    'Conecte o WhatsApp do seu negócio à ConversIA. Processo oficial da Meta, com consentimento e conformidade com a LGPD.',
  robots: { index: false, follow: false }
};

const STEPS = [
  {
    title: 'Você abre o formulário oficial',
    body: 'O botão abaixo abre o processo de conexão da Meta. Nós não vemos e não guardamos a sua senha em momento algum.'
  },
  {
    title: 'Confirma o número e o negócio',
    body: 'Você informa o número que será usado, confirma os dados da empresa e valida o código que a Meta envia.'
  },
  {
    title: 'Nós configuramos o assistente',
    body: 'Assim que a conexão fica ativa, recebemos o aviso automaticamente e preparamos o atendimento com as informações do seu negócio. Avisamos você quando estiver pronto.'
  }
];

export default function ComecarPage() {
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
          <div className="page-head">
            <p className="eyebrow">Começar</p>
            <h1>Conectar o WhatsApp do seu negócio</h1>
            <p className="lede">
              Esta é a etapa em que o seu número passa a funcionar na Plataforma oficial
              do WhatsApp Business. O processo é feito pela própria Meta, em uma janela
              segura, e leva poucos minutos.
            </p>
          </div>

          <div className="notice">
            <strong>Antes de começar, tenha em mãos:</strong>
            <ul>
              <li>Acesso ao Facebook / Meta Business com permissão de administrador.</li>
              <li>
                O número de telefone que será usado no atendimento, com acesso para
                receber o código de verificação por SMS ou ligação.
              </li>
              <li>Os dados do seu negócio (nome, endereço e site ou rede social).</li>
            </ul>
          </div>

          <ol className="steps steps-stacked">
            {STEPS.map((step, index) => (
              <li className="step" key={step.title}>
                <span className="step-num" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2>{step.title}</h2>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="start-box">
            <h2>Iniciar a conexão</h2>
            <p>
              Ao continuar, você será levado para o ambiente oficial da Meta e do nosso
              provedor homologado.
            </p>

            {hasOnboardingUrl ? (
              <a
                className="btn btn-primary btn-lg btn-block"
                id="onboarding-link"
                href={ONBOARDING_URL}
                target="_blank"
                rel="noopener"
              >
                Conectar meu WhatsApp
              </a>
            ) : (
              <>
                <span
                  className="btn btn-primary btn-lg btn-block"
                  id="onboarding-link"
                  aria-disabled="true"
                  role="link"
                >
                  Conectar meu WhatsApp
                </span>
                <p className="start-fallback" id="onboarding-fallback">
                  O link de conexão ainda não está disponível nesta página.{' '}
                  <WaButton
                    className=""
                    showIcon={false}
                    message="Olá! Quero conectar o WhatsApp do meu negócio à ConversIA."
                  >
                    Fale com a gente pelo WhatsApp
                  </WaButton>{' '}
                  que enviamos o link direto para você.
                </p>
              </>
            )}
          </div>

          <section className="lgpd" aria-labelledby="lgpd-titulo">
            <h2 id="lgpd-titulo">Consentimento e proteção de dados</h2>
            <p>
              Ao conectar o seu número, você autoriza a ConversIA a operar o atendimento
              automatizado desse WhatsApp em seu nome, na condição de operadora de dados,
              e declara estar ciente de que:
            </p>
            <ul className="lgpd-list">
              <li>
                <strong>Opt-in é obrigatório.</strong> Mensagens iniciadas pela empresa só
                podem ser enviadas a clientes que autorizaram o contato. Você é
                responsável por coletar esse consentimento, e nós ajudamos a registrá-lo.
              </li>
              <li>
                <strong>Finalidade limitada.</strong> As mensagens trocadas são
                processadas apenas para prestar o atendimento contratado — interpretar o
                que o cliente pediu e responder.
              </li>
              <li>
                <strong>Processamento por terceiros.</strong> Para funcionar, o serviço
                usa provedores de infraestrutura e de inteligência artificial. O conteúdo
                das mensagens é enviado a esses provedores exclusivamente para gerar a
                resposta. A lista atualizada de subprocessadores fica disponível mediante
                solicitação.
              </li>
              <li>
                <strong>Seus direitos.</strong> Você pode solicitar acesso, correção,
                portabilidade ou exclusão dos dados, e encerrar o serviço a qualquer
                momento. Nesse caso, apagamos os dados de atendimento sob nossa guarda.
              </li>
              <li>
                <strong>Segurança.</strong> Credenciais de acesso ficam armazenadas apenas
                em ambiente de servidor, nunca no navegador ou no aplicativo do cliente
                final.
              </li>
            </ul>
            <p className="lgpd-note">
              Base legal: execução de contrato e legítimo interesse, nos termos dos artigos
              7º e 10 da Lei nº 13.709/2018. Dúvidas sobre tratamento de dados podem ser
              enviadas pelos canais de contato do rodapé.
            </p>
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container footer-bottom footer-bottom-simple">
          <p>© {new Date().getFullYear()} ConversIA</p>
          <p>
            <Link href="/">Voltar ao site</Link> ·{' '}
            <WaButton
              className=""
              showIcon={false}
              message="Olá! Tenho uma dúvida sobre a conexão do meu WhatsApp."
            />
          </p>
        </div>
      </footer>
    </>
  );
}
