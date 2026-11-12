# language: pt
Funcionalidade: Simulador - Cestas basicas
  Como voluntario ou admin
  quero simular quantas cestas consigo montar
  para planejar as compras

  Cenário: Calcular custo da cesta
    Dado que eu tenho produtos
      | nome   | unidade | qtd_por_cesta | estoque | preco  |
      | Arroz  | kg      | 2             | 100     | 5,00   |
      | Feijao | kg      | 1             | 50      | 8,00   |
      | Leite  | litro   | 3             | 200     | 1,50   |
    Então o custo da cesta deve ser 22,50 BRL

  Cenário: Cestas possiveis com o estoque
    Dado que eu tenho produtos
      | nome   | unidade | qtd_por_cesta | estoque | preco  |
      | Arroz  | kg      | 2             | 100     | 5,00   |
      | Feijao | kg      | 1             | 50      | 8,00   |
    Então as cestas possiveis com o estoque devem ser 50

  Cenário: Cestas possiveis com orcamento
    Dado que eu tenho produtos
      | nome   | unidade | qtd_por_cesta | estoque | preco  |
      | Arroz  | kg      | 2             | 0       | 5,00   |
      | Feijao | kg      | 1             | 0       | 10,00  |
    Então com um orcamento de 100,00 BRL as cestas possiveis devem ser 5

  Cenário: Cestas possiveis com orcamento zero
    Dado que eu tenho produtos
      | nome   | unidade | qtd_por_cesta | estoque | preco  |
      | Arroz  | kg      | 2             | 100     | 5,00   |
    Então com um orcamento de 0,00 BRL as cestas possiveis devem ser 0

  Cenário: Faltando itens para comprar
    Dado que eu tenho produtos
      | nome   | unidade | qtd_por_cesta | estoque | preco  |
      | Arroz  | kg      | 2             | 100     | 5,00   |
      | Feijao | kg      | 1             | 50      | 8,00   |
      | Cuscus | kg      | 2             | 30      | 3,00   |
    Então para 40 cestas o custo de reposicao deve ser 150,00 BRL

  Cenário: Sem falta quando estoque cobre
    Dado que eu tenho produtos
      | nome   | unidade | qtd_por_cesta | estoque | preco  |
      | Arroz  | kg      | 2             | 100     | 5,00   |
    Então para 20 cestas nada deve faltar

  Cenário: Faltando todos os itens
    Dado que eu tenho produtos
      | nome   | unidade | qtd_por_cesta | estoque | preco  |
      | Arroz  | kg      | 2             | 0       | 5,00   |
      | Feijao | kg      | 1             | 0       | 8,00   |
    Então para 10 cestas devem faltar 2 itens
