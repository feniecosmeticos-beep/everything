# Migração de clientes e primeiro acesso

Clientes importados usam e-mail e senha ou telefone brasileiro completo e senha. Cadastros existentes mantêm suas credenciais; a importação não atribui privilégios administrativos.

O acesso por telefone usa um identificador interno não entregável no Supabase Auth. O endereço interno não é um contato do cliente: `fenie_profiles.email` fica vazio. A associação entre telefone e usuário reside em `fenie_private.phone_logins`, sem acesso pelas APIs de clientes. O provedor nativo de SMS permanece desativado.

`fenie-phone-login` confere a senha no Auth e devolve uma sessão normal. O endpoint aceita apenas clientes ativos, limita tentativas por conta, origem de rede e projeto, e responde sem revelar a existência de um telefone. As origens permitidas são o portal de produção e a prévia local de desenvolvimento.

Novas contas importadas recebem `must_change_password=true`. A criação ocorre sem confirmação inicial; a conta é confirmada pelo Admin API somente após a verificação do bloqueio no perfil. As permissões do banco impedem acesso a produtos, endereços e pedidos durante essa etapa. O usuário só consegue ler seu próprio perfil para concluir o primeiro acesso.

`fenie-password-change` valida a sessão, verifica a senha atual através do Auth, atualiza a senha e, somente após sucesso, remove o bloqueio pelo servidor. Alterar metadados editáveis, navegar diretamente para o catálogo ou alterar um hash no Auth não libera o perfil. A aplicação não contém a senha inicial da migração.

Clientes que entram por telefone recuperam o acesso pelo atendimento Fenié. Não existe envio de SMS ou de confirmação de e-mail durante a importação. Novos cadastros públicos por e-mail continuam com a confirmação habitual.

O controle de reimportação em `fenie_private.client_migrations` guarda apenas a chave derivada da origem e o ID do usuário. A execução de importação é temporária, restrita ao lote autorizado e encerrada após a conferência. Arquivos de clientes, senhas e configuração da execução não pertencem ao repositório nem à publicação.

Validação: testes do identificador, testes transacionais de isolamento e bloqueio, entrada real por telefone, troca de senha por API com conta temporária e conferência das contagens no banco. A conta temporária é removida após o teste.
