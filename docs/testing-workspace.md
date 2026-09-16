# Verificação do ecossistema

`tools/workspace-integration.mjs` testa as rotas HTTP contra MongoDB real, usando duas contas sintéticas. Não envia e-mails, não consulta serviços de prospecção e não usa dados de produção.

## Proteções do teste

O runner exige servidor HTTP local, MongoDB local, nome de banco com prefixo `thynkxp_test_` e banco vazio. Antes de alterar qualquer dado pela aplicação, insere uma sentinela diretamente no banco descartável e confirma que o servidor HTTP enxerga essa sentinela. Se a aplicação estiver apontando para outro banco, o teste para. Ao terminar, remove somente o banco de teste identificado pelo marcador desta execução.

## Executar

1. Disponibilize um MongoDB temporário local. Exemplo, com `mongod` instalado:

   ```bash
   mkdir -p /tmp/thynkxp-mongo-test
   mongod --dbpath /tmp/thynkxp-mongo-test --bind_ip 127.0.0.1 --port 27027 --nounixsocket
   ```

   Para instalar somente o runtime de testes, sem modificar o projeto, também é possível instalar `mongodb-memory-server` em uma pasta temporária. Use `instance.args: ['--nounixsocket']` em ambientes que não permitem sockets Unix. O pacote baixa um binário real do MongoDB; não simula consultas.

2. Em outro terminal, inicie uma instância exclusiva da aplicação com credenciais sintéticas. Use os mesmos valores de conexão no runner e no servidor. `MONGODB_DB` é obrigatório: a aplicação não seleciona o banco pelo caminho da URI.

   ```bash
   export MONGODB_URI='mongodb://127.0.0.1:27027/thynkxp_test_ecosystem'
   export MONGODB_DB='thynkxp_test_ecosystem'
   export ADMIN_EMAIL='workspace-test@example.invalid'
   export ADMIN_PASSWORD='local-test-only-password-2026'
   export ADMIN_SESSION_SECRET='local-test-admin-secret-at-least-32-characters'
   export CLIENT_PORTAL_SESSION_SECRET='local-test-client-secret-at-least-32-characters'
   npm run dev -- --hostname 127.0.0.1 --port 3100
   ```

3. Execute o runner em outro terminal, a partir da raiz do projeto:

   ```bash
   WORKSPACE_TEST_URL='http://127.0.0.1:3100' \
   WORKSPACE_TEST_URI='mongodb://127.0.0.1:27027/thynkxp_test_ecosystem' \
   WORKSPACE_TEST_DB='thynkxp_test_ecosystem' \
   WORKSPACE_TEST_ADMIN_EMAIL='workspace-test@example.invalid' \
   WORKSPACE_TEST_ADMIN_PASSWORD='local-test-only-password-2026' \
   node tools/workspace-integration.mjs
   ```

4. Encerre somente as instâncias de Next e MongoDB criadas para o teste. O runner já removeu o banco descartável. Caso o processo seja encerrado abruptamente, prefira um novo banco vazio com outro nome que comece com `thynkxp_test_`.

## Cobertura

- Rejeição de sessões ausentes e verificação de vínculo entre servidor e banco de testes.
- Cadastro e login de duas contas; respostas sem hashes de senha ou notas privadas.
- Normalização e unicidade global de domínios; acesso limitado ao proprietário.
- Persistência do progresso dos projetos, conflito de atualização concorrente e proibição de alterações por clientes.
- Criação simultânea de chamados com numeração única e conflito de atualizações concorrentes.
- Uso simultâneo de cookies administrativos e do cliente respeitando o contexto explícito do portal.
- Chamados com vínculos válidos entre cliente, projeto e domínio; rejeição de IDs de outro cliente e campos administrativos forjados.
- Respostas públicas e notas internas com visibilidade e contagens distintas; identidade do autor definida pelo servidor; paginação sem repetir mensagens.
- Bloqueio de origens externas, corpo excessivo e paginação abusiva.
- SSE autenticado: conexão, atualização persistida e revogação de sessão já aberta.
- Troca de senha com revogação de cookies anteriores, rejeição da senha antiga e novo login válido.
- Desativação do portal aplicada às sessões existentes sem bloquear outro cliente.

O teste de SSE aguarda até 12 segundos por evento, pois o servidor verifica alterações persistidas a cada 3 segundos. A verificação não comprova capacidade sob carga, configuração de DNS, TLS ou disponibilização pública de domínios personalizados.
