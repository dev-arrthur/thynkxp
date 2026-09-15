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
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      if (response.ok) {
        window.location.href = '/admin';
        return;
      }

      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (response.status === 429) {
        setError('Muitas tentativas de acesso. Aguarde alguns minutos antes de tentar novamente.');
      } else if (payload.error === 'admin_not_configured' || payload.error === 'admin_session_unavailable') {
        setError('A configuração de segurança do acesso administrativo está incompleta no ambiente de produção.');
      } else if (response.status === 401) {
        setError('E-mail ou senha inválidos.');
      } else {
        setError('Não foi possível autenticar agora. Tente novamente.');
      }
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
        <div className="admin-login-field"><Icon name="mail" size={17} /><input name="email" type="email" autoComplete="username" defaultValue="arthur.ferreira@thynkxp.com.br" placeholder="nome@thynkxp.com.br" required /></div>
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
