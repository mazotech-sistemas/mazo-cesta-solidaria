import traceback

import pandas as pd
import streamlit as st

from src import auth, config, csv_io, db, estoque
from src.ui import (
    carregar_dias_stale_cached,
    carregar_produtos_cached,
    confirmation_dialog,
    flash,
    listar_desatualizados,
    load_css,
    render_flash,
    render_page_header,
    render_sidebar,
)

load_css()
render_flash()

user = auth.require_login()
eh_admin = auth.is_admin(user)

with st.sidebar:
    render_sidebar()

render_page_header("Estoque e Produtos", "Gerencie produtos, estoque, tokens Tenda e preços")

token = auth.get_token()

# ===== CARREGAR DADOS =====
carregar_produtos = carregar_produtos_cached
carregar_dias_stale = carregar_dias_stale_cached


def formulario_novo_produto():
    """Formulario inline de criacao de produto (usado no estoque vazio e no fim da pagina)."""
    with st.expander("Novo Produto", expanded=True), st.form("novo_produto_form"):
        c1, c2 = st.columns(2)
        with c1:
            nome = st.text_input("Nome do produto *", placeholder="Ex: Arroz (5kg)")
            marca = st.text_input("Marca", placeholder="Opcional")
            unidade = st.text_input("Unidade *", placeholder="Ex: 5kg")
        with c2:
            qtd = st.number_input("Qtd por cesta *", min_value=0.1, value=1.0, step=0.5)
            est = st.number_input("Estoque atual *", min_value=0.0, value=0.0, step=0.1)
            preco = st.number_input("Preço unitário (R$) *", min_value=0.0, value=0.0, step=0.01)
        token_t = st.text_input("Token Tenda (opcional)", placeholder="Código do produto no Tenda Atacado")
        url_t = st.text_input("URL Tenda (opcional)", placeholder="https://...")
        termo_b = st.text_input(
            "Termo de busca de marca mais barata (opcional)",
            placeholder="Ex: oleo de soja 900ml",
            help="Se preenchido, a automação diária busca este termo e grava sempre a marca mais barata com o mesmo peso/volume.",
        )
        ativo = st.checkbox("Ativo", value=True)

        if st.form_submit_button("Criar Produto", type="primary"):
            if not nome or not unidade:
                st.error("Nome e unidade são obrigatórios")
            else:
                # Sem chave id: o default (bigserial) so se aplica
                # quando a coluna nao vem no payload.
                novo = [{
                    "nome": nome, "marca": marca or "", "unidade": unidade,
                    "qtd_por_cesta": qtd, "estoque_atual": est, "preco_atual": preco,
                    "token_tenda": token_t or None, "url_tenda": url_t or None,
                    **({"termo_busca": termo_b} if termo_b else {}),
                    "ativo": ativo, "ultima_atualizacao_preco": None
                }]
                try:
                    db.upsert_produtos(novo, token)
                    flash(f"Produto {nome} criado!")
                    st.session_state["show_new_form"] = False
                    st.cache_data.clear()
                    st.rerun()
                except Exception:
                    traceback.print_exc()
                    st.error("Erro ao criar produto. Tente novamente.")


with st.spinner("Carregando produtos..."):
    try:
        df = pd.DataFrame(carregar_produtos(user["user_id"], token))
        dias_stale = carregar_dias_stale(user["user_id"], token)
    except Exception:
        traceback.print_exc()
        st.error("Erro ao carregar dados.")
        st.stop()

if df.empty:
    st.info("Nenhum produto cadastrado. Use o formulario abaixo para criar o primeiro.")
    formulario_novo_produto()
    st.stop()

# ===== COLUNAS DE EXIBICAO E CALCULOS =====
df["custo_cesta"] = df["qtd_por_cesta"] * df["preco_atual"]

# Filtros
col_a, col_b, col_c, col_d = st.columns([1, 1, 2, 1])
with col_a:
    campo = st.selectbox("Ordenar por", ["nome", "preco_atual", "estoque_atual", "custo_cesta"], key="estoque_ordenar")
