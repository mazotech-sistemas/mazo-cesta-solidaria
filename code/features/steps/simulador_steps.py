"""BDD steps for mazo-cesta-solidaria basket simulation features."""
from __future__ import annotations

import behave
from behave.model import Table

from src.calc import custo_cesta, cestas_possiveis_estoque, cestas_possiveis_orcamento, faltando_comprar


@behave.then("the basket cost must be {valor} BRL")
def step_custo_cesta(context: behave.model.Scenario, valor: str) -> None:
    esperado = float(valor)
    actual = custo_cesta(context.df)
    assert abs(actual - esperado) < 0.01, f"Custo esperado {esperado}, obtido {actual}"


@behave.then("the max baskets from stock must be {n:d}")
def step_cestas_estoque(context: behave.model.Scenario, n: int) -> None:
    actual = cestas_possiveis_estoque(context.df)
    assert actual == n, f"Cestas com estoque: esperado {n}, obtido {actual}"


@behave.then("with a budget of {valor} BRL, the max baskets must be {n:d}")
def step_cestas_orcamento(context: behave.model.Scenario, valor: str, n: int) -> None:
    actual = cestas_possiveis_orcamento(context.df, float(valor))
    assert actual == n, f"Cestas com orçamento {valor}: esperado {n}, obtido {actual}"


@behave.then("for {n:d} baskets, the restock cost must be {valor} BRL")
def step_custo_reposicao(context: behave.model.Scenario, n: int, valor: str) -> None:
    esperado = float(valor)
    faltantes = faltando_comprar(context.df, n)
    actual = float(faltantes["custo_reposicao"].sum()) if not faltantes.empty else 0.0
    assert abs(actual - esperado) < 0.01, f"Custo reposição: esperado {esperado}, obtido {actual}"


@behave.then("for {n:d} baskets, {esperado:d} item(s) must be missing")
def step_faltando(context: behave.model.Scenario, n: int, esperado: int) -> None:
    faltantes = faltando_comprar(context.df, n)
    assert len(faltantes) == esperado, f"Faltando {n} cesta(s): esperado {esperado}, obtido {len(faltantes)}"


@behave.then("nothing must be missing for {n:d} baskets")
def step_nada_faltando(context: behave.model.Scenario, n: int) -> None:
    faltantes = faltando_comprar(context.df, n)
    assert faltantes.empty, f"Para {n} cesta(s), faltam: {list(faltantes['nome'].values)}"
