-- Decisão da Fenié (21/10/2026): clientes importados entram com a senha inicial padrão,
-- sem troca obrigatória no primeiro acesso. Aplicado diretamente no banco nesta data.
-- Risco aceito: quem souber a senha padrão e o telefone/e-mail de um salão acessa a conta dele.
update public.fenie_profiles set must_change_password=false where must_change_password;
