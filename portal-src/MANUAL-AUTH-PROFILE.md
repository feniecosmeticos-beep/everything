# Perfis de usuários criados manualmente

O formulário Create user do Supabase cria uma conta de autenticação sem os metadados application=fenie_portal. O gatilho anterior só criava o perfil comercial quando esse marcador estava presente ou o e-mail estava na lista administrativa. Assim, uma conta criada manualmente podia autenticar e depois receber a mensagem de cadastro ausente no portal.

A migração 20261020135731_manual_auth_profile_creation faz o projeto dedicado ao Portal Fenié criar o perfil também para contas de e-mail provisionadas manualmente. Metadados continuam sendo usados somente nos campos de apresentação. O papel administrativo continua dependendo da lista privada e da confirmação do e-mail; a configuração global de confirmação permanece habilitada. Usuários anônimos não recebem perfil.

O cadastro afetado foi vinculado ao identificador atual da conta, com seus dados de contato e endereço, sem alteração de senha. A sessão existente carregou a área do cliente e exibiu cadastro ativo no navegador.

Validação: tests/manual-auth-profile.sql passou em transação com rollback. Cobertura: criação manual sem metadados, leitura do próprio perfil com RLS, acesso de cliente confirmado, bloqueio antes da confirmação, negação de escalada por metadados e usuário anônimo. Não ficaram contas fictícias.

A correção foi aplicada diretamente ao banco de produção. Não foi necessário recompilar ou substituir o frontend publicado, preservando as atualizações mais recentes do catálogo.

O advisor não apontou falhas de RLS. O aviso existente de proteção contra senhas vazadas continua: esse recurso exige Pro ou superior, enquanto o projeto permanece Free. [Referência do Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
