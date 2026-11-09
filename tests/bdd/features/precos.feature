# language: pt
Funcionalidade: Precos - Detecao de preco desatualizado
  Como admin
  quero saber quais precos estao desatualizados
  para manter o custo da cesta atualizado

  Cenário: Preco atualizado ha 1 dia não e desatualizado
    Dado que a ultima atualizacao de preco foi ha 1 dia(s)
    Quando eu considero um tolerancia de 2 dia(s)
    Entao o preço NÃO deve estar desatualizado

  Cenário: Preco atualizado ha 5 dias e desatualizado
    Dado que a ultima atualizacao de preco foi ha 5 dia(s)
    Quando eu considero um tolerancia de 2 dia(s)
    Entao o preço deve estar desatualizado

  Cenário: Preco sem historico e desatualizado
    Dado que a ultima atualizacao de preco foi ha 999 dia(s)
    Quando eu considero um tolerancia de 7 dia(s)
    Entao o preço deve estar desatualizado