with col_b:
    crescente = st.radio("Direção", ["Crescente", "Decrescente"], horizontal=True, key="estoque_dir") == "Crescente"
with col_c:
    texto = st.text_input("Buscar por nome/marca", placeholder="Digite para filtrar...", key="estoque_busca")
with col_d:
    status = st.selectbox("Status do preço", ["todos", "automático", "manual", "desatualizado"], key="estoque_status")

# Aplicar filtros
df_filtrado = estoque.filtrar(df, texto, status, dias_stale)
df_filtrado = estoque.ordenar(df_filtrado, campo, crescente)

# ===== EDITAR ESTOQUE RAPIDO =====
st.markdown("### Editar Estoque")
st.caption("Altere estoque e quantidade por cesta. Clique em Salvar para confirmar.")

edit_df = df[["id", "nome", "unidade", "qtd_por_cesta", "estoque_atual"]].copy()
edit_df["qtd_por_cesta"] = pd.to_numeric(edit_df["qtd_por_cesta"], errors="coerce").fillna(0).astype(float)
edit_df["estoque_atual"] = pd.to_numeric(edit_df["estoque_atual"], errors="coerce").fillna(0).astype(float)

edited = st.data_editor(
    edit_df,
    column_config={
        "nome": st.column_config.TextColumn("Produto", disabled=True),
        "unidade": st.column_config.TextColumn("Unid.", disabled=True),
        "qtd_por_cesta": st.column_config.NumberColumn("Qtd/Cesta", format="%.1f", min_value=0, step=0.5),
        "estoque_atual": st.column_config.NumberColumn("Estoque", format="%.1f", min_value=0.0, step=1.0),
    },
    disabled=True if not eh_admin else ["id", "nome", "unidade"],
    hide_index=True,
    width='stretch',
    key="estoque_editor",
)

if not eh_admin:
    st.caption("Edicao de estoque restrita a administradores.")
elif st.button("Salvar Alteracoes", type="primary", width='stretch'):
    original = df[["id", "qtd_por_cesta", "estoque_atual"]].set_index("id")
    novo = edited[["id", "qtd_por_cesta", "estoque_atual"]].set_index("id")

    diff = original.compare(novo, keep_equal=False)
    if diff.empty:
        st.info("Nenhuma alteracao detectada.")
    else:
        alterados = []
        for prod_id in diff.index:
            row = edited[edited["id"] == prod_id].iloc[0]
            patch = {"id": int(prod_id)}
            for col in ["qtd_por_cesta", "estoque_atual"]:
                if col in diff.columns.get_level_values(0):
                    patch[col] = float(row[col])
            alterados.append(patch)
        try:
            db.atualizar_produtos(alterados, token)
            flash(f"{len(alterados)} produto(s) atualizado(s)!")
            st.cache_data.clear()
            st.rerun()
        except Exception:
            traceback.print_exc()
            st.error("Erro ao salvar. Tente novamente.")

st.divider()

# ===== ACOES =====
st.markdown("### Importar / Exportar")

# Export row
col_export, col_import = st.columns([1, 1])
with col_export:
    csv_export = csv_io.produtos_to_csv(df)
    st.download_button(
        "Exportar CSV", csv_export, "estoque.csv", "text/csv",
        width='stretch', type="secondary"
    )

with col_import:
    if eh_admin and st.button("Importar CSV", width='stretch', type="secondary"):
        st.session_state["show_import"] = True

