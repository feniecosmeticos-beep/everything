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

Onze testes dos formulários e retornos de autenticação passaram (`npm test`). `tests/rls.sql` valida permissões, isolamento entre contas, bloqueio de autoaprovação, preços do servidor, parcelas e idempotência em transação com rollback. A execução no projeto isolado passou e não deixou contas ou pedidos fictícios. API pública: 488 produtos/712 opções, HTTP 200. Perfis e pedidos sem login: HTTP 401. Schema privado pela API: HTTP 406. Advisor de segurança sem apontamentos.

## Publicação e autenticação

Portal público: https://fenie-portal.vercel.app/ (projeto Vercel independente fenie-portal). O catálogo público original permanece em https://catalogofenie.vercel.app/.

A antiga prévia catalogofenie-73uj1ajze estava protegida pela Vercel e bloqueava o retorno dos e-mails no celular. Não compartilhar esse endereço com clientes. O Site URL do Supabase e o authSiteUrl da compilação agora apontam para o portal público. Os modelos de confirmação e recuperação usam SiteURL + TokenHash, consumido por verifyOtp após confirmação explícita na página. Isso permite abrir o e-mail em outro navegador, sem depender do verificador PKCE salvo no navegador do cadastro. O token é removido do endereço antes da interface e das imagens; a página usa no-referrer. Tipos aceitos: email e recovery. Links expirados exibem orientação para recuperar acesso.

Publicação: compilar dist/ e publicar apenas esses arquivos no projeto prj_x9viwDxrFO2Yw4Vy9FtRllUvBWHU, equipe team_zVxyPLv78v2KAQHVfo81tSxh. Não substituir o projeto catalogofenie. A branch do portal continua separada e o PR permanece em rascunho até validar o administrador.

O salão de teste já confirmou o e-mail e está pendente de aprovação; basta entrar com a senha existente no endereço novo. A entrega e a confirmação do e-mail anterior foram observadas no banco. O novo fluxo por link ainda exige um teste humano real. O primeiro administrador autorizado ainda precisa se cadastrar e confirmar o próprio e-mail.

## Limites desta etapa

Pagamento é preferência informada ao atendimento; não existe cobrança automática. Frete e disponibilidade são confirmados pela equipe. Envio ao WhatsApp abre a mensagem preenchida para a pessoa confirmar. Lista de reposição e rascunho do carrinho ficam no navegador por conta; pedidos, perfis, endereços e alterações administrativas ficam no banco. O primeiro acesso administrativo e o novo fluxo completo de recuperação aguardam teste humano; o agente não criou senha nem enviou mensagens ou pedidos reais.

O Resend está no plano Free, conectado à prévia. auth.feniecosmeticos.com.br foi verificado; os três registros DNS foram conferidos sem alterar o MX principal. O SMTP do Supabase foi salvo pelo responsável. Os modelos de confirmação e recuperação foram publicados e conferidos no painel. A entrega real e o primeiro login ainda aguardam o cadastro do administrador; veja EMAIL-SETUP.md.

## Consulta de aprovação

O cadastro de cliente só libera pedidos após aprovação pela equipe. Verificar aprovação consulta o perfil no banco, mostra Verificando durante a consulta e um retorno explícito quando continua pendente. Após aprovação, a mesma consulta abre a área do cliente. Não há autoaprovação. O primeiro administrador ainda precisa realizar o cadastro com o e-mail autorizado de forma privada.
