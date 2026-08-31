'use client';

import { FormEvent, useState } from 'react';
import Icon from '../../../components/Icon';

export default function LoginForm() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
      });
      if (response.ok) { window.location.href = '/admin'; return; }
      setError(response.status === 500 ? 'O acesso administrativo ainda não está configurado no servidor.' : 'E-mail ou senha inválidos.');
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="admin-login-form">
      <label>
        <span>E-mail administrativo</span>
        <div className="admin-login-field"><Icon name="mail" size={17} /><input name="email" type="email" autoComplete="username" placeholder="nome@thynkxp.com.br" required /></div>
      </label>
      <label>
        <span>Senha</span>
        <div className="admin-login-field"><Icon name="lock" size={17} /><input name="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" required /></div>
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={loading}>{loading ? 'Autenticando...' : <><span>Entrar no painel</span><Icon name="arrow-right" size={17} /></>}</button>
    </form>
  );
}
