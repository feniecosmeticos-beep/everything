# Portal Fenié com Supabase

Variante independente do catálogo estático. Cliente: cadastro com confirmação de e-mail, aprovação, endereços, reposição e pedidos. Equipe: aprovação de clientes, atendimento de pedidos, notas internas e edição de produtos/destaques.

## Execução

Requer Node.js 22 ou superior. `npm ci`, `npm test`, `npm run build`. Sirva `dist/` por HTTP. `public-config.json` contém apenas URL e chave publicável do projeto; não adicionar chaves secretas. A compilação inclui o SDK fixado no lockfile.

## Banco

Projeto: gxqhblahdqkhiuiocyqc, região sa-east-1. Migrações em `supabase/migrations/` já aplicadas ao projeto remoto. Versões locais alinhadas ao histórico remoto gerado pelo Supabase. RLS em todas as tabelas; dados privados somente do proprietário ou da equipe autorizada. Nenhum papel vem de user_metadata. Pedidos usam preços do servidor e snapshot imutável, UUID de idempotência, forma de pagamento e parcelas. Anotações internas estão em tabela separada, acessível somente para administradores.

`catalogue-import.json` preserva 488 grupos e 712 opções da base publicada. A importação é administrativa; nunca disponibilizar importação com privilégios no navegador. Para importar em projeto novo, aplicar migrações e inserir esse JSON com acesso administrativo no banco.

## Primeiro administrador

O e-mail inicial foi cadastrado de forma privada pelo proprietário em `fenie_private.initial_admin`; ele não é publicado neste repositório. A pessoa deve cadastrar sua própria senha na tela de cadastro e confirmar o e-mail. O gatilho de autenticação consome a autorização uma única vez e libera o administrador. Sem confirmação, a conta continua como cliente pendente. Os próximos clientes dependem da aprovação dessa equipe.

## Validação

Cinco testes dos formulários passaram (`npm test`). `tests/rls.sql` valida permissões, isolamento entre contas, bloqueio de autoaprovação, preços do servidor, parcelas e idempotência em transação com rollback. A execução no projeto isolado passou e não deixou contas ou pedidos fictícios. API pública: 488 produtos/712 opções, HTTP 200. Perfis e pedidos sem login: HTTP 401. Schema privado pela API: HTTP 406. Advisor de segurança sem apontamentos.

## Prévia e ativação

Prévia protegida da Vercel: https://catalogofenie-73uj1ajze-feniecosmeticos-3642s-projects.vercel.app/
O catálogo de produção não foi substituído. Validar cadastro, entrega de e-mail e login do administrador antes de liberar clientes. Conferir SMTP próprio para envio a clientes externos e configurar o domínio definitivo em Authentication > URL Configuration antes de produção. Não desativar confirmação de e-mail. A prévia mantém Vercel Authentication.

## Limites desta etapa

Pagamento é preferência informada ao atendimento; não existe cobrança automática. Frete e disponibilidade são confirmados pela equipe. Envio ao WhatsApp abre a mensagem preenchida para a pessoa confirmar. Lista de reposição e rascunho do carrinho ficam no navegador por conta; pedidos, perfis, endereços e alterações administrativas ficam no banco. Login de ponta a ponta aguarda o cadastro e a confirmação do e-mail do administrador; o agente não criou senha nem enviou mensagens ou pedidos reais.
