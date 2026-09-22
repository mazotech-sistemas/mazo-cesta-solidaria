import sys

import pytest

from src.scraper_tenda import (
    Produto,
    TendaAPIError,
    escolher_mais_barato,
    peso_normalizado,
)


def _p(nome, preco, disponivel=True, slug="x"):
    return Produto(
        sku="1", slug=slug, nome=nome, preco=preco,
        preco_original=None, disponivel=disponivel,
        url=f"https://t/{slug}", imagem_url=None, marca=None,
        unidade=None, descricao=None,
    )


def test_peso_normalizado_variacoes():
    assert peso_normalizado("Oleo de Soja Vitaliv 900ml") == (900, "ml")
    assert peso_normalizado("Acucar Extra Fino 1kg") == (1000, "g")
    assert peso_normalizado("Arroz Tipo 1 5kg Visconde") == (5000, "g")
    assert peso_normalizado("Gelatina Uva 20g Qualimax") == (20, "g")
    assert peso_normalizado("Refresco 18G Frisco") == (18, "g")
    assert peso_normalizado("Produto sem peso") is None


def test_escolhe_marca_mais_barata_mesmo_peso():
    candidatos = [
        _p("Oleo Liza 900ml", 8.99),
        _p("Oleo Vitaliv 900ml", 7.35),
        _p("Oleo Soya 900ml", 7.99),
    ]
    escolhido = escolher_mais_barato(candidatos, alvo=(900, "ml"))
    assert escolhido.preco == 7.35
    assert escolhido.nome.startswith("Oleo Vitaliv")


def test_descarta_peso_diferente_mesmo_produto():
    candidatos = [
        _p("Oleo Vitaliv 500ml", 4.00),
        _p("Oleo Liza 900ml", 8.99),
    ]
    escolhido = escolher_mais_barato(candidatos, alvo=(900, "ml"))
    assert escolhido is not None
    assert escolhido.preco == 8.99


def test_descarta_indisponivel_e_preco_zero():
    candidatos = [
        _p("Oleo Barato 900ml", 0.0),
        _p("Oleo Indisponivel 900ml", 3.00, disponivel=False),
        _p("Oleo Liza 900ml", 8.99),
    ]
    escolhido = escolher_mais_barato(candidatos, alvo=(900, "ml"))
    assert escolhido.preco == 8.99


def test_sem_candidato_compativel_retorna_none():
    candidatos = [_p("Oleo Vitaliv 500ml", 4.00)]
    assert escolher_mais_barato(candidatos, alvo=(900, "ml")) is None
    assert escolher_mais_barato([], alvo=(900, "ml")) is None


def test_nao_confunde_g_com_ml():
    candidatos = [_p("Leite Condensado Caixa 395g", 4.69)]
    assert escolher_mais_barato(candidatos, alvo=(395, "ml")) is None


def test_descarta_produto_fora_do_termo_mesmo_com_peso_certo():
    candidatos = [
        _p("Fubá Mimoso PQ 500g", 2.15),
        _p("Farinha de Milho Amarela PQ 500g", 4.49),
    ]
    # termo pede farinha de milho: fubá tem o peso certo mas nao eh o produto
    escolhido = escolher_mais_barato(candidatos, alvo=(500, "g"),
                                     palavras=["farinha", "milho"])
    assert escolhido is not None
    assert "Farinha de Milho" in escolhido.nome


def test_palavras_comparam_sem_acento_e_ignoram_stopwords():
    assert peso_normalizado("Leite em Pó Integral 400g") == (400, "g")
    candidatos = [_p("Leite Condensado Semidesnatado 395g", 4.69)]
    # termo "leite condensado desnatado 395g": palavra "desnatado" nao consta
    assert escolher_mais_barato(candidatos, alvo=(395, "g"),
                                palavras=["leite", "condensado"]) is not None


if __name__ == "__main__":
    sys.exit(0)


class _ClienteFake:
    region_id = "000010"

    def __init__(self, vencedor=None, preco=7.35):
        self._vencedor = vencedor
        self._preco = preco
        self.chamadas = []

    def buscar_mais_barato(self, termo, unidade_alvo=""):
        self.chamadas.append(("mais_barato", termo, unidade_alvo))
        return self._vencedor

    def buscar_preco_produto(self, token, region_id=None):
        self.chamadas.append(("preco_direto", token, region_id))
        return {"preco": self._preco}


def test_cotar_com_termo_retorna_vencedor():
    from src import scraper_tenda

    vencedor = _p("Oleo Vitaliv 900ml", 7.35, slug="oleo-vitaliv-900ml")
    vencedor.marca = "Vitaliv"
    cliente = _ClienteFake(vencedor=vencedor)
    prod = {"id": 1, "nome": "Oleo", "unidade": "900ml", "token_tenda": "antigo", "termo_busca": "oleo de soja 900ml"}
    cot = scraper_tenda.cotar_produto(prod, cliente)
    assert cot == {"preco": 7.35, "slug": "oleo-vitaliv-900ml", "marca": "Vitaliv"}
    assert cliente.chamadas[0][0] == "mais_barato"


