Feature: Detectao de precos desatualizados
  Como admin
  quero saber quais precos estao desatualizados
  para manter o custo da cesta atualizado

  @regressao
  Scenario: Preco atualizado ha 1 dia nao e desatualizado
    Dado que configuro a ultima atualizacao de preco para 1 dia(s) atras
    Quando o preço deve ser considerado desatualizado com 2 dia(s) de tolerancia
    Entao o preço NÃO deve estar desatualizado

  @regressao
  Scenario: Preco atualizado ha 5 dias e desatualizado
    Dado que configuro a ultima atualizacao de preco para 5 dia(s) atras
    Quando o preço deve ser considerado desatualizado com 2 dia(s) de tolerancia
    Entao o preço deve estar desatualizado

  @regressao
  Scenario: Preco sem historico e desatualizado
    Dado que configuro a ultima atualizacao de preco para 999 dia(s) atras
    Quando o preço deve ser considerado desatualizado com 2 dia(s) de tolerancia
    Entao o preço deve estar desatualizado
