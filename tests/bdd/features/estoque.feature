# language: pt
Funcionalidade: Estoque - Validacao de produto
  Como admin
  quero criar produtos validados no estoque
  para nao salvar dados inconsistentes

  Cenário: Criar produto válido
    Dado que eu crio um produto
      | nome    | unidade | qtd_por_cesta | estoque | preco  |
      | Arroz   | kg      | 2             | 100     | 8,50   |
    Quando eu valido o produto
    Então o produto deve ser válido

  Cenário: Produto sem nome deve ser inválido
    Dado que eu crio um produto
      | unidade | qtd_por_cesta |
      | kg      | 2             |
    Quando eu valido o produto
    Então o produto deve ser inválido
    E deve haver 1 erro de validacao

  Cenário: Produto com qtd_por_cesta zero deve ser inválido
    Dado que eu crio um produto
      | nome   | unidade | qtd_por_cesta |
      | Feijao | kg      | 0             |
    Quando eu valido o produto
    Então o produto deve ser inválido

  Cenário: Produto com estoque negativo deve ser inválido
    Dado que eu crio um produto
      | nome    | unidade | qtd_por_cesta | estoque |
      | Farinha | kg      | 1             | -5      |
    Quando eu valido o produto
    Então o produto deve ser inválido

  Cenário: Produto com preco negativo deve ser inválido
    Dado que eu crio um produto
      | nome  | unidade | qtd_por_cesta | preco   |
      | Leite | litro   | 1             | -10,00  |
    Quando eu valido o produto
    Então o produto deve ser inválido

  Cenário: Produto com url_tenda fora do formato Tenda deve ser inválido
    Dado que eu crio um produto
      | nome    | unidade | qtd_por_cesta | url_tenda          |
      | Azeite  | kg      | 1             | tenda.com.br/xyz   |
    Quando eu valido o produto
    Então o produto deve ser inválido

  Cenário: Produto com url_tenda válido
    Dado que eu crio um produto
      | nome    | unidade | qtd_por_cesta | url_tenda                         |
      | Azeite  | kg      | 1             | https://www.tendaatacado.com.br/produto/xyz |
    Quando eu valido o produto
    Então o produto deve ser válido
