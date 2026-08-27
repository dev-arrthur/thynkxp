'use client';

import { FormEvent, useState } from 'react';

export default function LoginForm() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
    });
    if (response.ok) window.location.href = '/admin';
    else setError('E-mail ou senha inválidos.');
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <label>E-mail<input name="email" type="email" autoComplete="username" required /></label>
      <label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
    </form>
  );
}
