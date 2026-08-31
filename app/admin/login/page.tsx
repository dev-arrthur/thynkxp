import LoginForm from './LoginForm';
import Icon from '../../../components/Icon';

export default function AdminLogin() {
  return (
    <main className="login admin-login-page">
      <section className="admin-login-shell">
        <aside className="admin-login-intro">
          <a href="/" className="admin-login-logo"><img src="/brand/thynkxp-logo.png" alt="ThynkXP" /></a>
          <div>
            <span className="admin-login-kicker">THYNKXP / ADMIN</span>
            <h1>Controle comercial<br/>com mais <em>clareza.</em></h1>
            <p>Um espaço privado para acompanhar leads, contatos e a evolução da operação comercial.</p>
          </div>
          <div className="admin-login-features"><span><Icon name="shield" /> Sessão protegida</span><span><Icon name="users" /> CRM centralizado</span><span><Icon name="activity" /> Dados em tempo real</span></div>
        </aside>
        <section className="login-card">
          <span className="admin-login-lock"><Icon name="lock" /></span>
          <span className="brand">Acesso restrito</span>
          <h1>Bem-vindo.</h1>
          <p>Use suas credenciais administrativas para continuar.</p>
          <LoginForm />
          <small className="admin-login-note"><Icon name="shield" size={14} /> Suas credenciais são validadas no servidor e não ficam expostas no navegador.</small>
        </section>
      </section>
    </main>
  );
}