# Import uploader (conditional)
if st.session_state.get("show_import"):
    arquivo = st.file_uploader("Selecionar arquivo CSV", type=["csv"], key="estoque_import", label_visibility="collapsed")
    if arquivo:
        conteudo = arquivo.getvalue()
        if len(conteudo) > csv_io.MAX_CSV_BYTES:
            st.error("Arquivo muito grande. Envie um CSV de ate 5 MB.")
            st.stop()
        try:
            texto_import = conteudo.decode("utf-8-sig")
        except UnicodeDecodeError:
            # latin-1 mapeia qualquer byte, nunca falha
            texto_import = conteudo.decode("latin-1")
        if texto_import is not None:
            try:
                novo = csv_io.ler_csv(texto_import)
            except ValueError as e:
                st.error(str(e))
                st.stop()
            erros = csv_io.validar_csv(novo)
            if erros:
                st.error("Erros no CSV:")
                for e in erros:
                    st.write(f"- {e}")
            else:
                diff = csv_io.diff_importacao(df, novo)
                if not diff["novos"] and not diff["alterados"]:
                    st.info("Nenhuma alteração detectada.")
                else:
                    st.warning(f"**{len(diff['novos'])} novos produtos**, **{len(diff['alterados'])} alteracoes**")
                    if diff["alterados"]:
                        with st.expander("Ver alterações"):
                            for alt in diff["alterados"]:
                                st.write(f"- {alt['produto']}: {alt['campo']} {alt['de']} -> {alt['para']}")
                    if not eh_admin:
                        st.error("Importacao restrita a administradores.")
                    elif st.button("Aplicar importação", type="primary", width='stretch'):
                        if st.session_state.get("aplicando_import"):
                            st.info("Importacao em andamento. Aguarde.")
                        else:
                            st.session_state["aplicando_import"] = True
                            try:
                                # CSV sem coluna id = tudo novo (bigserial resolve)
                                colunas_import = ["id", "nome", "marca", "unidade", "qtd_por_cesta",
                                    "estoque_atual", "preco_atual", "token_tenda",
                                    "url_tenda", "termo_busca", "ativo",
                                ]
                                for col in colunas_import:
                                    if col not in novo.columns:
                                        novo[col] = None
                                cols = [c for c in colunas_import if c in novo.columns or c == "id"]
                                rows = novo[cols].to_dict("records")
                                rows = estoque.limpar_nan(rows)
                                rows = [{k: v for k, v in r.items() if not (k == "id" and v is None)} for r in rows]
                                try:
                                    db.upsert_produtos(rows, token)
                                    flash("Importação aplicada!")
                                    st.session_state["show_import"] = False
                                    st.cache_data.clear()
                                    st.rerun()
                                except Exception:
                                    traceback.print_exc()
                                    st.error("Erro ao aplicar importacao. Tente novamente.")
                            finally:
                                st.session_state.pop("aplicando_import", None)

# ===== ALERTAS DE PREÇO DESATUALIZADO =====
desat_df = listar_desatualizados(df, dias_stale)
if not desat_df.empty:
    resumo = ", ".join(
        f"{r['nome']} ({config.formatar_data_hora(r.get('ultima_atualizacao_preco'))})"
        for _, r in desat_df.head(5).iterrows()
    )
    st.warning(f"**{len(desat_df)} produto(s) com preco desatualizado:** {resumo}{'...' if len(desat_df) > 5 else ''}")

# ===== FORMULÁRIO NOVO PRODUTO =====
formulario_aberto = bool(st.session_state.get("show_new_form"))
if not eh_admin:
    st.caption("Criacao de produtos restrita a administradores.")
elif st.button(
    "Fechar formulário" if formulario_aberto else "Adicionar Novo Produto",
    width='stretch',
):
    st.session_state["show_new_form"] = not formulario_aberto

if st.session_state.get("show_new_form") and eh_admin:
    formulario_novo_produto()

# ===== GERENCIAR PRODUTO (admin): inativar/reativar/excluir =====
st.divider()
st.markdown("### Gerenciar produto")
if not eh_admin:
    st.caption("Inativar e excluir produtos: restrito a administradores.")
