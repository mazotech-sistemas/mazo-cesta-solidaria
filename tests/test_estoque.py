import pandas as pd

from src import estoque


def _df():
    return pd.DataFrame([
        {"id": 1, "nome": "Feijão", "marca": "Camil", "qtd_por_cesta": 3,
         "estoque_atual": 21, "preco_atual": 5.25, "token_tenda": None,
         "ultima_atualizacao_preco": None},
        {"id": 2, "nome": "Arroz", "marca": "Camil", "qtd_por_cesta": 2,
         "estoque_atual": 7, "preco_atual": 20.5, "token_tenda": "arroz-token",
         "ultima_atualizacao_preco": "2026-08-01T10:00:00+00:00"},
    ])


def test_ordenar_por_nome():
    out = estoque.ordenar(_df(), "nome", True)
    assert out.iloc[0]["nome"] == "Arroz"


def test_ordenar_por_preco_decrescente():
    out = estoque.ordenar(_df(), "preco_atual", False)
    assert out.iloc[0]["nome"] == "Arroz"


def test_ordenar_por_custo_cesta():
    out = estoque.ordenar(_df(), "custo_cesta", True)
    assert out.iloc[0]["nome"] == "Feijão"


def test_ordenar_campo_invalido_nao_quebra():
    assert len(estoque.ordenar(_df(), "inexistente", True)) == 2


def test_filtrar_texto():
    assert len(estoque.filtrar(_df(), "arroz", "todos", dias=2)) == 1


def test_filtrar_status_manual():
    assert len(estoque.filtrar(_df(), "", "manual", dias=2)) == 1


def test_filtrar_status_automatico():
    assert len(estoque.filtrar(_df(), "", "automático", dias=2)) == 1


def test_filtrar_status_desatualizado():
    out = estoque.filtrar(_df(), "", "desatualizado", dias=2)
    assert list(out["nome"]) == ["Arroz"]


def test_filtrar_texto_metacaracteres():
    assert len(estoque.filtrar(_df(), "a.r", "todos", dias=2)) == 0


def test_limpar_nan_converte_para_none():
    registros = [{"nome": "Arroz", "token_tenda": float("nan"), "preco_atual": 1.5}]
    out = estoque.limpar_nan(registros)
    assert out[0]["nome"] == "Arroz"
    assert out[0]["token_tenda"] is None
    assert out[0]["preco_atual"] == 1.5


def test_limpar_nan_preserva_original():
    registros = [{"nome": "Arroz", "token_tenda": float("nan")}]
    estoque.limpar_nan(registros)
    assert pd.isna(registros[0]["token_tenda"])


def test_normalizar_ativo_variacoes():
    from src import estoque as mod
    assert mod.normalizar_ativo(True) is True
    assert mod.normalizar_ativo("true") is True
    assert mod.normalizar_ativo("SIM") is True
    assert mod.normalizar_ativo("1") is True
    assert mod.normalizar_ativo("false") is False
    assert mod.normalizar_ativo("0") is False
    assert mod.normalizar_ativo("") is False
    assert mod.normalizar_ativo(None) is False


def test_filtrar_sem_colunas_nome_marca_retorna_inalterado():
    df = pd.DataFrame([{"id": 1, "preco_atual": 1.0}])
    out = estoque.filtrar(df, "arroz", "todos", dias=2)
    assert len(out) == len(df)


def test_filtrar_sem_coluna_token_retorna_inalterado():
    df = pd.DataFrame([{"id": 1, "nome": "Arroz", "marca": "C"}])
    out = estoque.filtrar(df, "", "desatualizado", dias=2)
    assert len(out) == len(df)


def test_somente_ativos_filtra_inativos():
    df = pd.DataFrame([
        {"id": 1, "nome": "Arroz", "ativo": True},
        {"id": 2, "nome": "Feijao", "ativo": False},
        {"id": 3, "nome": "Sal", "ativo": None},
    ])
    out = estoque.somente_ativos(df)
    assert list(out["id"]) == [1]


def test_somente_ativos_sem_coluna_retorna_tudo():
    df = pd.DataFrame([{"id": 1, "nome": "Arroz"}])
    out = estoque.somente_ativos(df)
    assert len(out) == 1


def _produto_valido():
    return {
        "nome": "Arroz",
        "unidade": "5kg",
        "qtd_por_cesta": 2,
        "estoque_atual": 7,
        "preco_atual": 20.5,
        "marca": "Camil",
        "token_tenda": None,
        "url_tenda": None,
        "termo_busca": None,
        "ativo": True,
    }


def test_validar_produto_ok():
    assert estoque.validar_produto(_produto_valido()) == []


def test_validar_produto_nome_unidade_obrigatorios():
    dados = _produto_valido()
    dados["nome"] = "  "
    assert any("nome" in e.lower() for e in estoque.validar_produto(dados))
    dados = _produto_valido()
    dados["unidade"] = ""
    assert any("unidade" in e.lower() for e in estoque.validar_produto(dados))


def test_validar_produto_numeros():
    dados = _produto_valido()
    dados["qtd_por_cesta"] = 0
    assert estoque.validar_produto(dados) != []
    dados = _produto_valido()
    dados["estoque_atual"] = -1
    assert estoque.validar_produto(dados) != []
    dados = _produto_valido()
    dados["preco_atual"] = -0.5
    assert estoque.validar_produto(dados) != []
    dados = _produto_valido()
    dados["qtd_por_cesta"] = "duas"
    assert estoque.validar_produto(dados) != []


def test_validar_produto_url_invalida():
    dados = _produto_valido()
    dados["url_tenda"] = "nao-e-url"
    assert any("url" in e.lower() for e in estoque.validar_produto(dados))
    dados["url_tenda"] = "https://www.tendaatacado.com.br/produto/x"
    assert estoque.validar_produto(dados) == []


def test_montar_patch_so_campos_alterados():
    antigo = {"id": 1, "nome": "Arroz", "marca": "A", "preco_atual": 20.5,
              "qtd_por_cesta": 2, "estoque_atual": 7}
    novo = dict(antigo, nome="Arroz Tipo 1", preco_atual=20.5)
    patch = estoque.montar_patch(antigo, novo)
    assert patch == {"id": 1, "nome": "Arroz Tipo 1"}


def test_montar_patch_nada_alterado():
    antigo = {"id": 1, "nome": "Arroz", "preco_atual": 20.5}
    assert estoque.montar_patch(antigo, dict(antigo)) == {}


def test_montar_patch_id_e_int_nativo():
    import numpy as np

    antigo = {"id": np.int64(1), "nome": "Arroz"}
    patch = estoque.montar_patch(antigo, {"nome": "Arroz Tipo 1"})
    assert patch["id"] == 1 and type(patch["id"]) is int
