# language: pt
Funcionalidade: Login e Autenticação

  Como um usuário do Cesta Solidária
  Eu quero fazer login com email e senha
  Para acessar o dashboard e gerenciar cestas

  Cenário: Login com credenciais válidas
    Dado que eu estou na página de login
    Quando eu preencho o email "admin@cestasolidaria.org"
    E eu preencho a senha "senha123"
    E eu clico no botão "Entrar"
    Então eu devo ser redirecionado para o dashboard
    E eu devo ver "Bem-vindo" no título

  Cenário: Login com credenciais inválidas
    Dado que eu estou na página de login
    Quando eu preencho o email "errado@email.com"
    E eu preencho a senha "senhaerrada"
    E eu clico no botão "Entrar"
    Então eu devo ver uma mensagem de erro
    E a mensagem deve conter "inválid"

  Cenário: Redirecionamento automático para login
    Dado que eu não estou autenticado
    Quando eu tento acessar "/dashboard"
    Então eu devo ser redirecionado para "/login"
    E a URL deve conter "redirect=/dashboard"