else:
    opcoes = {f"{r['nome']} (id {r['id']})": r for _, r in df.iterrows()}
    escolha = st.selectbox("Produto", list(opcoes.keys()), key="estoque_gerenciar")
    alvo = opcoes[escolha]
    alvo_id = int(alvo["id"])
    alvo_nome = str(alvo.get("nome") or "")
    esta_ativo = bool(alvo.get("ativo"))

    col_inativar, col_excluir = st.columns(2)
    with col_inativar:
        if st.button(
            "Reativar" if not esta_ativo else "Inativar",
            width="stretch",
            key="estoque_toggle_ativo",
        ):
            try:
                db.atualizar_produtos(
                    [{"id": alvo_id, "ativo": not esta_ativo}], token
                )
                flash(
                    f"Produto {alvo_nome} {'reativado' if not esta_ativo else 'inativado'}!"
                )
                st.cache_data.clear()
                st.rerun()
            except Exception:
                traceback.print_exc()
                st.error("Erro ao atualizar produto. Tente novamente.")
    with col_excluir:
        if st.button("Excluir", width="stretch", key="estoque_excluir"):
            st.session_state["confirm_excluir_produto"] = alvo_id
            st.session_state["confirm_excluir_produto_dialog"] = True

    if st.session_state.get("confirm_excluir_produto") == alvo_id and confirmation_dialog(
        f"Excluir {alvo_nome}?",
        "O historico de precos sera apagado junto. Compras passadas sao preservadas. Acao irreversivel.",
        confirm_label="Excluir",
        cancel_label="Cancelar",
        key="confirm_excluir_produto_dialog",
    ):
        try:
            db.excluir_produto(alvo_id, token)
            st.session_state.pop("confirm_excluir_produto", None)
            flash(f"Produto {alvo_nome} excluido.")
            st.cache_data.clear()
            st.rerun()
        except Exception:
            traceback.print_exc()
            st.error("Erro ao excluir produto. Tente novamente.")

    with st.expander("Editar dados do produto", expanded=False):
        def _txt(valor):
            return "" if valor is None or (isinstance(valor, float) and pd.isna(valor)) else str(valor)

        def _num(valor, padrao=0.0):
            try:
                if valor is None or (isinstance(valor, float) and pd.isna(valor)) or valor == "":
                    return float(padrao)
                return float(valor)
            except (TypeError, ValueError):
                return float(padrao)

        with st.form("editar_produto_form"):
            c1, c2 = st.columns(2)
            with c1:
                e_nome = st.text_input("Nome *", value=_txt(alvo.get("nome")))
                e_marca = st.text_input("Marca", value=_txt(alvo.get("marca")))
                e_unidade = st.text_input("Unidade *", value=_txt(alvo.get("unidade")))
                e_qtd = st.number_input(
                    "Qtd por cesta *", min_value=0.1, value=_num(alvo.get("qtd_por_cesta"), 1.0), step=0.5
                )
                e_est = st.number_input(
                    "Estoque atual", min_value=0.0, value=_num(alvo.get("estoque_atual")), step=1.0
                )
            with c2:
                e_preco = st.number_input(
                    "Preco unitario (R$)", min_value=0.0, value=_num(alvo.get("preco_atual")), step=0.01
                )
                e_token = st.text_input("Token Tenda", value=_txt(alvo.get("token_tenda")))
                e_url = st.text_input("URL Tenda", value=_txt(alvo.get("url_tenda")))
                e_termo = st.text_input("Termo de busca", value=_txt(alvo.get("termo_busca")))
                e_ativo = st.checkbox("Ativo", value=esta_ativo)
            if st.form_submit_button("Salvar edicao", type="primary"):
                novo = {
                    "nome": e_nome.strip(),
                    "marca": e_marca.strip(),
                    "unidade": e_unidade.strip(),
                    "qtd_por_cesta": float(e_qtd),
                    "estoque_atual": float(e_est),
                    "preco_atual": float(e_preco),
                    "token_tenda": e_token.strip() or None,
                    "url_tenda": e_url.strip() or None,
                    "termo_busca": e_termo.strip() or None,
                    "ativo": bool(e_ativo),
                }
                erros = estoque.validar_produto(novo)
                if erros:
                    for e in erros:
                        st.error(e)
                else:
                    antigo = estoque.limpar_nan([dict(alvo)])[0]
                    patch = estoque.montar_patch(antigo, novo)
                    if not patch:
                        st.info("Nenhuma alteracao detectada.")
                    else:
                        try:
                            db.atualizar_produtos([patch], token)
                            flash(f"Produto {novo['nome']} atualizado!")
                            st.cache_data.clear()
                            st.rerun()
                        except Exception:
                            traceback.print_exc()
                            st.error("Erro ao salvar edicao. Tente novamente.")
