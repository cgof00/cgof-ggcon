-- SQL para criar índices em Supabase e melhorar performance
-- Copie e execute no SQL Editor: https://supabase.com/dashboard/project/[seu-projeto]/sql

-- Índices para tabela formalizacao
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano ON public.formalizacao (ano);
CREATE INDEX IF NOT EXISTS idx_formalizacao_area_estagio ON public.formalizacao (area_estagio);
CREATE INDEX IF NOT EXISTS idx_formalizacao_recurso ON public.formalizacao (recurso);
CREATE INDEX IF NOT EXISTS idx_formalizacao_tecnico ON public.formalizacao (tecnico);
CREATE INDEX IF NOT EXISTS idx_formalizacao_situacao ON public.formalizacao (situacao_analise);
CREATE INDEX IF NOT EXISTS idx_formalizacao_area_sit ON public.formalizacao (area_estagio_situacao);
CREATE INDEX IF NOT EXISTS idx_formalizacao_conferencista ON public.formalizacao (conferencista);
CREATE INDEX IF NOT EXISTS idx_formalizacao_falta_assinatura ON public.formalizacao (falta_assinatura);
CREATE INDEX IF NOT EXISTS idx_formalizacao_publicacao ON public.formalizacao (publicacao);
CREATE INDEX IF NOT EXISTS idx_formalizacao_vigencia ON public.formalizacao (vigencia);
CREATE INDEX IF NOT EXISTS idx_formalizacao_parlamentar ON public.formalizacao (parlamentar);
CREATE INDEX IF NOT EXISTS idx_formalizacao_partido ON public.formalizacao (partido);
CREATE INDEX IF NOT EXISTS idx_formalizacao_regional ON public.formalizacao (regional);
CREATE INDEX IF NOT EXISTS idx_formalizacao_municipio ON public.formalizacao (municipio);
CREATE INDEX IF NOT EXISTS idx_formalizacao_conveniado ON public.formalizacao (conveniado);
CREATE INDEX IF NOT EXISTS idx_formalizacao_data_liberacao ON public.formalizacao (data_liberacao);
CREATE INDEX IF NOT EXISTS idx_formalizacao_data_analise ON public.formalizacao (data_analise);
CREATE INDEX IF NOT EXISTS idx_formalizacao_data_recebimento ON public.formalizacao (data_recebimento);
CREATE INDEX IF NOT EXISTS idx_formalizacao_data_retorno ON public.formalizacao (data_retorno);

-- Índices para tabela emendas
CREATE INDEX IF NOT EXISTS idx_emendas_parlamentar ON public.emendas (parlamentar);
CREATE INDEX IF NOT EXISTS idx_emendas_beneficiario ON public.emendas (beneficiario);
CREATE INDEX IF NOT EXISTS idx_emendas_objeto ON public.emendas (objeto);

-- Índices compostos para queries mais complexas (mais rápidas)
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_situacao ON public.formalizacao (ano, situacao_analise);
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_tecnico ON public.formalizacao (ano, tecnico);
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_regional ON public.formalizacao (ano, regional);

-- Índices em colunas booleanas para performance
CREATE INDEX IF NOT EXISTS idx_formalizacao_falta_assinatura_bool ON public.formalizacao (falta_assinatura) WHERE falta_assinatura IS NOT NULL;
