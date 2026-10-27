Feature: Simulacao de cestas basicas
  Como voluntario ou admin do sistema
  quero simular quantas cestas consigo fazer
  para planejar as compras

  @regressao
  Scenario: Calcular custo da cesta
    Given I have products
      | name   | unit  | qty_per_basket | stock | price |
      | Arroz  | kg    | 2              | 100   | 5.00  |
      | Feijao | kg    | 1              | 50    | 8.00  |
      | Leite  | litro | 3              | 200   | 1.50  |
    Then the basket cost must be 22.50 BRL

  @regressao
  Scenario: Cestas possiveis com o estoque
    Given I have products
      | name   | unit  | qty_per_basket | stock | price |
      | Arroz  | kg    | 2              | 100   | 5.00  |
      | Feijao | kg    | 1              | 50    | 8.00  |
    Then the max baskets from stock must be 50

  @regressao
  Scenario: Cestas possiveis com orcamento
    Given I have products
      | name   | unit  | qty_per_basket | stock | price |
      | Arroz  | kg    | 2              | 0     | 5.00  |
      | Feijao | kg    | 1              | 0     | 10.00 |
    Then with a budget of 100.00 BRL, the max baskets must be 5

  @regressao
  Scenario: Cestas possiveis com orcamento zero
    Given I have products
      | name   | unit  | qty_per_basket | stock | price |
      | Arroz  | kg    | 2              | 100   | 5.00  |
    Then with a budget of 0.00 BRL, the max baskets must be 0

  @regressao
  Scenario: Faltando itens para comprar
    Given I have products
      | name   | unit  | qty_per_basket | stock | price |
      | Arroz  | kg    | 2              | 100   | 5.00  |
      | Feijao | kg    | 1              | 50    | 8.00  |
      | Cuscus | kg    | 2              | 30    | 3.00  |
    Then for 40 baskets, the restock cost must be 150.00 BRL

  @regressao
  Scenario: Sem falta de itens quando estoque suficiente
    Given I have products
      | name   | unit  | qty_per_basket | stock | price |
      | Arroz  | kg    | 2              | 100   | 5.00  |
    Then nothing must be missing for 20 baskets

  @regressao
  Scenario: Faltando todos os itens
    Given I have products
      | name   | unit  | qty_per_basket | stock | price |
      | Arroz  | kg    | 2              | 0     | 5.00  |
      | Feijao | kg    | 1              | 0     | 8.00  |
    Then for 10 baskets, 2 item(s) must be missing
