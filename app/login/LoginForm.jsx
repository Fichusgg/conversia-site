'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { LogoMark } from '@/components/site/Icons';
import { supabaseBrowser } from '@/lib/supabase/browser';

/**
 * Admin sign-in. There is no public sign-up — the single admin account is
 * created by hand in the Supabase dashboard (see MANUAL-STEPS.md).
 */
export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.');
      return;
    }

    setBusy(true);

    const { error: signInError } = await supabaseBrowser().auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (signInError) {
      // Deliberately vague: never confirm whether an address has an account.
      setError('E-mail ou senha incorretos.');
      setBusy(false);
      return;
    }

    // refresh() lets the middleware see the new session cookie before the
    // dashboard renders.
    router.replace(next);
    router.refresh();
  }

  return (
    <>
      <Link className="logo auth-logo" href="/" aria-label="ConversIA, página inicial">
        <LogoMark />
        <span className="logo-text">
          Convers<span className="logo-accent">IA</span>
        </span>
      </Link>

      <h1 className="auth-title">Painel da agência</h1>
      <p className="auth-sub">Acesso restrito à equipe da ConversIA.</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            type="email" id="email" name="email" autoComplete="username"
            value={email} onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@conversia.com.br" required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            type="password" id="password" name="password" autoComplete="current-password"
            value={password} onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error ? (
          <p className="form-status is-error" role="alert">{error}</p>
        ) : null}

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="auth-note">
        Não há cadastro público. Se você perdeu o acesso, crie ou redefina a conta pelo
        painel do Supabase.
      </p>
    </>
  );
}
