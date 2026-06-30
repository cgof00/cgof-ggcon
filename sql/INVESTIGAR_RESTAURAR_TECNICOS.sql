-- ============================================================
-- INVESTIGAR E RESTAURAR TÉCNICOS ALTERADOS INDEVIDAMENTE
-- Execute PASSO A PASSO no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- PASSO 1: VISÃO GERAL — todas as trocas de técnico no log
-- (ordenado por data, mais recentes primeiro)
-- ============================================================
SELECT
  l.formalizacao_id,
  f.demanda,
  l.valor_anterior   AS tecnico_antes,
  l.valor_novo       AS tecnico_depois,
  l.admin_nome       AS quem_alterou,
  l.admin_role,
  l.criado_em        AS quando
FROM log_atribuicoes l
LEFT JOIN formalizacao f ON f.id = l.formalizacao_id
WHERE l.campo_alterado = 'tecnico'
ORDER BY l.criado_em DESC
LIMIT 500;

-- ============================================================
-- PASSO 2: TROCAS FEITAS PELO SISTEMA ("sistema")
-- Essas são as mais suspeitas — mudanças automáticas indevidas
-- ============================================================
SELECT
  l.formalizacao_id,
  f.demanda,
  f.tecnico          AS tecnico_atual_no_bd,
  l.valor_anterior   AS tecnico_antes_da_troca,
  l.valor_novo       AS tecnico_colocado,
  l.admin_nome,
  l.criado_em
FROM log_atribuicoes l
LEFT JOIN formalizacao f ON f.id = l.formalizacao_id
WHERE l.campo_alterado = 'tecnico'
  AND LOWER(l.admin_nome) IN ('sistema', 'system', 'desconhecido', '')
ORDER BY l.criado_em DESC;

-- ============================================================
-- PASSO 3: TROCAS QUE RESULTARAM EM "Paula Araujo Peixoto"
-- (seja quem tiver feito a troca)
-- ============================================================
SELECT
  l.formalizacao_id,
  f.demanda,
  f.tecnico          AS tecnico_atual_no_bd,
  l.valor_anterior   AS tecnico_antes,
  l.valor_novo       AS tecnico_depois,
  l.admin_nome       AS quem_fez,
  l.criado_em
FROM log_atribuicoes l
LEFT JOIN formalizacao f ON f.id = l.formalizacao_id
WHERE l.campo_alterado = 'tecnico'
  AND l.valor_novo ILIKE '%Paula%'
ORDER BY l.criado_em DESC;

-- ============================================================
-- PASSO 4: REGISTROS QUE TIVERAM TÉCNICO ZERADO (limpado)
-- ============================================================
SELECT
  l.formalizacao_id,
  f.demanda,
  f.tecnico          AS tecnico_atual_no_bd,
  l.valor_anterior   AS tecnico_que_foi_removido,
  l.admin_nome       AS quem_zerou,
  l.criado_em
FROM log_atribuicoes l
LEFT JOIN formalizacao f ON f.id = l.formalizacao_id
WHERE l.campo_alterado = 'tecnico'
  AND (l.valor_novo IS NULL OR l.valor_novo = '' OR l.valor_novo = 'None')
ORDER BY l.criado_em DESC;

-- ============================================================
-- PASSO 5: ESTADO ATUAL × ÚLTIMO LOG — detecta inconsistências
-- Mostra registros onde o técnico atual diverge do último registrado
-- ============================================================
WITH ultimo_log AS (
  SELECT DISTINCT ON (formalizacao_id)
    formalizacao_id,
    valor_anterior,
    valor_novo,
    admin_nome,
    criado_em
  FROM log_atribuicoes
  WHERE campo_alterado = 'tecnico'
  ORDER BY formalizacao_id, criado_em DESC
)
SELECT
  ul.formalizacao_id,
  f.demanda,
  f.tecnico          AS tecnico_atual_bd,
  ul.valor_anterior  AS tecnico_anterior_no_log,
  ul.valor_novo      AS tecnico_novo_no_log,
  ul.admin_nome      AS ultima_alteracao_por,
  ul.criado_em       AS data_ultima_alteracao
FROM ultimo_log ul
LEFT JOIN formalizacao f ON f.id = ul.formalizacao_id
ORDER BY ul.criado_em DESC;

-- ============================================================
-- PASSO 6: IDENTIFICAR TÉCNICO ORIGINAL (antes da primeira troca indevida)
-- Para cada registro modificado pelo "sistema", encontra o
-- valor_anterior mais antigo = o técnico correto a restaurar
-- ============================================================
WITH primeira_troca_indevida AS (
  SELECT DISTINCT ON (formalizacao_id)
    formalizacao_id,
    valor_anterior   AS tecnico_correto,
    valor_novo       AS tecnico_colocado_erroneamente,
    admin_nome,
    criado_em
  FROM log_atribuicoes
  WHERE campo_alterado = 'tecnico'
    AND (
      LOWER(admin_nome) IN ('sistema', 'system', 'desconhecido', '')
      OR valor_novo ILIKE '%Paula%'
    )
  ORDER BY formalizacao_id, criado_em ASC  -- mais ANTIGA primeiro
)
SELECT
  p.formalizacao_id,
  f.demanda,
  f.tecnico          AS tecnico_atual_bd,
  p.tecnico_correto  AS restaurar_para,
  p.admin_nome       AS troca_feita_por,
  p.criado_em        AS data_troca_indevida,
  -- Gera o UPDATE pronto para copiar e executar:
  CASE
    WHEN f.tecnico IS DISTINCT FROM p.tecnico_correto
      AND p.tecnico_correto IS NOT NULL
      AND p.tecnico_correto != ''
    THEN
      'UPDATE formalizacao SET tecnico = ' ||
      quote_literal(p.tecnico_correto) ||
      ' WHERE id = ' || p.formalizacao_id || ';'
    ELSE 'OK - tecnico já está correto ou não há valor anterior para restaurar'
  END AS update_sql
FROM primeira_troca_indevida p
LEFT JOIN formalizacao f ON f.id = p.formalizacao_id
ORDER BY p.criado_em DESC;

-- ============================================================
-- PASSO 7: EXECUTAR A RESTAURAÇÃO
-- Cole aqui os UPDATEs gerados pelo PASSO 6 e execute.
-- Exemplo (substitua pelos resultados reais do PASSO 6):
-- ============================================================
/*
BEGIN;

-- [Cole aqui os UPDATE gerados pelo PASSO 6]
-- Exemplo:
-- UPDATE formalizacao SET tecnico = 'Paulo Sergio Bottoni' WHERE id = XXXXX;
-- UPDATE formalizacao SET tecnico = 'Marcia Silva'         WHERE id = YYYYY;

-- Verifique o resultado antes de confirmar:
-- SELECT id, demanda, tecnico FROM formalizacao WHERE id IN (XXXXX, YYYYY);

COMMIT;
-- (ou ROLLBACK; se algo estiver errado)
*/

-- ============================================================
-- PASSO 8 (EXTRA): Verificar TODOS os técnicos distintos
-- que aparecem no log vs os que existem hoje na tabela usuarios
-- (ajuda a identificar nomes inconsistentes)
-- ============================================================
SELECT DISTINCT valor_novo AS tecnico_no_log
FROM log_atribuicoes
WHERE campo_alterado = 'tecnico'
  AND valor_novo IS NOT NULL AND valor_novo != ''
ORDER BY 1;
