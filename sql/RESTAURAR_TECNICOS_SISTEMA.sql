-- ============================================================
-- RESTAURAÇÃO DEFINITIVA DE TÉCNICOS ALTERADOS PELO SISTEMA
-- Gerado em: 2026-05-26
-- Padrão identificado: "sistema" trocou técnicos para Paula Araujo Peixoto
-- ============================================================

-- ============================================================
-- PASSO 1: PREVIEW — ver todos os registros a restaurar
-- Mostra: formalizacao_id, demanda, tecnico atual, tecnico correto
-- Execute primeiro, confira o resultado, só então execute o PASSO 2
-- ============================================================
WITH
-- Para cada registro, pega a primeira troca indevida (feita pelo sistema OU para Paula)
troca_indevida AS (
  SELECT DISTINCT ON (formalizacao_id)
    formalizacao_id,
    valor_anterior  AS tecnico_correto,
    valor_novo      AS tecnico_errado,
    admin_nome,
    criado_em
  FROM log_atribuicoes
  WHERE campo_alterado = 'tecnico'
    AND (
      LOWER(admin_nome) IN ('sistema', 'system', 'desconhecido', '')
      OR valor_novo ILIKE '%Paula%'
    )
  ORDER BY formalizacao_id, criado_em ASC  -- pega a mais antiga (origem do erro)
),
-- Última entrada de tecnico no log (estado mais recente)
ultimo_estado_log AS (
  SELECT DISTINCT ON (formalizacao_id)
    formalizacao_id,
    valor_novo AS ultimo_tecnico_no_log,
    admin_nome AS ultimo_admin,
    criado_em  AS ultima_data
  FROM log_atribuicoes
  WHERE campo_alterado = 'tecnico'
  ORDER BY formalizacao_id, criado_em DESC
)
SELECT
  ti.formalizacao_id,
  f.demanda,
  f.tecnico                     AS tecnico_atual_bd,
  ti.tecnico_correto            AS restaurar_para,
  ti.tecnico_errado             AS foi_trocado_para,
  ti.admin_nome                 AS troca_feita_por,
  ti.criado_em                  AS data_troca_errada,
  ul.ultimo_tecnico_no_log      AS ultimo_valor_no_log,
  ul.ultimo_admin               AS ultimo_admin_log,
  -- Alerta se houve mudança DEPOIS da troca indevida (pode ser intencional)
  CASE
    WHEN ul.ultima_data > ti.criado_em AND ul.ultimo_admin NOT IN ('sistema','system','desconhecido','')
    THEN '⚠️ HOUVE MUDANÇA POSTERIOR — revisar manualmente'
    ELSE 'OK — restaurar automaticamente'
  END AS observacao
FROM troca_indevida ti
LEFT JOIN formalizacao f ON f.id = ti.formalizacao_id
LEFT JOIN ultimo_estado_log ul ON ul.formalizacao_id = ti.formalizacao_id
-- Só mostra onde ainda precisa restaurar (tecnico atual diferente do correto)
WHERE f.tecnico IS DISTINCT FROM ti.tecnico_correto
  AND ti.tecnico_correto IS NOT NULL
  AND ti.tecnico_correto != ''
ORDER BY ti.criado_em DESC;

-- ============================================================
-- PASSO 2: RESTAURAÇÃO EM BLOCO (TRANSAÇÃO SEGURA)
-- Execute SOMENTE após confirmar o PASSO 1 acima
-- ============================================================
BEGIN;

-- Restaura todos os registros onde:
-- 1. O técnico foi trocado pelo "sistema" ou para Paula Araujo Peixoto
-- 2. O técnico ATUAL ainda é diferente do correto
-- 3. Não houve mudança POSTERIOR feita por admin humano
UPDATE formalizacao AS f
SET tecnico = ti.tecnico_correto
FROM (
  SELECT DISTINCT ON (formalizacao_id)
    formalizacao_id,
    valor_anterior AS tecnico_correto,
    criado_em      AS data_troca
  FROM log_atribuicoes
  WHERE campo_alterado = 'tecnico'
    AND (
      LOWER(admin_nome) IN ('sistema', 'system', 'desconhecido', '')
      OR valor_novo ILIKE '%Paula%'
    )
  ORDER BY formalizacao_id, criado_em ASC
) ti
WHERE f.id = ti.formalizacao_id
  -- Só atualiza se o atual ainda está errado (diferente do correto)
  AND f.tecnico IS DISTINCT FROM ti.tecnico_correto
  AND ti.tecnico_correto IS NOT NULL
  AND ti.tecnico_correto != ''
  -- Segurança extra: não sobrescreve se houuve mudança POSTERIOR por humano
  AND NOT EXISTS (
    SELECT 1
    FROM log_atribuicoes l2
    WHERE l2.formalizacao_id = ti.formalizacao_id
      AND l2.campo_alterado = 'tecnico'
      AND l2.criado_em > ti.data_troca
      AND LOWER(l2.admin_nome) NOT IN ('sistema', 'system', 'desconhecido', '')
  );

-- Ver quantas linhas foram afetadas e quais ficaram
SELECT id, demanda, tecnico AS tecnico_restaurado
FROM formalizacao
WHERE id IN (
  SELECT DISTINCT formalizacao_id
  FROM log_atribuicoes
  WHERE campo_alterado = 'tecnico'
    AND (
      LOWER(admin_nome) IN ('sistema', 'system', 'desconhecido', '')
      OR valor_novo ILIKE '%Paula%'
    )
)
ORDER BY id;

-- Se o resultado acima parecer correto: COMMIT
-- Se algo estiver errado:              ROLLBACK
COMMIT;
-- ROLLBACK;

-- ============================================================
-- PASSO 3: VERIFICAÇÃO FINAL
-- Execute após o COMMIT para confirmar que tudo foi restaurado
-- ============================================================
SELECT
  l.formalizacao_id,
  f.demanda,
  f.tecnico          AS tecnico_atual,
  l.valor_anterior   AS era,
  l.valor_novo       AS foi_trocado_para,
  l.admin_nome       AS por,
  l.criado_em
FROM log_atribuicoes l
JOIN formalizacao f ON f.id = l.formalizacao_id
WHERE l.campo_alterado = 'tecnico'
  AND (
    LOWER(l.admin_nome) IN ('sistema', 'system', 'desconhecido', '')
    OR l.valor_novo ILIKE '%Paula%'
  )
ORDER BY l.criado_em DESC;
