# E-mails de acesso Fenié

Resend Free configurado; domínio auth.feniecosmeticos.com.br verificado e SMTP salvo pelo responsável no Supabase.

Remetente: acesso@auth.feniecosmeticos.com.br, nome Fenié Professionnel. SMTP smtp.resend.com, porta 465, usuário resend. Não colocar a credencial em arquivos, frontend ou repositório.

Site URL no Supabase: https://fenie-portal.vercel.app/. Os modelos em supabase/templates/ são hospedados pelo Supabase, não pela API de templates do Resend.

- confirmation.html: Confirme seu e-mail — Portal Fenié. Após confirmação, salões entram automaticamente.
- recovery.html: Recupere seu acesso — Portal Fenié.
- invite.html: Seu acesso administrativo — Fenié. Administradores são autorizados na lista privada antes do convite, sem cadastro administrativo público. A pessoa confirma o convite, define a própria senha e entra em /#/admin/entrar.

Os links usam SiteURL e TokenHash. O portal aceita apenas os tipos email, recovery e invite, exige clique antes da verificação e limpa o token do endereço. Não usar a antiga prévia protegida como destino.

Para autorizar outro administrador, o responsável inclui o e-mail exato na tabela privada fenie_private.admin_access. Se já houver perfil com e-mail confirmado, atribuir role admin/status approved via operação administrativa no banco. Para conta nova, usar Authentication > Users > Invite user após autorização do envio. Cada destinatário define sua senha. Não inserir senhas temporárias pelo agente.

Os registros DKIM, SPF e MX do subdomínio foram conferidos na HostGator e no DNS autoritativo. O MX principal foi preservado. Rastreamento de links e aberturas permanece desativado.

Documentação: https://supabase.com/docs/guides/auth/auth-email-templates e https://resend.com/docs/send-with-supabase-smtp.