def test_cotar_com_termo_sem_match_retorna_none():
    from src import scraper_tenda

    cliente = _ClienteFake(vencedor=None)
    prod = {"id": 1, "nome": "Oleo", "unidade": "900ml", "token_tenda": "antigo", "termo_busca": "oleo 900ml"}
    assert scraper_tenda.cotar_produto(prod, cliente) is None


def test_cotar_sem_termo_usa_token_direto():
    from src import scraper_tenda

    cliente = _ClienteFake(preco=2.79)
    prod = {"id": 2, "nome": "Acucar", "unidade": "1kg", "token_tenda": "acucar-token"}
    cot = scraper_tenda.cotar_produto(prod, cliente)
    assert cot == {"preco": 2.79, "slug": "acucar-token", "marca": ""}
    assert cliente.chamadas[0] == ("preco_direto", "acucar-token", "000010")


def test_cotar_erro_de_rede_propaga():
    from src import scraper_tenda

    class _ClienteErro:
        region_id = "000010"

        def buscar_preco_produto(self, token, region_id=None):
            raise TendaAPIError(500, "falha")

    with pytest.raises(TendaAPIError):
        scraper_tenda.cotar_produto({"id": 1, "token_tenda": "x"}, _ClienteErro())


def test_cotar_termo_com_peso_diferente_retorna_none():
    from src import scraper_tenda

    class _ClienteFake:
        region_id = "000010"

        def __init__(self, vencedor):
            self._vencedor = vencedor

        def buscar_mais_barato(self, termo, unidade_alvo=""):
            return self._vencedor

        def buscar_preco_produto(self, token, region_id=None):
            return {"preco": 7.35}

    # Produto pede 5kg, vencedor veio com 1kg -> deve rejeitar
    vencedor_1kg = _p("Arroz Tipo 1 1kg", 4.49, slug="arroz-1kg")
    cliente = _ClienteFake(vencedor=vencedor_1kg)
    prod = {"id": 1, "nome": "Arroz Tipo 1 (5kg)", "unidade": "5kg", "token_tenda": "antigo", "termo_busca": "arroz 5kg"}
    assert scraper_tenda.cotar_produto(prod, cliente) is None
    # Mesmo produto, peso ok -> deve aceitar
    vencedor_5kg = _p("Arroz Tipo 1 Visconde 5kg", 18.49, slug="arroz-visconde-5kg")
    cliente2 = _ClienteFake(vencedor=vencedor_5kg)
    cot = scraper_tenda.cotar_produto(prod, cliente2)
    assert cot is not None
    assert cot["preco"] == 18.49
    assert cot["slug"] == "arroz-visconde-5kg"


def test_cotar_termo_unidade_vazia_extrai_peso_do_nome():
    """Produto com unidade vazia no banco mas peso no nome deve ser protegido."""
    from src import scraper_tenda

    class _ClienteFake:
        region_id = "000010"

        def __init__(self, vencedor):
            self._vencedor = vencedor

        def buscar_mais_barato(self, termo, unidade_alvo=""):
            return self._vencedor

        def buscar_preco_produto(self, token, region_id=None):
            return {"preco": 7.35}

    # Arroz com unidade='' no banco, nome tem (5kg); vencedor 1kg deve ser rejeitado
    vencedor_1kg = _p("Arroz Tipo 1 1kg", 4.49, slug="arroz-1kg")
    cliente = _ClienteFake(vencedor=vencedor_1kg)
    prod = {"id": 25, "nome": "Arroz Tipo 1 (5kg)", "unidade": "", "token_tenda": "antigo", "termo_busca": "arroz 5kg"}
    assert scraper_tenda.cotar_produto(prod, cliente) is None
    # Vencedor 5kg deve ser aceito
    vencedor_5kg = _p("Arroz Tipo 1 Visconde 5kg", 18.49, slug="arroz-visconde-5kg")
    cliente2 = _ClienteFake(vencedor=vencedor_5kg)
    cot = scraper_tenda.cotar_produto(prod, cliente2)
    assert cot is not None
    assert cot["preco"] == 18.49


def test_cotar_termo_sem_unidade_no_produto_aceita_qualquer_peso():
    from src import scraper_tenda

    class _ClienteFake:
        region_id = "000010"

        def __init__(self, vencedor):
            self._vencedor = vencedor

        def buscar_mais_barato(self, termo, unidade_alvo=""):
            return self._vencedor

        def buscar_preco_produto(self, token, region_id=None):
            return {"preco": 7.35}

    # Produto sem unidade definida no banco -> aceita qualquer peso
    vencedor_1kg = _p("Acucar Cristal 1kg", 2.89, slug="acucar-1kg")
    cliente = _ClienteFake(vencedor=vencedor_1kg)
    prod = {"id": 2, "nome": "Acucar (1kg)", "unidade": "", "token_tenda": "acucar-old", "termo_busca": "acucar 1kg"}
    cot = scraper_tenda.cotar_produto(prod, cliente)
    assert cot is not None
    assert cot["preco"] == 2.89
