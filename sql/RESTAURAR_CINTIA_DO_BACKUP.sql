-- ============================================================
-- RESTAURAR REGISTROS CINTIA PERDIDOS DO BACKUP
--
-- 25 registros da CINTIA que existiam no backup mas sumiram
-- da tabela formalizacao (provavelmente apagados por reimportação
-- via TRUNCATE + CSV incompleto).
--
-- Execute no Supabase SQL Editor.
-- ============================================================

-- PASSO 1: Verificar quais estão faltando (confirmação antes de inserir)
SELECT b.id, b.demanda, b.emenda, b.tecnico, b.data_liberacao
FROM public.formalizacao_backup b
WHERE b.id IN (9264, 23348, 24231, 24209, 24191, 76, 24588, 25630,
               25374, 24879, 25348, 25259, 10424, 28763, 2900, 25779,
               21869, 29614, 1978, 25892, 23894, 28551, 28553, 30914, 30950)
  AND NOT EXISTS (
    SELECT 1 FROM public.formalizacao f WHERE f.id = b.id
  )
ORDER BY b.demanda;

-- ============================================================
-- PASSO 2: RESTAURAR os registros faltantes do backup
--   - Usa INSERT ... SELECT do formalizacao_backup (todos os campos)
--   - ON CONFLICT (id) DO NOTHING = não sobrescreve se já existir
--   Descomente após confirmar o resultado acima.
-- ============================================================

-- INSERT INTO public.formalizacao
-- SELECT * FROM public.formalizacao_backup
-- WHERE id IN (9264, 23348, 24231, 24209, 24191, 76, 24588, 25630,
--              25374, 24879, 25348, 25259, 10424, 28763, 2900, 25779,
--              21869, 29614, 1978, 25892, 23894, 28551, 28553, 30914, 30950)
-- ON CONFLICT (id) DO NOTHING;

-- PASSO 3: Verificar quantos foram restaurados
-- SELECT COUNT(*) AS restaurados
-- FROM public.formalizacao
-- WHERE id IN (9264, 23348, 24231, 24209, 24191, 76, 24588, 25630,
--              25374, 24879, 25348, 25259, 10424, 28763, 2900, 25779,
--              21869, 29614, 1978, 25892, 23894, 28551, 28553, 30914, 30950);
-- Esperado: 25


-- ============================================================
-- DEMANDA 89537 — Paulo Bottoni (NÃO é um registro da CINTIA no banco)
--
-- A demanda 89537 nunca existiu como registro CINTIA na tabela.
-- O que aparecia era um "fantasma" gerado pelo campo
-- historico_atribuicoes do registro do Paulo (a CINTIA foi
-- técnica anterior e isso ficou gravado no histórico JSON).
--
-- CORREÇÃO JÁ APLICADA: commit 9761eec no frontend
-- → matrixData filtra linhas _isHistorico antes de montar
--   o Demonstrativo. O 89537 não aparece mais sob CINTIA.
--
-- NÃO há nada a corrigir no banco para esta demanda.
-- ============================================================

-- Confirmação: ver o registro atual de 89537 (deve ser Paulo)
SELECT id, demanda, tecnico, data_liberacao, historico_atribuicoes
FROM public.formalizacao
WHERE demanda = '89537';
