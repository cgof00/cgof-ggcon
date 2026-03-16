-- ============================================
-- CRIAR TABELA COM CONVERSÃO AUTOMÁTICA DE DATAS
-- ============================================
-- Este script aceita datas em formato DD/MM/YYYY e converte para DATE

-- 1️⃣ CRIAR NOVA TABELA (Colunas de data como TEXT para import)
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
    data_liberacao TEXT,
    area_estagio_situacao_demanda TEXT,
    situacao_analise_demanda TEXT,
    data_analise_demanda TEXT,
    motivo_retorno_diligencia TEXT,
    data_retorno_diligencia TEXT,
    conferencista TEXT,
    data_recebimento_demanda TEXT,
    data_retorno TEXT,
    observacao_motivo_retorno TEXT,
    data_liberacao_assinatura_conferencista TEXT,
    data_liberacao_assinatura TEXT,
    falta_assinatura TEXT,
    assinatura TEXT,
    publicacao TEXT,
    vigencia TEXT,
    encaminhado_em TEXT,
    concluida_em TEXT
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

-- ✅ TABELA CRIADA E PRONTA PARA IMPORT!
SELECT 'Tabela criada com sucesso! Agora você pode importar o CSV.' as resultado;

-- 5️⃣ APÓS IMPORTAR O CSV, EXECUTE ESTE SCRIPT PARA CONVERTER AS DATAS:
/*
-- CONVERTER TEXTO PARA DATAS (DD/MM/YYYY para DATE)
-- Execute isso APÓS a importação do CSV

ALTER TABLE public.formalizacao 
ADD COLUMN data_liberacao_temp DATE DEFAULT NULL;

UPDATE public.formalizacao 
SET data_liberacao_temp = CASE 
    WHEN data_liberacao = '' OR data_liberacao IS NULL THEN NULL
    ELSE TO_DATE(data_liberacao, 'DD/MM/YYYY')
END;

ALTER TABLE public.formalizacao DROP COLUMN data_liberacao;
ALTER TABLE public.formalizacao RENAME COLUMN data_liberacao_temp TO data_liberacao;

-- Repita para TODAS as outras colunas de data:
-- data_analise_demanda, data_retorno_diligencia, data_recebimento_demanda, 
-- data_retorno, data_liberacao_assinatura_conferencista, data_liberacao_assinatura,
-- encaminhado_em, concluida_em

ALTER TABLE public.formalizacao 
ADD COLUMN data_analise_demanda_temp DATE DEFAULT NULL;

UPDATE public.formalizacao 
SET data_analise_demanda_temp = CASE 
    WHEN data_analise_demanda = '' OR data_analise_demanda IS NULL THEN NULL
    ELSE TO_DATE(data_analise_demanda, 'DD/MM/YYYY')
END;

ALTER TABLE public.formalizacao DROP COLUMN data_analise_demanda;
ALTER TABLE public.formalizacao RENAME COLUMN data_analise_demanda_temp TO data_analise_demanda;

---

ALTER TABLE public.formalizacao 
ADD COLUMN data_retorno_diligencia_temp DATE DEFAULT NULL;

UPDATE public.formalizacao 
SET data_retorno_diligencia_temp = CASE 
    WHEN data_retorno_diligencia = '' OR data_retorno_diligencia IS NULL THEN NULL
    ELSE TO_DATE(data_retorno_diligencia, 'DD/MM/YYYY')
END;

ALTER TABLE public.formalizacao DROP COLUMN data_retorno_diligencia;
ALTER TABLE public.formalizacao RENAME COLUMN data_retorno_diligencia_temp TO data_retorno_diligencia;

---

ALTER TABLE public.formalizacao 
ADD COLUMN data_recebimento_demanda_temp DATE DEFAULT NULL;

UPDATE public.formalizacao 
SET data_recebimento_demanda_temp = CASE 
    WHEN data_recebimento_demanda = '' OR data_recebimento_demanda IS NULL THEN NULL
    ELSE TO_DATE(data_recebimento_demanda, 'DD/MM/YYYY')
END;

ALTER TABLE public.formalizacao DROP COLUMN data_recebimento_demanda;
ALTER TABLE public.formalizacao RENAME COLUMN data_recebimento_demanda_temp TO data_recebimento_demanda;

---

ALTER TABLE public.formalizacao 
ADD COLUMN data_retorno_temp DATE DEFAULT NULL;

UPDATE public.formalizacao 
SET data_retorno_temp = CASE 
    WHEN data_retorno = '' OR data_retorno IS NULL THEN NULL
    ELSE TO_DATE(data_retorno, 'DD/MM/YYYY')
END;

ALTER TABLE public.formalizacao DROP COLUMN data_retorno;
ALTER TABLE public.formalizacao RENAME COLUMN data_retorno_temp TO data_retorno;

---

ALTER TABLE public.formalizacao 
ADD COLUMN data_liberacao_assinatura_conferencista_temp DATE DEFAULT NULL;

UPDATE public.formalizacao 
SET data_liberacao_assinatura_conferencista_temp = CASE 
    WHEN data_liberacao_assinatura_conferencista = '' OR data_liberacao_assinatura_conferencista IS NULL THEN NULL
    ELSE TO_DATE(data_liberacao_assinatura_conferencista, 'DD/MM/YYYY')
END;

ALTER TABLE public.formalizacao DROP COLUMN data_liberacao_assinatura_conferencista;
ALTER TABLE public.formalizacao RENAME COLUMN data_liberacao_assinatura_conferencista_temp TO data_liberacao_assinatura_conferencista;

---

ALTER TABLE public.formalizacao 
ADD COLUMN data_liberacao_assinatura_temp DATE DEFAULT NULL;

UPDATE public.formalizacao 
SET data_liberacao_assinatura_temp = CASE 
    WHEN data_liberacao_assinatura = '' OR data_liberacao_assinatura IS NULL THEN NULL
    ELSE TO_DATE(data_liberacao_assinatura, 'DD/MM/YYYY')
END;

ALTER TABLE public.formalizacao DROP COLUMN data_liberacao_assinatura;
ALTER TABLE public.formalizacao RENAME COLUMN data_liberacao_assinatura_temp TO data_liberacao_assinatura;

---

ALTER TABLE public.formalizacao 
ADD COLUMN encaminhado_em_temp DATE DEFAULT NULL;

UPDATE public.formalizacao 
SET encaminhado_em_temp = CASE 
    WHEN encaminhado_em = '' OR encaminhado_em IS NULL THEN NULL
    ELSE TO_DATE(encaminhado_em, 'DD/MM/YYYY')
END;

ALTER TABLE public.formalizacao DROP COLUMN encaminhado_em;
ALTER TABLE public.formalizacao RENAME COLUMN encaminhado_em_temp TO encaminhado_em;

---

ALTER TABLE public.formalizacao 
ADD COLUMN concluida_em_temp DATE DEFAULT NULL;

UPDATE public.formalizacao 
SET concluida_em_temp = CASE 
    WHEN concluida_em = '' OR concluida_em IS NULL THEN NULL
    ELSE TO_DATE(concluida_em, 'DD/MM/YYYY')
END;

ALTER TABLE public.formalizacao DROP COLUMN concluida_em;
ALTER TABLE public.formalizacao RENAME COLUMN concluida_em_temp TO concluida_em;

-- ✅ Todas as datas convertidas com sucesso!
*/
