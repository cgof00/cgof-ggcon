-- Adiciona a coluna que registra quando o técnico marcou a demanda como
-- "Demanda Analisada" e a liberou para o admin atribuir um conferencista.
-- NULL/vazia = técnico ainda não terminou a análise.
-- Preenchida = liberada para conferência (até o admin atribuir um conferencista).
ALTER TABLE formalizacao
  ADD COLUMN IF NOT EXISTS data_liberacao_conferencia DATE;

COMMENT ON COLUMN formalizacao.data_liberacao_conferencia IS
  'Data em que o técnico marcou a demanda como analisada e liberou para conferência (aguardando atribuição de conferencista).';
