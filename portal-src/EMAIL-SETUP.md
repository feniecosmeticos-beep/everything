# Ativação dos e-mails do Portal Fenié

O serviço Resend foi criado no plano Free e conectado apenas ao ambiente de prévia do projeto catalogofenie. Recurso: fenie-portal-email. Domínio verificado, SMTP salvo pelo responsável e modelos de confirmação e recuperação publicados no Supabase. A entrega real de e-mail e o primeiro login ainda aguardam o cadastro do administrador.

1. Abra o recurso Resend pela Vercel: https://vercel.com/d/dashboard/integrations/resend/icfg_KFx8RAktDljiwzrdhO6fGlQR/resources/ir_8HLuXKy7A6sbsD7J
2. No Resend, valide auth.feniecosmeticos.com.br com os registros exatos que o painel fornecer. A zona DNS pública do domínio usa ns902.hostgator.com.br e ns903.hostgator.com.br. Não inventar o valor DKIM nem substituir o MX do domínio principal.
3. Confirme o domínio como Verified. Mantenha desativado o rastreamento de links e aberturas para os e-mails de autenticação.
4. Em Supabase > Authentication > Emails > SMTP Settings, configure remetente acesso@auth.feniecosmeticos.com.br, nome Fenié Professionnel, servidor smtp.resend.com, porta 465, usuário resend. A credencial deve ser inserida diretamente pelo responsável no campo protegido do Supabase. Não enviar chave por chat nem adicionar ao frontend ou ao repositório.
5. Publique confirmation.html em Confirm signup, assunto Confirme seu e-mail — Portal Fenié. Publique recovery.html em Reset password, assunto Recupere seu acesso — Portal Fenié. Estes arquivos usam variáveis do Supabase, não templates da API do Resend.
6. Cadastre e confirme o e-mail do administrador autorizado. Teste entrada, recuperação, aprovação de um cliente e um pedido controlado antes de produção.

Documentação: https://resend.com/docs/send-with-supabase-smtp e https://supabase.com/docs/guides/auth/auth-email-templates
