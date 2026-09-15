'use client';

import Icon from '../../../components/Icon';

export default function AdminTeamPage() {
  return (
    <main className="admin-v4-section-page">
      <section className="admin-v4-page-heading">
        <div><span>THYNKXP / EQUIPE</span><h1>Gerenciar equipe</h1><p>Centralize os acessos administrativos e mantenha uma visão clara de quem pode operar cada parte do painel.</p></div>
      </section>

      <section className="admin-v4-kpis">
        <article><span>Membros ativos</span><strong>1</strong><small>acesso administrativo atual</small></article>
        <article><span>Administradores</span><strong>1</strong><small>acesso completo ao painel</small></article>
        <article><span>Perfis operacionais</span><strong>0</strong><small>perfis adicionais configurados</small></article>
        <article><span>Segurança</span><strong><Icon name="shield" size={27} /></strong><small>sessões protegidas</small></article>
      </section>

      <section className="admin-v4-panel">
        <div className="admin-v4-panel-head"><div><span>Equipe administrativa</span><h2>Acessos ao painel</h2><p>A estrutura já fica pronta para receber permissões por função sem alterar a navegação principal.</p></div></div>
        <div className="admin-v4-table">
          <div className="admin-v4-table-head"><span>Membro</span><span>Função</span><span>Acesso</span><span>Status</span></div>
          <div className="admin-v4-table-row">
            <div className="admin-v4-person"><span>AF</span><div><strong>Arthur Ferreira</strong><small>Conta principal</small></div></div>
            <span>Administrador</span><span>Acesso completo</span><span className="admin-v4-pill">Ativo</span>
          </div>
        </div>
      </section>
    </main>
  );
}
