Feature: Validacao de produtos no estoque
  Como admin do sistema de cestas solidarias
  quero garantir que produtos sejam validados corretamente
  para evitar dados inconsistentes no estoque

  @regressao
  Scenario: Criar produto válido
    Given I create a product
      | name    | unit    | qty_per_basket | stock | price |
      | Arroz   | kg      | 2              | 100   | 8.50  |
    When I validate the product
    Then the product must be valid

  @regressao
  Scenario: Produto sem nome deve ser inválido
    Given I create a product
      | name | unit | qty_per_basket |
      |      | kg   | 2              |
    When I validate the product
    Then the product must be invalid
    And it must contain 1 validation error

  @regressao
  Scenario: Produto com quantidade zero deve ser inválido
    Given I create a product
      | name   | unit | qty_per_basket |
      | Feijao | kg   | 0              |
    When I validate the product
    Then the product must be invalid

  @regressao
  Scenario: Produto com quantidade negativa deve ser inválido
    Given I create a product
      | name   | unit | qty_per_basket |
      | Feijao | kg   | -1             |
    When I validate the product
    Then the product must be invalid

  @regressao
  Scenario: Produto com estoque negativo deve ser inválido
    Given I create a product
      | name    | unit | qty_per_basket | stock |
      | Farinha | kg   | 1              | -5    |
    When I validate the product
    Then the product must be invalid

  @regressao
  Scenario: Produto com preco negativo deve ser inválido
    Given I create a product
      | name  | unit  | qty_per_basket | price |
      | Leite | litro | 1              | -10.0 |
    When I validate the product
    Then the product must be invalid

  @regressao
  Scenario: Produto com url_tenda inválida deve ser inválido
    Given I create a product
      | name   | unit | qty_per_basket | url_tenda        |
      | Aceite | kg   | 1              | tenda.com.br/xyz |
    When I validate the product
    Then the product must be invalid

  @regressao
  Scenario: Produto com url_tenda válida
    Given I create a product
      | name   | unit | qty_per_basket | url_tenda                  |
      | Aceite | kg   | 1              | https://tenda.com.br/xyz   |
    When I validate the product
    Then the product must be valid

  @regressao
  Scenario: Produto sem unidade deve ser inválido
    Given I create a product
      | name   | qty_per_basket |
      | Cuscus | 1              |
    When I validate the product
    Then the product must be invalid
