import LoginForm from './LoginForm';

export default function AdminLogin() {
  return (
    <main className="login">
      <section className="login-card">
        <span className="brand">
          thynk<span>XP</span>
        </span>
        <h1>Acesso administrativo</h1>
        <p>Entre para acessar o CRM de leads.</p>
        <LoginForm />
      </section>
    </main>
  );
}
