import pandas as pd

from src import config

CAMPOS_ORDENACAO = {"nome", "marca", "preco_atual", "estoque_atual", "custo_cesta"}


def ordenar(df: pd.DataFrame, campo: str, crescente: bool = True) -> pd.DataFrame:
    if df.empty or campo not in CAMPOS_ORDENACAO:
        return df
    if campo == "custo_cesta" and "custo_cesta" not in df.columns:
        df = df.copy()
        df["custo_cesta"] = df["qtd_por_cesta"] * df["preco_atual"]
    return df.sort_values(campo, ascending=crescente).reset_index(drop=True)


def limpar_nan(registros: list[dict]) -> list[dict]:
    return [
        {k: (None if pd.isna(v) else v) for k, v in reg.items()}
        for reg in registros
    ]


def filtrar(df: pd.DataFrame, texto: str, status: str, dias: int) -> pd.DataFrame:
    if texto and ("nome" not in df.columns or "marca" not in df.columns):
        return df
    if status in ("automático", "manual", "desatualizado") and "token_tenda" not in df.columns:
        return df
    if status == "desatualizado" and "ultima_atualizacao_preco" not in df.columns:
        return df
    out = df.copy()
    if texto:
        mask = (
            out["nome"].str.contains(texto, case=False, na=False, regex=False)
            | out["marca"].str.contains(texto, case=False, na=False, regex=False)
        )
        out = out[mask]
    if status == "automático":
        out = out[out["token_tenda"].notna()]
    elif status == "manual":
        out = out[out["token_tenda"].isna()]
    elif status == "desatualizado":
        automaticos = out["token_tenda"].notna()
        stale = out["ultima_atualizacao_preco"].apply(
            lambda u: config.preco_desatualizado(u, dias)
        )
        out = out[automaticos & stale]
    return out.reset_index(drop=True)


def normalizar_ativo(valor) -> bool:
    """Converte representacoes comuns de booleano ('false', '0', 'sim'...)."""
    if isinstance(valor, bool):
        return valor
    return str(valor).strip().lower() in ("true", "1", "sim", "s", "yes", "t")


def somente_ativos(df: pd.DataFrame) -> pd.DataFrame:
    """Retorna apenas linhas com ativo == True (sem coluna = tudo)."""
    if df.empty or "ativo" not in df.columns:
        return df
    ativos = df["ativo"].apply(normalizar_ativo)
    return df[ativos].reset_index(drop=True)  # noqa: E712


CAMPOS_EDITAVEIS = (
    "nome", "marca", "unidade", "qtd_por_cesta", "estoque_atual",
    "preco_atual", "token_tenda", "url_tenda", "termo_busca", "ativo",
)


def _eh_numero(valor) -> bool:
    try:
        float(valor)
        return True
    except (TypeError, ValueError):
        return False


def validar_produto(dados: dict) -> list[str]:
    """Valida um produto para criacao/edicao. Retorna lista de erros."""
    erros = []
    if not str(dados.get("nome") or "").strip():
        erros.append("Nome e obrigatorio")
    if not str(dados.get("unidade") or "").strip():
        erros.append("Unidade e obrigatoria")
    qtd = dados.get("qtd_por_cesta")
    if not _eh_numero(qtd) or float(qtd) <= 0:
        erros.append("Qtd por cesta deve ser numerica e maior que zero")
    for campo in ("estoque_atual", "preco_atual"):
        valor = dados.get(campo)
        if valor is None or (isinstance(valor, str) and not valor.strip()):
            continue
        if not _eh_numero(valor) or float(valor) < 0:
            erros.append(f"{campo} deve ser numerico e maior ou igual a zero")
    url = (dados.get("url_tenda") or "")
    if isinstance(url, str) and url.strip() and not url.strip().startswith(("http://", "https://")):
        erros.append("url_tenda deve comecar com http:// ou https://")
    return erros


def montar_patch(antigo: dict, novo: dict) -> dict:
    """Monta PATCH com id + somente campos editaveis alterados."""
    patch = {}
    for campo in CAMPOS_EDITAVEIS:
        if campo not in novo:
            continue
        if not _iguais_patch(antigo.get(campo), novo[campo]):
            patch[campo] = novo[campo]
    if patch:
        patch["id"] = int(antigo.get("id"))
    return patch


def _iguais_patch(a, b) -> bool:
    if a is b or a == b:
        return True
    if pd.isna(a) and pd.isna(b):
        return True
    try:
        return float(a) == float(b)
    except (TypeError, ValueError):
        return False
