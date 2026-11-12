"""BDD steps for mazo-cesta-solidaria estoque features."""
from __future__ import annotations

from typing import Any

import behave
import pandas as pd
from behave.model import Table

from src.estoque import validar_produto, normalizar_ativo


def _parse_table(table: Table) -> list[dict[str, Any]]:
    """Convert behave Table to list of dicts with numeric coercion."""
    rows: list[dict[str, Any]] = []
    numeric_cols = ("qty_per_basket", "stock", "price", "id")
    for row in table:
        d: dict[str, Any] = {}
        for k, v in row.items():
            if k in numeric_cols:
                try:
                    d[k] = float(v)
                except (ValueError, TypeError):
                    d[k] = v
            else:
                d[k] = v
        rows.append(d)
    return rows


def _to_src_dict(d: dict[str, Any]) -> dict[str, Any]:
    """Map English column names to src/ dict keys."""
    mapping = {
        "name": "nome",
        "unit": "unidade",
        "qty_per_basket": "qtd_por_cesta",
        "stock": "estoque_atual",
        "price": "preco_atual",
        "url_tenda": "url_tenda",
        "brand": "marca",
    }
    return {mapping.get(k, k): v for k, v in d.items()}


@behave.given("I create a product")
def step_criar_produto(context: behave.model.Scenario) -> None:
    table = context.table
    rows = _parse_table(table) if table else []
    context.context["produto"] = _to_src_dict(rows[0]) if rows else {}


@behave.given("I have products")
def step_produtos(context: behave.model.Scenario) -> None:
    table = context.table
    context.df = pd.DataFrame([_to_src_dict(r) for r in _parse_table(table)]) if table else pd.DataFrame()
    if not context.df.empty:
        context.df["ativo"] = True


@behave.when("I validate the product")
def step_validar_produto(context: behave.model.Scenario) -> None:
    produto = context.context.get("produto", {})
    erros = validar_produto(produto)
    context.context["erros"] = erros
    context.context["valido"] = not erros


@behave.then("the product must be valid")
def step_produto_valido(context: behave.model.Scenario) -> None:
    assert context.context["valido"], f"Produto inválido: {context.context.get('erros')}"


@behave.then("the product must be invalid")
def step_produto_invalido(context: behave.model.Scenario) -> None:
    assert not context.context["valido"], "Produto deveria ser inválido"


@behave.then("it must contain {n:d} validation error")
def step_qtd_erros(context: behave.model.Scenario, n: int) -> None:
    assert len(context.context["erros"]) == n, (
        f"Esperava {n} erro(s), obtive {len(context.context['erros'])}: {context.context['erros']}"
    )


@behave.then("it must contain the error '{texto}'")
def step_contem_erro(context: behave.model.Scenario, texto: str) -> None:
    erros_txt = " | ".join(context.context["erros"])
    assert texto in erros_txt, f"Erro '{texto}' não encontrado em: {context.context['erros']}"


@behave.then("the product must be inactive when active value is {valor}")
def step_ativo(context: behave.model.Scenario, valor: str) -> None:
    ativo = normalizar_ativo(valor)
    context.context["ativo"] = ativo
