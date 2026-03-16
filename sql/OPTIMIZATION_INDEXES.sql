-- 🚀 OTIMIZAÇÃO DE ÍNDICES PARA PERFORMANCE
-- Execute isso no Supabase SQL Editor
-- Melhora 10-100x a velocidade dos filtros

-- ⚡ Índices para campos de filtro mais usados
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano ON public.formalizacao(ano);
CREATE INDEX IF NOT EXISTS idx_formalizacao_regional ON public.formalizacao(regional);
CREATE INDEX IF NOT EXISTS idx_formalizacao_municipio ON public.formalizacao(municipio);
CREATE INDEX IF NOT EXISTS idx_formalizacao_parlamentar ON public.formalizacao(parlamentar);
CREATE INDEX IF NOT EXISTS idx_formalizacao_area_estagio ON public.formalizacao(area_estagio);
CREATE INDEX IF NOT EXISTS idx_formalizacao_tecnico ON public.formalizacao(tecnico);
CREATE INDEX IF NOT EXISTS idx_formalizacao_recurso ON public.formalizacao(recurso);
CREATE INDEX IF NOT EXISTS idx_formalizacao_conferencista ON public.formalizacao(conferencista);
CREATE INDEX IF NOT EXISTS idx_formalizacao_situacao_analise_demanda ON public.formalizacao(situacao_analise_demanda);
CREATE INDEX IF NOT EXISTS idx_formalizacao_partido ON public.formalizacao(partido);

-- ⚡ Índices para campos de busca por texto (LIKE)
CREATE INDEX IF NOT EXISTS idx_formalizacao_conveniado ON public.formalizacao(conveniado);
CREATE INDEX IF NOT EXISTS idx_formalizacao_objeto ON public.formalizacao(objeto);
CREATE INDEX IF NOT EXISTS idx_formalizacao_parlamentar_text ON public.formalizacao USING GIN (to_tsvector('portuguese', COALESCE(parlamentar, '')));

-- ⚡ Índices para datas (filtros comuns)
CREATE INDEX IF NOT EXISTS idx_formalizacao_data_liberacao ON public.formalizacao(data_liberacao);
CREATE INDEX IF NOT EXISTS idx_formalizacao_data_analise_demanda ON public.formalizacao(data_analise_demanda);
CREATE INDEX IF NOT EXISTS idx_formalizacao_data_recebimento_demanda ON public.formalizacao(data_recebimento_demanda);

-- ⚡ Índices combinados para queries mais rápidas (composite indexes)
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_regional ON public.formalizacao(ano, regional);
CREATE INDEX IF NOT EXISTS idx_formalizacao_area_tecnico ON public.formalizacao(area_estagio, tecnico);
CREATE INDEX IF NOT EXISTS idx_formalizacao_parlamentar_ano ON public.formalizacao(parlamentar, ano);

-- ✅ Atualizar estatísticas
ANALYZE public.formalizacao;

-- 📊 Consulta para verificar índices criados
-- SELECT indexname FROM pg_indexes WHERE tablename = 'formalizacao';
