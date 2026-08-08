import { Suspense } from 'react';

import LoginForm from './LoginForm';

export const metadata = {
  title: 'Entrar — ConversIA',
  robots: { index: false, follow: false }
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
