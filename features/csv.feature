Feature: Importacao e exportacao de CSV
  Como admin
  quero importar e exportar produtos via CSV
  para facilitar a gestao do estoque

  @regressao
  Scenario: Exportar produtos para CSV
    Given I have products
      | name   | brand  | unit | qty_per_basket | stock | price |
      | Arroz  | Camil  | kg   | 2              | 100   | 5.00  |
      | Feijao | Aurora | kg   | 1              | 50    | 8.00  |
    When I export the products to CSV
    Then the CSV must contain the row
      | name   | unit | qty_per_basket |
      | Arroz  | kg   | 2              |

  @regressao
  Scenario: Importar CSV válido
    Given I import the CSV
      | name   | qty_per_basket | stock | price |
      | Arroz  | 2              | 100   | 5.00  |
      | Feijao | 1              | 50    | 8.00  |
    When I validate the imported CSV
    Then the CSV must be valid

  @regressao
  Scenario: Importar CSV com coluna obrigatoria ausente
    Given I import the CSV
      | brand | stock |
      | Camil | 100   |
    When I validate the imported CSV
    Then the CSV must contain 2 error(s)

  @regressao
  Scenario: Importar CSV com nome vazio
    Given I import the CSV
      | name | qty_per_basket | stock |
      |      | 2              | 100   |
    When I validate the imported CSV
    Then the CSV must contain 1 error(s)

  @regressao
  Scenario: Importar CSV com qtd_por_cesta zero
    Given I import the CSV
      | name  | qty_per_basket | stock |
      | Arroz | 0              | 100   |
    When I validate the imported CSV
    Then the CSV must contain 1 error(s)
