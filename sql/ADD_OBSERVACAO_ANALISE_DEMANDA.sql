-- Adiciona o campo de observação do técnico na etapa de Análise da Demanda —
-- equivalente ao campo "Observação - Motivo do Retorno" que o conferencista já tem
-- (observacao_motivo_retorno), mas em coluna própria para não sobrescrever
-- a observação do conferencista (os dois campos aparecem simultaneamente no
-- mesmo formulário, em seções diferentes).
ALTER TABLE formalizacao
  ADD COLUMN IF NOT EXISTS observacao_analise_demanda TEXT;

COMMENT ON COLUMN formalizacao.observacao_analise_demanda IS
  'Observação livre do técnico durante a Análise da Demanda (seção 2 do formulário).';
