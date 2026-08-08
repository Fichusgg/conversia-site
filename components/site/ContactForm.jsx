'use client';

import { useRef, useState } from 'react';

/**
 * "Solicitar demonstração" form. Posts to /api/leads, which writes to Supabase
 * with the service-role key.
 *
 * Validation rules, the phone mask and the messages are ported unchanged from
 * the original script.js.
 */

const RULES = {
  nome: (value) => {
    if (!value) return 'Informe seu nome.';
    if (value.length < 2) return 'O nome parece curto demais.';
    return '';
  },
  whatsapp: (value) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return 'Informe seu WhatsApp.';
    if (digits.length < 10 || digits.length > 13) {
      return 'Informe o número com DDD, por exemplo (11) 90000-0000.';
    }
    return '';
  },
  // Optional, but must look like an address when filled in.
  email: (value) => {
    if (!value) return '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return 'Digite um e-mail válido ou deixe em branco.';
    }
    return '';
  },
  segmento: (value) => (value ? '' : 'Escolha o tipo de negócio.'),
  consentimento: (value) =>
    value === 'on' ? '' : 'Precisamos da sua autorização para entrar em contato.'
};

const EMPTY = {
  nome: '',
  whatsapp: '',
  email: '',
  segmento: '',
  mensagem: '',
  consentimento: false,
  site: ''
};

/** Brazilian mobile mask: (11) 98765-4321 */
function maskPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  const split = digits.length > 10 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
}

