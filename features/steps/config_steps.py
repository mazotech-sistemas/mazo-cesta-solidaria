"""BDD steps for mazo-cesta-solidaria config/price features."""
from __future__ import annotations

from datetime import timedelta

import behave

from src.config import preco_desatualizado, idade_preco_dias, agora_sp


@behave.given("I set the last price update to {dias:d} day(s) ago")
def step_ultima_atualizacao(context: behave.model.Scenario, dias: int) -> None:
    ultima = agora_sp() - timedelta(days=dias)
    context.context["ultima_atualizacao"] = ultima.isoformat()


@behave.when("I check if the price is stale with {n:d} day(s) tolerance")
def step_preco_stale(context: behave.model.Scenario, n: int) -> None:
    ultima = context.context.get("ultima_atualizacao", None)
    stale = preco_desatualizado(ultima, n)
    context.context["stale"] = stale


@behave.then("the price must be stale")
def step_preco_stale_sim(context: behave.model.Scenario) -> None:
    assert context.context.get("stale") is True, "Preço deveria estar desatualizado"


@behave.then("the price must not be stale")
def step_preco_stale_nao(context: behave.model.Scenario) -> None:
    assert context.context.get("stale") is False, "Preço não deveria estar desatualizado"


@behave.then("the price age must be {n:d} day(s)")
def step_idade_preco(context: behave.model.Scenario, n: int) -> None:
    ultima = context.context.get("ultima_atualizacao", None)
    idade = idade_preco_dias(ultima)
    assert idade is not None, "Idade do preço é None"
    assert idade >= n - 1, f"Idade do preço: esperado {n}, obtido {idade}"
