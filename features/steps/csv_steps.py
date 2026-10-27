"""BDD steps for mazo-cesta-solidaria CSV features."""
from __future__ import annotations

import behave
import pandas as pd
from behave.model import Table

from src.csv_io import produtos_to_csv, validar_csv, avisos_csv


@behave.when("I export the products to CSV")
def step_exportar_csv(context: behave.model.Scenario) -> None:
    context.context["csv"] = produtos_to_csv(context.df)


@behave.then("the CSV must contain the row")
def step_csv_contem(context: behave.model.Scenario) -> None:
    table = context.table
    if not table:
        return
    csv_text = context.context.get("csv", "")
    assert csv_text, "CSV está vazio"
    # Check each cell in the row appears in the CSV
    for row in table:
        for cell in row:
            assert str(cell) in csv_text, f"Célula '{cell}' não encontrada no CSV:\n{csv_text}"


@behave.given("I import the CSV")
def step_importar_csv(context: behave.model.Scenario) -> None:
    table = context.table
    rows = [dict(row.items()) for row in table] if table else []
    # Map English column names to src/ expected keys
    mapping = {"name": "nome", "qty_per_basket": "qtd_por_cesta",
               "stock": "estoque_atual", "price": "preco_atual", "brand": "marca"}
    mapped = [{mapping.get(k, k): v for k, v in row.items()} for row in rows]
    context.df_import = pd.DataFrame(mapped)


@behave.when("I validate the imported CSV")
def step_validar_csv(context: behave.model.Scenario) -> None:
    context.context["erros_csv"] = validar_csv(context.df_import)
    context.context["avisos_csv"] = avisos_csv(context.df_import)


@behave.then("the CSV must be valid")
def step_csv_valido(context: behave.model.Scenario) -> None:
    assert not context.context["erros_csv"], f"CSV inválido: {context.context['erros_csv']}"


@behave.then("the CSV must contain {n:d} error(s)")
def step_csv_erros(context: behave.model.Scenario, n: int) -> None:
    assert len(context.context["erros_csv"]) == n, (
        f"Esperava {n} erro(s), obtive {len(context.context['erros_csv'])}: {context.context['erros_csv']}"
    )


@behave.then("the CSV must contain the warning '{texto}'")
def step_csv_avisos(context: behave.model.Scenario, texto: str) -> None:
    avisos_txt = " | ".join(context.context["avisos_csv"])
    assert texto in avisos_txt, f"Aviso '{texto}' não encontrado em: {context.context['avisos_csv']}"


@behave.then("the CSV must have no warnings")
def step_csv_sem_avisos(context: behave.model.Scenario) -> None:
    assert not context.context["avisos_csv"], f"Avisos inesperados: {context.context['avisos_csv']}"