export default function ContactForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ message: '', kind: null });
  const [sending, setSending] = useState(false);
  const formRef = useRef(null);

  function ruleValue(name, next) {
    return name === 'consentimento' ? (next ? 'on' : '') : String(next || '').trim();
  }

  function validate(name, next) {
    const rule = RULES[name];
    if (!rule) return '';
    return rule(ruleValue(name, next));
  }

  function handleChange(event) {
    const { name, type, value, checked } = event.target;
    const next = type === 'checkbox' ? checked : name === 'whatsapp' ? maskPhone(value) : value;

    setValues((current) => ({ ...current, [name]: next }));

    // Once a field has shown an error, keep the message live as they fix it.
    setErrors((current) => {
      if (!current[name]) return current;
      return { ...current, [name]: validate(name, next) };
    });
  }

  function handleBlur(event) {
    const { name, type, value, checked } = event.target;
    const next = type === 'checkbox' ? checked : value;
    setErrors((current) => ({ ...current, [name]: validate(name, next) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    let firstInvalid = null;

    Object.keys(RULES).forEach((name) => {
      const message = validate(name, values[name]);
      nextErrors[name] = message;
      if (message && !firstInvalid) firstInvalid = name;
    });

    setErrors(nextErrors);

    if (firstInvalid) {
      setStatus({ message: 'Revise os campos destacados para continuar.', kind: 'error' });
      formRef.current?.elements[firstInvalid]?.focus();
      return;
    }

    setSending(true);
    setStatus({ message: '', kind: null });

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: values.nome.trim(),
          whatsapp: values.whatsapp.trim(),
          email: values.email.trim(),
          segmento: values.segmento,
          mensagem: values.mensagem.trim(),
          consentimento: values.consentimento,
          site: values.site // honeypot
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'request_failed');

      const firstName = values.nome.trim().split(' ')[0];
      setValues(EMPTY);
      setErrors({});
      setStatus({
        message: `Recebemos seus dados, ${firstName}! Entramos em contato pelo seu WhatsApp em breve.`,
        kind: 'success'
      });
    } catch (error) {
      console.error('[ConversIA] Falha ao enviar o formulário:', error);
      setStatus({
        message:
          'Não conseguimos enviar agora. Tente de novo em instantes ou fale com a gente direto pelo WhatsApp.',
        kind: 'error'
      });
    } finally {
      setSending(false);
    }
  }

  const invalid = (name) => (errors[name] ? 'true' : undefined);

  return (
    <form className="contact-form" id="form-demo" ref={formRef} onSubmit={handleSubmit} noValidate>
      <h3 className="form-title">Solicitar demonstração</h3>

      <div className="field">
        <label htmlFor="nome">Seu nome</label>
        <input
          type="text" id="nome" name="nome" autoComplete="name"
          value={values.nome} onChange={handleChange} onBlur={handleBlur}
          aria-describedby="erro-nome" aria-invalid={invalid('nome')}
          placeholder="Como podemos te chamar?"
        />
        <p className="error-msg" id="erro-nome" role="alert">{errors.nome || ''}</p>
      </div>

      <div className="field">
        <label htmlFor="whatsapp">WhatsApp</label>
        <input
          type="tel" id="whatsapp" name="whatsapp" autoComplete="tel" inputMode="numeric"
          value={values.whatsapp} onChange={handleChange} onBlur={handleBlur}
          aria-describedby="erro-whatsapp dica-whatsapp" aria-invalid={invalid('whatsapp')}
          placeholder="(11) 90000-0000"
        />
        <p className="hint" id="dica-whatsapp">Com DDD. É por aqui que vamos te responder.</p>
        <p className="error-msg" id="erro-whatsapp" role="alert">{errors.whatsapp || ''}</p>
      </div>

      <div className="field">
        <label htmlFor="email">
          E-mail <span className="optional">(opcional)</span>
        </label>
        <input
          type="email" id="email" name="email" autoComplete="email"
          value={values.email} onChange={handleChange} onBlur={handleBlur}
          aria-describedby="erro-email" aria-invalid={invalid('email')}
          placeholder="voce@seunegocio.com.br"
        />
        <p className="error-msg" id="erro-email" role="alert">{errors.email || ''}</p>
      </div>

      <div className="field">
        <label htmlFor="segmento">Tipo de negócio</label>
        <select
          id="segmento" name="segmento"
          value={values.segmento} onChange={handleChange} onBlur={handleBlur}
          aria-describedby="erro-segmento" aria-invalid={invalid('segmento')}
        >
          <option value="">Selecione…</option>
          <option>Salão ou barbearia</option>
          <option>Clínica ou consultório</option>
          <option>Loja ou comércio local</option>
          <option>Restaurante ou delivery</option>
          <option>Academia ou estúdio</option>
          <option>Prestador de serviço</option>
          <option>Outro</option>
        </select>
        <p className="error-msg" id="erro-segmento" role="alert">{errors.segmento || ''}</p>
      </div>

      <div className="field">
        <label htmlFor="mensagem">
          Conte um pouco sobre o seu atendimento <span className="optional">(opcional)</span>
        </label>
        <textarea
          id="mensagem" name="mensagem" rows={3}
          value={values.mensagem} onChange={handleChange}
          placeholder="Ex.: recebo muita mensagem perguntando horário e preço."
        />
      </div>

      <div className="field field-check">
        <input
          type="checkbox" id="consentimento" name="consentimento"
          checked={values.consentimento} onChange={handleChange} onBlur={handleBlur}
          aria-describedby="erro-consentimento" aria-invalid={invalid('consentimento')}
        />
        <label htmlFor="consentimento">
          Autorizo a ConversIA a entrar em contato comigo pelo WhatsApp ou e-mail
          sobre este pedido e a guardar meus dados para essa finalidade.
        </label>
        <p className="error-msg" id="erro-consentimento" role="alert">
          {errors.consentimento || ''}
        </p>
      </div>

      {/* Honeypot: hidden from people, tempting to bots. Must stay empty. */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="site">Não preencha este campo</label>
        <input
          type="text" id="site" name="site" tabIndex={-1} autoComplete="off"
          value={values.site} onChange={handleChange}
        />
      </div>

      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={sending}>
        {sending ? 'Enviando…' : 'Solicitar demonstração'}
      </button>

      <p className="form-legal">
        Seus dados são usados apenas para responder a este contato e não são vendidos
        nem compartilhados com terceiros. Você pode pedir a exclusão a qualquer momento.
      </p>

      <p
        className={`form-status${status.kind ? ` is-${status.kind}` : ''}`}
        role="status"
        aria-live="polite"
      >
        {status.message}
      </p>
    </form>
  );
}
