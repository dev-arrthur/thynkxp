'use client';

import Icon from '../../../components/Icon';

export default function AdminProfilePage() {
  return (
    <main className="admin-v4-section-page">
      <section className="admin-v4-page-heading">
        <div><span>THYNKXP / CONTA</span><h1>Meu Perfil</h1><p>Resumo da conta administrativa e das configurações de acesso usadas no painel.</p></div>
      </section>

      <section className="admin-v4-profile-card">
        <span>AF</span><div><h2>Arthur Ferreira</h2><p>Administrador principal · ThynkXP</p></div><em>Conta ativa</em>
      </section>

      <section className="admin-v4-field-grid">
        <div className="admin-v4-field"><small>Nome</small><strong>Arthur Ferreira</strong></div>
        <div className="admin-v4-field"><small>Função</small><strong>Administrador</strong></div>
        <div className="admin-v4-field"><small>Workspace</small><strong>ThynkXP</strong></div>
        <div className="admin-v4-field"><small>Nível de acesso</small><strong>Acesso completo</strong></div>
        <div className="admin-v4-field"><small>Autenticação</small><strong>Sessão administrativa protegida</strong></div>
        <div className="admin-v4-field"><small>Credencial</small><strong>Gerenciada pelas variáveis seguras do ambiente</strong></div>
      </section>

      <section className="admin-v4-panel" style={{ marginTop: 14 }}>
        <div className="admin-v4-panel-head"><div><span>Segurança</span><h2>Proteção da conta</h2><p>As credenciais sensíveis continuam fora do navegador e não são exibidas nesta tela.</p></div><Icon name="shield" /></div>
      </section>
    </main>
  );
}
