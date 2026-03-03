-- ============================================
-- CRIAR TABELA COM NOMES EXATOS DO CSV
-- ============================================
-- Os nomes das colunas devem ser EXATAMENTE iguais ao CSV (com acentuação e espaços)

-- 1️⃣ CRIAR NOVA TABELA COM NOMES EXATOS DO CSV
-- (execute limpar-backup.sql ANTES de executar este script)
CREATE TABLE public.formalizacao (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Colunas com NOMES EXATOS do CSV
    seq TEXT,
    ano TEXT,
    parlamentar TEXT,
    partido TEXT,
    emenda TEXT,
    emendas_agregadoras TEXT,
    demanda TEXT,
    demandas_formalizacao TEXT,
    numero_convenio TEXT,
    classificacao_emenda_demanda TEXT,
    tipo_formalizacao TEXT,
    regional TEXT,
    municipio TEXT,
    conveniado TEXT,
    objeto TEXT,
    portfolio TEXT,
    valor NUMERIC,
    posicao_anterior TEXT,
    situacao_demandas_sempapel TEXT,
    area_estagio TEXT,
    recurso TEXT,
    tecnico TEXT,
    data_liberacao DATE,
    area_estagio_situacao_demanda TEXT,
    situacao_analise_demanda TEXT,
    data_analise_demanda DATE,
    motivo_retorno_diligencia TEXT,
    data_retorno_diligencia DATE,
    conferencista TEXT,
    data_recebimento_demanda DATE,
    data_retorno DATE,
    observacao_motivo_retorno TEXT,
    data_liberacao_assinatura_conferencista DATE,
    data_liberacao_assinatura DATE,
    falta_assinatura TEXT,
    assinatura TEXT,
    publicacao TEXT,
    vigencia TEXT,
    encaminhado_em DATE,
    concluida_em DATE
);

-- 2️⃣ CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano ON public.formalizacao(ano);
CREATE INDEX IF NOT EXISTS idx_formalizacao_emenda ON public.formalizacao(emenda);
CREATE INDEX IF NOT EXISTS idx_formalizacao_parlamentar ON public.formalizacao(parlamentar);
CREATE INDEX IF NOT EXISTS idx_formalizacao_conveniado ON public.formalizacao(conveniado);

-- 3️⃣ HABILITAR RLS (Row Level Security)
ALTER TABLE public.formalizacao ENABLE ROW LEVEL SECURITY;

-- 4️⃣ CRIAR POLÍTICA DE SEGURANÇA
DROP POLICY IF EXISTS "Allow authenticated users" ON public.formalizacao;
CREATE POLICY "Allow authenticated users" ON public.formalizacao
    FOR ALL USING (auth.role() = 'authenticated');

-- ✅ RESULTADO
SELECT 'Nova tabela criada com sucesso!' as resultado;
SELECT COUNT(*) as total_registros FROM public.formalizacao;

-- 5️⃣ SE QUISER RESTAURAR A TABELA ANTIGA, EXECUTE:
-- DROP TABLE IF EXISTS public.formalizacao;
-- ALTER TABLE IF EXISTS public.formalizacao_backup RENAME TO formalizacao;
