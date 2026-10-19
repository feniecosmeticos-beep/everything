# Portal Fenié com Supabase

Portal público: https://fenie-portal.vercel.app/. Variante independente do catálogo estático em https://catalogofenie.vercel.app/.

## Clientes e equipe

Salões fazem o cadastro comum e confirmam o e-mail. O banco libera o acesso automaticamente; não há aprovação manual pela equipe. O salão de teste existente já está ativo.

Administradores usam somente o login em /#/admin/entrar. Os e-mails autorizados são mantidos na tabela privada fenie_private.admin_access, sem lista no frontend e sem cadastro público administrativo. O responsável provisiona as autorizações e envia convites individuais pelo Supabase. Cada pessoa ativa o convite e cria sua própria senha. Um e-mail ainda não confirmado não recebe privilégios. Alterar para um e-mail fora da lista remove o papel administrativo; revogar a lista impede acesso imediatamente na próxima operação autorizada pelo banco.

O painel oferece gestão de produtos, preços, publicação, destaques, dados dos salões e atendimento de pedidos.

### Painel de produtos (/#/admin/catalogo)

- Busca por nome, marca, categoria ou código; filtros por marca e situação (publicados, ocultos, sem foto, marca a confirmar, sem categoria).
- Edição completa: nome, marca, categoria, embalagem, foto, opções comerciais (rótulo, código e preço; adicionar e remover), publicação e destaque.
- Fotos: envio de JPG, PNG ou WEBP até 5 MB para o bucket público `fenie-produtos` (gravação só por administradores) ou link https.
- Cadastro de produto novo e exclusão com confirmação em dois cliques. Pedidos já feitos guardam cópia dos itens e não são afetados.
- Códigos internos das opções são preservados ao editar, para não quebrar carrinhos e históricos. As alterações de produtos afetam este portal. A publicação estática anterior continua separada.

## Execução e publicação

Node.js 22 ou superior. npm ci, npm test, npm run build. Compilar dist/ e publicar somente seus arquivos no projeto Vercel fenie-portal (prj_x9viwDxrFO2Yw4Vy9FtRllUvBWHU), equipe team_zVxyPLv78v2KAQHVfo81tSxh. O frontend usa apenas a URL e a chave publicável do Supabase em public-config.json. Não adicionar chaves secretas.

## Banco e segurança

Projeto Supabase gxqhblahdqkhiuiocyqc, região sa-east-1. Cinco migrações aplicadas e alinhadas ao histórico remoto. A migração automatic_client_access_and_named_admins substitui o fluxo de aprovação pelo acesso após confirmação, preserva bloqueios explícitos existentes, transforma a autorização inicial em lista administrativa persistente e retira o RPC de aprovação manual.

RLS em todas as tabelas expostas. Clientes leem apenas seus dados; a equipe autorizada gerencia o catálogo e os pedidos. Os papéis não vêm de user_metadata. Os preços são calculados no servidor, pedidos guardam snapshot, forma de pagamento e idempotência. Anotações internas ficam separadas dos dados do cliente. Base importada: 488 grupos e 712 opções.

## E-mails e retornos

Site URL: https://fenie-portal.vercel.app/. Os templates confirmation, recovery e invite usam SiteURL + TokenHash. O portal remove o token do endereço, usa no-referrer e só verifica após o clique da pessoa. A confirmação não depende do navegador original do cadastro. Convites abrem a definição da própria senha e retornam ao login administrativo.

Resend Free, domínio auth.feniecosmeticos.com.br verificado, SMTP salvo pelo responsável. DNS configurado sem alterar o MX principal. Veja EMAIL-SETUP.md.

## Validação e limites

12 testes de formulários e navegação passaram. tests/rls.sql passou em transação com rollback: liberação automática de clientes confirmados, negação a não confirmados, administradores apenas por lista e e-mail verificado, mudança de e-mail, isolamento, bloqueio de escalada por metadados, preços do servidor, parcelas, idempotência e notas internas.

Os arquivos públicos respondem HTTP 200 sem login Vercel e correspondem ao build local. O cadastro de teste confirmou o e-mail e já foi liberado no banco. A ativação real dos convites administrativos e o primeiro login administrativo aguardam os destinatários.

O advisor não apontou falhas de RLS. Há um aviso de proteção contra senhas vazadas desativada: esse recurso requer Pro ou superior, enquanto o projeto permanece Free. Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

Pagamento é preferência informada ao atendimento; não há cobrança automática. Envio ao WhatsApp abre a mensagem para o cliente confirmar. Nenhuma senha foi criada pelo agente, nem houve envio de pedidos reais.
