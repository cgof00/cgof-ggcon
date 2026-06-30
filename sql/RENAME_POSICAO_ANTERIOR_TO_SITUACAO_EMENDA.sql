-- ============================================================
-- MIGRAÇÃO: Renomear coluna posicao_anterior → situacao_emenda
--           na tabela formalizacao
--
-- Motivo: O campo receberá dados da coluna "Situação Emenda"
--         do arquivo CSV importado (não mais "Posição Anterior").
--
-- Execute UMA VEZ no Supabase SQL Editor (é seguro re-executar).
-- ============================================================

-- 1) Renomear a coluna
ALTER TABLE public.formalizacao
  RENAME COLUMN posicao_anterior TO situacao_emenda;

-- 2) Notifica PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verificação: confirmar que a coluna foi renomeada
-- ============================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'formalizacao'
  AND column_name  = 'situacao_emenda';
-- Deve retornar 1 linha com column_name = 'situacao_emenda'


-- ============================================================
-- PASSO 2: Popular situacao_emenda com dados da tabela emendas
--          (campo situacao_e = "Situação Emenda" do CSV)
--
-- Executa em 3 passagens (da mais precisa para a menos):
--   A) Match por numero_convenio       (chave exata)
--   B) Match por código de emenda      (dígitos normalizados)
--   C) Match por num_emenda/agregadoras (emendas agregadoras)
-- ============================================================

-- 2A) Match por número de convênio (mais preciso)
UPDATE public.formalizacao f
SET
  situacao_emenda = NULLIF(TRIM(e.situacao_e), ''),
  updated_at      = NOW()
FROM public.emendas e
WHERE TRIM(COALESCE(f.numero_convenio, '')) != ''
  AND TRIM(COALESCE(e.num_convenio,    '')) != ''
  AND TRIM(f.numero_convenio) = TRIM(e.num_convenio)
  AND NULLIF(TRIM(e.situacao_e), '') IS NOT NULL;

-- 2B) Match por código de emenda (dígitos normalizados)
UPDATE public.formalizacao f
SET
  situacao_emenda = NULLIF(TRIM(e.situacao_e), ''),
  updated_at      = NOW()
FROM public.emendas e
WHERE (f.situacao_emenda IS NULL OR f.situacao_emenda = '')
  AND NULLIF(TRIM(e.situacao_e), '') IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(COALESCE(f.emenda, ''), '[^0-9]', '', 'g')) >= 6
  AND LENGTH(REGEXP_REPLACE(COALESCE(e.codigo_num, ''), '[^0-9]', '', 'g')) >= 6
  AND REGEXP_REPLACE(COALESCE(f.emenda, ''), '[^0-9]', '', 'g')
    = REGEXP_REPLACE(COALESCE(e.codigo_num, ''), '[^0-9]', '', 'g');

-- 2C) Match por emenda agregadora (num_emenda ↔ emendas_agregadoras)
UPDATE public.formalizacao f
SET
  situacao_emenda = NULLIF(TRIM(e.situacao_e), ''),
  updated_at      = NOW()
FROM public.emendas e
WHERE (f.situacao_emenda IS NULL OR f.situacao_emenda = '')
  AND NULLIF(TRIM(e.situacao_e), '') IS NOT NULL
  AND TRIM(COALESCE(f.emendas_agregadoras, '')) != ''
  AND TRIM(COALESCE(e.num_emenda, '')) != ''
  AND TRIM(f.emendas_agregadoras) = TRIM(e.num_emenda);

-- 2D) Notifica PostgREST
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verificação: quantos registros foram preenchidos
-- ============================================================
SELECT
  COUNT(*) FILTER (WHERE situacao_emenda IS NOT NULL AND situacao_emenda != '') AS preenchidos,
  COUNT(*) FILTER (WHERE situacao_emenda IS NULL OR situacao_emenda = '')       AS vazios,
  COUNT(*)                                                                       AS total
FROM public.formalizacao;

