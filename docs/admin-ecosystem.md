# Ecossistema ThynkXP

## Fluxo de trabalho

1. **Radar → CRM:** encontre empresas em `/admin/radar`, importe para o CRM e acompanhe contato, proposta, negociação, responsável e próxima ação em `/admin/leads`. Os provedores e importadores existentes foram preservados.
2. **Clientes:** crie a conta em `/admin/clientes`, defina dados comerciais e acesso ao portal. Abra a ficha para atualizar dados, alterar senha, pausar o portal ou arquivar a conta. Alterações concorrentes são rejeitadas para evitar sobrescrever o trabalho de outra sessão.
3. **Domínios:** na ficha, abra *Domínios e plataformas* para vincular endereços ao cliente. Cada hostname tem um único proprietário. Domínios cadastrados aparecem apenas na conta correspondente.
4. **Projetos:** em `/admin/projetos`, associe o projeto ao cliente, informe prazo e responsável, organize as etapas e acompanhe o progresso calculado pelas entregas concluídas. O cliente acompanha o mesmo projeto pelo portal, sem permissão de alterar o planejamento. Projetos podem ser arquivados e restaurados.
5. **Chamados:** cliente e admin abrem solicitações com categoria, prioridade e vínculos opcionais a projeto/domínio. O admin organiza responsável, prazo e status. Conversas ficam persistidas; notas internas são exclusivas da equipe. Clientes não podem enviar mensagens em chamados fechados.
6. **Visão geral:** `/admin` consolida carteira, mensalidades contratadas, entregas, fila de atendimento e agenda comercial. Valores de recorrência representam contratos cadastrados, não recebimentos financeiros.

## Portal e botão de suporte

O portal fica em `/cliente`, incluindo o formulário de login. Somente contas cadastradas em `clients`, com acesso habilitado e sessão assinada válida, podem consultar os dados. O portal usa sempre a sessão do cliente, mesmo quando um administrador também está conectado no navegador.

Na ficha de cada domínio, *Botão de suporte* copia um link HTML para colocar no site ou sistema do cliente:

```html
<a href="https://SEU-ENDERECO/cliente?section=chamados&amp;domain=ID_DO_DOMINIO"
   target="_blank" rel="noopener noreferrer">Solicitar suporte · ThynkXP</a>
```

O link seleciona o domínio ao abrir os chamados e exige autenticação. Ele não contém credenciais. A API verifica se o domínio pertence à conta autenticada; alterar o ID na URL não transfere acesso.

Cadastrar um domínio aqui registra o vínculo e um link de acesso ao site existente. Não configura DNS, certificado TLS, hospedagem do portal no domínio, login automático no site externo ou SSO. O status do domínio é gerenciado pela equipe; não é resultado de monitoramento automático. Para hospedar o portal em domínios personalizados será necessária uma integração adicional com o provedor de hospedagem e verificação de propriedade.

## Operação e implantação

A aplicação mantém Next.js, MongoDB e o fluxo de implantação existentes. Veja `.env.example` para os nomes das variáveis; nenhuma credencial está incluída.

- São necessários `MONGODB_URI`, `MONGODB_DB`, `ADMIN_PASSWORD` e segredos de sessão. Configure `ADMIN_SESSION_SECRET` e `CLIENT_PORTAL_SESSION_SECRET` com valores distintos de pelo menos 32 caracteres.
- Não foi executada migração nem alteração de dados de produção. As coleções novas são `client_domains`, `workspace_projects`, `workspace_tickets`, `workspace_ticket_messages` e `workspace_counters`.
- Os índices são criados de forma idempotente com promessas compartilhadas por conexão. A conta do banco precisa de permissão para criar índices. Conflitos de unicidade não são ignorados.
- O cadastro existente passa a exigir índices únicos de CNPJ e e-mail de acesso. Se a base antiga contiver duplicidades, é necessário resolvê-las antes de novos cadastros; não há exclusão automática.
- Os acessos antigos definidos apenas por `CLIENT_PORTAL_EMAIL`/hash ou credenciais de demonstração foram substituídos por contas reais vinculadas a um cliente. Cadastre essas contas pela aba Clientes.
- A busca externa de leads depende dos provedores já configurados no ambiente; a funcionalidade e suas mensagens de configuração foram preservadas. Os testes não consomem esses provedores.
- O envio de acesso por e-mail depende do Resend já existente. Nenhum e-mail foi enviado durante o desenvolvimento.

## Atualização e isolamento

`/api/workspace/events` fornece SSE autenticado. O servidor verifica alterações persistidas aproximadamente a cada 3 segundos, transmite invalidações e encerra cada conexão em 25 segundos para reconexão automática dentro do limite de execução. A conexão é compartilhada pelos componentes da aba e suspensa quando a página fica oculta. O mecanismo funciona entre instâncias porque não depende de um barramento de eventos apenas em memória. A latência inclui a rede e não é instantânea.

As rotas de clientes validam a conta no banco em toda requisição. O stream revalida a cada consulta. Desabilitar acesso, arquivar a conta ou alterar o e-mail de acesso invalida sua autorização. Cookies assinados não substituem essa verificação. Redefinir a senha incrementa a versão de acesso e revoga as sessões anteriores; alterações comuns do perfil não encerram a sessão. O admin controla os vínculos; o cliente não escolhe seu próprio identificador de conta na API.

Corpos de requisição e listas têm limites. Os novos endpoints usam respostas sem cache e projeções explícitas; hashes, sais de senha e observações administrativas não são retornados ao cliente. Projetos e contas usam versões para rejeitar edições simultâneas. Chamados têm número gerado por contador atômico e índice único.

## Validação

Veja `docs/testing-workspace.md` para os testes de integração com banco descartável. O runner usa duas contas, dados sintéticos e uma sentinela para confirmar que a aplicação aponta para o banco de teste antes de escrever. A compilação de produção é verificada com `npm run build`.
